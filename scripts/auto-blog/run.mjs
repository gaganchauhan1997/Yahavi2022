#!/usr/bin/env node
// Auto-blog runner. Designed for GitHub Actions cron (and local dev).
//
//   - Reads 10 Groq API keys from GROQ_API_KEY_1 ... GROQ_API_KEY_10
//   - Picks up to N pending keywords from content/blog-queue.json
//   - Writes one blog per available (non-cooling-down) key, in parallel
//   - Saves each as app/src/content/blog/<slug>.md
//   - Skips keywords already in state.done (dedup)
//   - Marks rate-limited keys to cool down for the retry-after window
//   - Persists state to content/blog-state.json
//
// Exit codes:
//   0 — success or graceful no-op (nothing to do)
//   1 — fatal config error (no keys, missing files)
//
// Run locally:  node scripts/auto-blog/run.mjs
// Run in CI:    add to a workflow with GROQ_API_KEY_1..10 secrets

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { slugify, parseLooseJson } from "./utils.mjs";
import { BLOG_SYSTEM_PROMPT, buildUserPrompt, buildMarkdown } from "./template.mjs";
import { callGroq } from "./groq.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const QUEUE_FILE = path.join(REPO_ROOT, "content", "blog-queue.json");
const STATE_FILE = path.join(REPO_ROOT, "content", "blog-state.json");
const BLOG_DIR = path.join(REPO_ROOT, "app", "src", "content", "blog");

const MAX_PER_RUN = parseInt(process.env.BLOG_MAX_PER_RUN || "10", 10);
const COOLDOWN_FALLBACK_SEC = 60 * 60; // 1h default cooldown when 429 has no retry-after
const COOLDOWN_NETWORK_SEC = 5 * 60;  // 5m cooldown for network errors

function log(msg, level = "info") {
  const prefix = level === "error" ? "✗" : level === "warn" ? "⚠" : "·";
  console.log(`${prefix} ${msg}`);
}

function loadJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    return fallback;
  }
}

function saveJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

// ── Pull GROQ_API_KEY_1 ... _10 from env (any missing/empty are skipped) ──
function loadKeys() {
  const keys = [];
  for (let i = 1; i <= 12; i++) {  // tolerate up to 12 just in case
    const k = (process.env[`GROQ_API_KEY_${i}`] || "").trim();
    if (k) keys.push({ index: i, key: k });
  }
  // Also accept a single GROQ_API_KEY as fallback for local dev
  const single = (process.env.GROQ_API_KEY || "").trim();
  if (!keys.length && single) keys.push({ index: 0, key: single });
  return keys;
}

async function writeOne(keyword, keyEntry) {
  log(`[key ${keyEntry.index}] writing blog: ${keyword}`);
  const userPrompt = buildUserPrompt(keyword);
  const { json: meta, tokens } = await callGroq(keyEntry.key, BLOG_SYSTEM_PROMPT, userPrompt);

  // Ensure slug — generate if AI didn't return one
  if (!meta.slug || typeof meta.slug !== "string") {
    meta.slug = slugify(meta.title || keyword);
  } else {
    meta.slug = slugify(meta.slug);
  }
  if (!meta.title) meta.title = keyword;

  // Force the CTA URL onto a known shape
  if (!meta.cta_url || !/^https?:\/\//.test(meta.cta_url)) {
    meta.cta_url = `https://hackknow.com/shop?category=${meta.cta_product_category || ""}`;
  }

  return { meta, tokens };
}

async function main() {
  // 0. Sanity: keys + queue + dirs
  const keys = loadKeys();
  if (!keys.length) {
    log("No GROQ_API_KEY_* env vars set. Add at least one in GitHub Secrets.", "error");
    process.exit(1);
  }
  log(`Found ${keys.length} Groq key(s)`);

  if (!fs.existsSync(QUEUE_FILE)) {
    log(`No queue file at ${QUEUE_FILE}. Creating empty.`, "warn");
    saveJson(QUEUE_FILE, { keywords: [], notes: "Add keywords to .keywords as strings, then commit." });
  }
  ensureDir(BLOG_DIR);

  const queue = loadJson(QUEUE_FILE, { keywords: [] });
  const state = loadJson(STATE_FILE, { done: [], cooldown: {}, last_run: null, runs: 0 });

  // 1. Filter out already-done keywords (by slug — case + punctuation insensitive)
  const doneSet = new Set(state.done.map(slugify));
  const pending = (queue.keywords || [])
    .map((k) => String(k).trim())
    .filter(Boolean)
    .filter((k) => !doneSet.has(slugify(k)));

  if (!pending.length) {
    log("Queue is empty (or all keywords already written). Nothing to do.", "warn");
    state.last_run = new Date().toISOString();
    state.runs = (state.runs || 0) + 1;
    saveJson(STATE_FILE, state);
    return;
  }

  // 2. Filter out keys that are in cooldown
  const now = Date.now();
  const availableKeys = keys.filter((k) => {
    const cool = state.cooldown[k.index] || 0;
    return cool < now;
  });
  const cooldownCount = keys.length - availableKeys.length;
  if (cooldownCount > 0) log(`${cooldownCount} key(s) cooling down`, "warn");

  if (!availableKeys.length) {
    log("All keys cooling down. Skipping this run.", "warn");
    return;
  }

  // 3. Decide how many blogs to write this run
  const N = Math.min(MAX_PER_RUN, availableKeys.length, pending.length);
  const toWrite = pending.slice(0, N);
  log(`Writing ${N} blog(s) this run`);

  // 4. Run in parallel with allSettled — one key per keyword
  const results = await Promise.allSettled(
    toWrite.map((kw, i) => writeOne(kw, availableKeys[i]))
  );

  // 5. Persist outputs + update state
  let successCount = 0;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const kw = toWrite[i];
    const slug = slugify(kw);
    const keyEntry = availableKeys[i];

    if (r.status === "fulfilled") {
      const { meta } = r.value;
      const finalSlug = slugify(meta.slug || kw);
      const outPath = path.join(BLOG_DIR, `${finalSlug}.md`);

      // Belt-and-suspenders dedup — even if state was wrong, don't overwrite an existing file
      if (fs.existsSync(outPath)) {
        log(`[skip] ${finalSlug}.md already exists on disk`, "warn");
        if (!state.done.includes(finalSlug)) state.done.push(finalSlug);
      } else {
        const md = buildMarkdown(meta);
        fs.writeFileSync(outPath, md);
        successCount++;
        log(`[✓] wrote ${finalSlug}.md (${meta.word_count || "?"} words)`);
        if (!state.done.includes(finalSlug)) state.done.push(finalSlug);
        // Also mark the original keyword as done in case slug diverges
        if (!state.done.includes(slug)) state.done.push(slug);
      }
    } else {
      const err = r.reason || {};
      if (err.code === 429) {
        const cooldownSec = err.retryAfterSec || COOLDOWN_FALLBACK_SEC;
        state.cooldown[keyEntry.index] = now + cooldownSec * 1000;
        log(`[key ${keyEntry.index}] rate-limited — cooling down ${cooldownSec}s. (keyword "${kw}" stays in queue)`, "warn");
      } else if (err.code === "network" || err.code === "parse") {
        // Temporary failure — short cooldown, keyword stays in queue
        state.cooldown[keyEntry.index] = now + COOLDOWN_NETWORK_SEC * 1000;
        log(`[key ${keyEntry.index}] ${err.code}: ${err.message} — short cooldown, will retry`, "warn");
      } else {
        log(`[key ${keyEntry.index}] non-retryable error for "${kw}": ${err.message || err}`, "error");
        // Mark keyword as done (with .failed slug) so we don't loop on it forever
        state.done.push(`__failed__${slug}`);
      }
    }
  }

  // 6. Save state
  state.last_run = new Date().toISOString();
  state.runs = (state.runs || 0) + 1;
  state.last_success_count = successCount;
  saveJson(STATE_FILE, state);

  log(`Run complete: ${successCount}/${N} blog(s) written. Total done so far: ${state.done.length}`);
}

main().catch((e) => {
  log(`FATAL: ${e.message || e}`, "error");
  console.error(e);
  process.exit(1);
});
