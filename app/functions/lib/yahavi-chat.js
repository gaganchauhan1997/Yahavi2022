// Yahavi AI v2 (free tier) — Cloudflare Pages Function handler.
//
// Stack:
//   - Google AI Studio Gemini 2.5 Flash/Pro via API key (NO GCP billing required)
//   - Grounding via WooCommerce Store API + hackknow REST endpoints + WP search
//
// Activation: requires CF Pages secret `GEMINI_API_KEY` (paste the AI Studio key).
// If absent, exports a sentinel so the middleware falls back to the WP /chat route.

import { buildSystemPrompt } from './yahavi-prompt.js';

const WP_HOST = 'https://shop.hackknow.com';

// ---------- Smart routing (Flash vs Pro) ----------
// AI Studio free tier: Flash = 1500 RPD, 1M tokens/day; Pro = 50 RPD, 50k tokens/day.
// Keep Pro reserved for genuinely-reasoning queries.
function pickModel(message, history) {
  const msg   = (message || '');
  const wc    = msg.trim().split(/\s+/).length;
  const turns = (history || []).length;
  const reasoning = /\b(compare|difference|vs\.?|versus|why|recommend|which is better|which one|tradeoff|pros and cons|kaunsa behtar)\b/i.test(msg);
  if ((reasoning && wc >= 25) || wc >= 80 || turns >= 16) return 'gemini-2.5-pro';
  return 'gemini-2.5-flash';
}

// ---------- Grounding: parallel fan-out to WC + hackknow + WP search ----------

async function fetchJson(url, timeoutMs = 8000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { 'accept':'application/json' }, cf: { cacheTtl: 60, cacheEverything: true } });
    if (!r.ok) return null;
    return await r.json();
  } catch (_) { return null; }
  finally { clearTimeout(t); }
}

function stripHtml(s) {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

async function searchKnowledgeBase(query) {
  // Fan out 4 sources in parallel; combine + dedupe by id.
  const q = encodeURIComponent(query.slice(0, 120));
  const [products, pages, courses, roadmaps] = await Promise.all([
    fetchJson(`${WP_HOST}/wp-json/wc/store/v1/products?search=${q}&per_page=6`),
    fetchJson(`${WP_HOST}/wp-json/wp/v2/search?search=${q}&per_page=6&subtype=page,post`),
    fetchJson(`${WP_HOST}/wp-json/hackknow/v1/courses`),
    fetchJson(`${WP_HOST}/wp-json/hackknow/v1/roadmaps`),
  ]);

  const docs = [];

  // (1) WooCommerce products → kind=product
  if (Array.isArray(products)) {
    for (const p of products.slice(0, 6)) {
      docs.push({
        id: `prod-${p.id}`,
        title: p.name || '',
        snippet: stripHtml(p.short_description || p.description).slice(0, 400),
        kind: 'product',
        wp_id: p.id,
        slug: p.slug,
        permalink: p.permalink,
        price: p.prices?.price ? String(Number(p.prices.price) / Math.pow(10, p.prices.currency_minor_unit || 0)) : '0',
        currency: p.prices?.currency_code || 'INR',
        categories: (p.categories || []).map(c => c.name),
      });
    }
  }

  // (2) WP REST search → kind=page (subtype derived)
  if (Array.isArray(pages)) {
    for (const r of pages.slice(0, 6)) {
      docs.push({
        id: `pg-${r.id}`,
        title: stripHtml(r.title || ''),
        snippet: '',
        kind: r.subtype === 'product' ? 'product' : 'page',
        permalink: r.url,
      });
    }
  }

  // (3) Courses — keyword filter (endpoint doesn't accept search)
  if (Array.isArray(courses)) {
    const ql = query.toLowerCase();
    const hits = courses.filter(c => (c.title + ' ' + (c.excerpt || '')).toLowerCase().includes(ql)).slice(0, 4);
    for (const c of hits) {
      docs.push({
        id: `course-${c.id}`,
        title: c.title,
        snippet: stripHtml(c.excerpt || c.content).slice(0, 300),
        kind: 'course',
        slug: c.slug,
        permalink: `${WP_HOST}/courses/${c.slug}`,
      });
    }
  }

  // (4) Roadmaps — same keyword filter
  if (Array.isArray(roadmaps)) {
    const ql = query.toLowerCase();
    const hits = roadmaps.filter(r => (r.title + ' ' + (r.excerpt || '')).toLowerCase().includes(ql)).slice(0, 4);
    for (const r of hits) {
      docs.push({
        id: `roadmap-${r.id}`,
        title: r.title,
        snippet: stripHtml(r.excerpt || '').slice(0, 300),
        kind: 'roadmap',
        slug: r.slug,
        permalink: `${WP_HOST}/roadmaps/${r.slug}`,
      });
    }
  }

  // Dedupe by id; cap at 12 to keep prompt small.
  const seen = new Set();
  return docs.filter(d => { if (seen.has(d.id)) return false; seen.add(d.id); return true; }).slice(0, 12);
}

// ---------- Gemini call (Google AI Studio API) ----------

async function callGemini({ systemPrompt, history, userMessage, model, apiKey }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const contents = [];
  for (const m of (history || []).slice(-10)) {
    contents.push({
      role: m.role === 'bot' ? 'model' : 'user',
      parts: [{ text: String(m.text || m.message || '').slice(0, 4000) }],
    });
  }
  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 1024, topP: 0.95 },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`gemini_failed:${r.status}:${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  const txt = j.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  return { text: txt.trim(), usage: j.usageMetadata || {} };
}

// ---------- Response shapers ----------

function buildSuggestions(docs) {
  return docs.filter(d => d.kind !== 'product' && d.permalink).slice(0, 4).map(d => ({
    label: (d.title || d.id).slice(0, 36),
    href: pathFromPermalink(d.permalink) || '/',
  }));
}

function buildProducts(docs) {
  return docs.filter(d => d.kind === 'product' && d.wp_id).slice(0, 3).map(d => ({
    id: Number(d.wp_id) || 0,
    name: d.title,
    price: d.currency === 'INR' || !d.currency ? `₹${d.price}` : `${d.currency} ${d.price}`,
    href: pathFromPermalink(d.permalink) || `/shop/product/${d.slug || ''}`,
  }));
}

function pathFromPermalink(url) {
  try { return new URL(url).pathname; } catch { return null; }
}

// ---------- Public handler (called from _middleware.js) ----------

export async function handleYahaviChat(request, env) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    const e = new Error('not_configured');
    e.code = 'NOT_CONFIGURED';
    throw e;
  }
  let body;
  try { body = await request.json(); }
  catch { return jsonResponse(400, { error: 'invalid_json' }); }

  const message    = String(body.message || '').trim();
  const history    = Array.isArray(body.history) ? body.history : [];
  const sessionId  = String(body.session_id || '');
  if (!message) return jsonResponse(400, { error: 'message_required' });

  const userLocale = request.headers.get('accept-language') || '';

  try {
    const groundingDocs = await searchKnowledgeBase(message);
    const systemPrompt  = buildSystemPrompt({ groundingDocs, userLocale });
    const model         = pickModel(message, history);
    const { text, usage } = await callGemini({
      systemPrompt, history, userMessage: message, model, apiKey,
    });

    return jsonResponse(200, {
      reply: text,
      suggestions: buildSuggestions(groundingDocs),
      products: buildProducts(groundingDocs),
      grounding: groundingDocs.map(d => ({ id: d.id, title: d.title })),
      model_used: model,
      tokens_in: usage.promptTokenCount || 0,
      tokens_out: usage.candidatesTokenCount || 0,
      session_id: sessionId,
      v: 2,
    });
  } catch (err) {
    console.error('yahavi_chat_err', err && err.message);
    const e = new Error(String(err && err.message || err));
    e.code = 'AI_FAILED';
    throw e;
  }
}

function jsonResponse(status, obj) {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
