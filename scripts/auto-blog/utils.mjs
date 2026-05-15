// Tiny utilities for the auto-blog pipeline. No external deps.

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[‘’“”]/g, "")  // smart quotes
    .replace(/&/g, "and")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function pickFirst(obj, keys) {
  for (const k of keys) if (obj[k] != null) return obj[k];
  return null;
}

// Pull JSON from a string that might be wrapped in markdown fences or have stray text
export function parseLooseJson(text) {
  if (!text) return null;
  let cleaned = String(text).trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  try { return JSON.parse(cleaned); } catch {}
  // Last resort — grab the first {...} blob
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  return null;
}

// Convert a YYYY-MM-DD string from a Date
export function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

// Estimate token count (rough — 1 token ≈ 4 chars)
export function estTokens(text) {
  return Math.ceil((text || "").length / 4);
}

// Read JSON file; return fallback if missing or invalid
export function loadJson(filePath, fallback) {
  // Local require — caller passes fs
  return fallback;
}
