// Yahavi AI v2 — Cloudflare Pages Function handler.
// Stack:
//   - Primary LLM: Cloudflare Workers AI (Llama 3.3 70B / Llama 3.1 8B), free tier,
//     no Google account. Activated by binding `AI` in CF Pages dashboard.
//   - Optional fallback LLM: Google AI Studio Gemini via GEMINI_API_KEY (kept for
//     future flexibility; not required).
//   - Grounding: 4 parallel sources — WC Store /products, WP REST /search,
//     hackknow /courses, hackknow /roadmaps. Edge cached 60s.

import { buildSystemPrompt } from './yahavi-prompt.js';

const WP_HOST = 'https://shop.hackknow.com';

// ---------- Smart routing (model selection) ----------
function pickModel(_message, _history) {
  // Always use Llama 3.3 70B fp8-fast as the primary brain. The 70B model is
  // dramatically better at instruction-following — critical now that Yahavi
  // can chain multiple action markers (NAV + ADD_TO_CART + OPEN_CART + FILTER)
  // in a single reply and execute them as a sequenced user journey. The 8B
  // model frequently dropped or reordered markers; the 70B does not.
  // Free tier (10k neurons/day) handles HackKnow current traffic comfortably.
  // The 8B model is retained as an in-callLLM retry path if 70B errors.
  return 'cf:llama-70b';
}

const MODEL_MAP = {
  'cf:llama-70b': '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  'cf:llama-8b':  '@cf/meta/llama-3.1-8b-instruct',
  // Gemini IDs kept for fallback path
  'gemini-2.5-flash': 'gemini-2.5-flash',
  'gemini-2.5-pro':   'gemini-2.5-pro',
};

// ---------- Grounding fan-out ----------

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

// Hinglish/Hindi → English keyword normaliser. Lets us search the WC/WP indexes
// using sensible terms even when the user types "मुझे excel सीखना है" or
// "python course chahiye sasta wala". Cheap, no LLM call.
const HINGLISH_MAP = {
  'sikhna':'learn','seekhna':'learn','seekh':'learn','sikh':'learn',
  'chahiye':'need','chahie':'need','chaahiye':'need',
  'sasta':'cheap','sastu':'cheap','sasti':'cheap',
  'mahanga':'expensive','mehnga':'expensive','mahangi':'expensive',
  'kaunsa':'which','kaunsi':'which','konsa':'which','konsi':'which',
  'behtar':'best','accha':'good','acha':'good','sabse':'best',
  'discount':'discount','offer':'offer','deal':'deal',
  'pdf':'pdf','dawnload':'download','download':'download',
  'free':'free','muft':'free','mufat':'free','paisa':'price','daam':'price',
  'kitne':'price','kitna':'price','kimat':'price','keemat':'price',
};
const DEVANAGARI_KEYWORDS = {
  'एक्सेल':'excel','पायथन':'python','कोर्स':'course','टेम्पलेट':'template',
  'सीखना':'learn','सीखें':'learn','मुझे':'i','चाहिए':'need','सस्ता':'cheap',
  'पावरपॉइंट':'powerpoint','डाउनलोड':'download','फ्री':'free','कीमत':'price',
};
function extractSearchTerms(query) {
  const terms = new Set();
  // Direct Latin words from query (e.g. "excel", "python")
  for (const w of (query.match(/[a-zA-Z]{3,}/g) || [])) terms.add(w.toLowerCase());
  // Hinglish translit
  for (const w of (query.toLowerCase().match(/[a-z]+/g) || [])) {
    if (HINGLISH_MAP[w]) terms.add(HINGLISH_MAP[w]);
  }
  // Devanagari → English
  for (const [hi, en] of Object.entries(DEVANAGARI_KEYWORDS)) {
    if (query.includes(hi)) terms.add(en);
  }
  return Array.from(terms).filter(t => !['the','and','for','with','this','that','need','i','a','to','me','my','of','is','it','in','on','at','do','can','you'].includes(t));
}

async function searchKnowledgeBase(query) {
  // Build a primary search query: extracted English/normalised terms, falling back
  // to the raw user query so single-keyword English queries still work as before.
  const terms = extractSearchTerms(query);
  const searchQ = terms.length ? terms.slice(0, 5).join(' ') : query;
  const q = encodeURIComponent(searchQ.slice(0, 120));
  const qRaw = encodeURIComponent(query.slice(0, 120));

  const [products, productsAll, pages, courses, roadmaps] = await Promise.all([
    fetchJson(`${WP_HOST}/wp-json/wc/store/v1/products?search=${q}&per_page=6`),
    // Bestsellers fallback when search yields nothing — gives the model a baseline catalog.
    fetchJson(`${WP_HOST}/wp-json/wc/store/v1/products?orderby=popularity&per_page=4`),
    fetchJson(`${WP_HOST}/wp-json/wp/v2/search?search=${q}&per_page=6&subtype=page,post`),
    fetchJson(`${WP_HOST}/wp-json/hackknow/v1/courses`),
    fetchJson(`${WP_HOST}/wp-json/hackknow/v1/roadmaps`),
  ]);

  const docs = [];
  const pushProduct = (p) => {
    docs.push({
      id: `prod-${p.id}`,
      title: p.name || '',
      snippet: stripHtml(p.short_description || p.description).slice(0, 400),
      kind: 'product',
      wp_id: p.id, slug: p.slug, permalink: p.permalink,
      price: p.prices?.price ? String(Number(p.prices.price) / Math.pow(10, p.prices.currency_minor_unit || 0)) : '0',
      currency: p.prices?.currency_code || 'INR',
      categories: (p.categories || []).map(c => c.name),
    });
  };
  if (Array.isArray(products)) for (const p of products.slice(0, 6)) pushProduct(p);
  // Always include bestsellers as anti-hallucination baseline (model has REAL items
  // to cite even on browse-style queries like "compare your courses").
  if (Array.isArray(productsAll)) for (const p of productsAll.slice(0, 4)) pushProduct(p);

  if (Array.isArray(pages)) {
    for (const r of pages.slice(0, 6)) {
      docs.push({
        id: `pg-${r.id}`, title: stripHtml(r.title || ''), snippet: '',
        kind: r.subtype === 'product' ? 'product' : 'page', permalink: r.url,
      });
    }
  }

  // Course/roadmap match: use extracted terms (English keywords) for matching,
  // then ALWAYS include up to 4 baseline courses + 4 roadmaps regardless. This
  // ensures every reply has real catalog items to cite, eliminating hallucinations
  // like "Python for Beginners ₹499" that don't exist in our shop.
  const matchTerms = terms.length ? terms : [query.toLowerCase()];
  const matchScore = (text) => {
    const t = String(text || '').toLowerCase();
    return matchTerms.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
  };

  if (Array.isArray(courses)) {
    const scored = courses.map(c => ({ c, s: matchScore(c.title + ' ' + (c.excerpt || '')) }))
      .sort((a, b) => b.s - a.s);
    const picked = new Set();
    for (const { c } of scored.filter(x => x.s > 0).slice(0, 4)) {
      picked.add(c.id);
      docs.push({
        id: `course-${c.id}`, title: c.title,
        snippet: stripHtml(c.excerpt || c.content).slice(0, 300),
        kind: 'course', slug: c.slug, permalink: `${WP_HOST}/courses/${c.slug}`,
      });
    }
    // Baseline: top 4 courses (regardless of match) so model always has real refs.
    for (const c of courses.slice(0, 4)) {
      if (picked.has(c.id)) continue;
      docs.push({
        id: `course-${c.id}`, title: c.title,
        snippet: stripHtml(c.excerpt || c.content).slice(0, 300),
        kind: 'course', slug: c.slug, permalink: `${WP_HOST}/courses/${c.slug}`,
      });
    }
  }
  if (Array.isArray(roadmaps)) {
    const scored = roadmaps.map(r => ({ r, s: matchScore(r.title + ' ' + (r.excerpt || '')) }))
      .sort((a, b) => b.s - a.s);
    const picked = new Set();
    for (const { r } of scored.filter(x => x.s > 0).slice(0, 3)) {
      picked.add(r.id);
      docs.push({
        id: `roadmap-${r.id}`, title: r.title,
        snippet: stripHtml(r.excerpt || '').slice(0, 300),
        kind: 'roadmap', slug: r.slug, permalink: `${WP_HOST}/roadmaps/${r.slug}`,
      });
    }
    for (const r of roadmaps.slice(0, 3)) {
      if (picked.has(r.id)) continue;
      docs.push({
        id: `roadmap-${r.id}`, title: r.title,
        snippet: stripHtml(r.excerpt || '').slice(0, 300),
        kind: 'roadmap', slug: r.slug, permalink: `${WP_HOST}/roadmaps/${r.slug}`,
      });
    }
  }

  const seen = new Set();
  return docs.filter(d => { if (seen.has(d.id)) return false; seen.add(d.id); return true; }).slice(0, 18);
}

// ---------- LLM call: Workers AI primary, Gemini fallback ----------

async function callLLM({ systemPrompt, history, userMessage, modelKey, env }) {
  const messages = [{ role: 'system', content: systemPrompt }];
  for (const m of (history || []).slice(-10)) {
    messages.push({
      role: m.role === 'bot' ? 'assistant' : 'user',
      content: String(m.text || m.message || '').slice(0, 4000),
    });
  }
  // Belt-and-suspenders: when the user wrote in a non-Latin script (Devanagari,
  // Tamil, Telugu, Bengali, Gujarati, Arabic), append an explicit translate-then-
  // reply directive at the user-message level. Smaller models (Llama 8B) sometimes
  // ignore the system-prompt language rule when the in-context user message is in
  // another script — this in-message reminder fixes that without hurting English UX.
  const userIsNonLatin = /[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0600-\u06FF]/.test(userMessage);
  const finalUserMessage = userIsNonLatin
    ? `${userMessage}\n\n[SYSTEM REMINDER: The user wrote the above in a non-English script. Understand their intent, then reply in clear English (Latin alphabet) only. Do NOT echo any non-Latin characters.]`
    : userMessage;
  messages.push({ role: 'user', content: finalUserMessage });

  // ---- PATH 1: Cloudflare Workers AI (preferred — free, no Google) ----
  if (env.AI && modelKey.startsWith('cf:')) {
    const tryModel = async (key) => {
      const cfModel = MODEL_MAP[key];
      const r = await env.AI.run(cfModel, { messages, max_tokens: 1024, temperature: 0.7 });
      const text = (r && (r.response || r.result?.response || r.output_text)) || '';
      return { text: String(text).trim(), usage: { promptTokenCount: 0, candidatesTokenCount: 0 } };
    };
    try {
      return await tryModel(modelKey);
    } catch (err) {
      // 70B can hit transient capacity errors on free tier; retry on 8B once.
      console.warn('workers_ai_primary_failed:', err && err.message);
      if (modelKey !== 'cf:llama-8b') {
        try { return await tryModel('cf:llama-8b'); }
        catch (err2) { console.warn('workers_ai_secondary_failed:', err2 && err2.message); }
      }
      // Final fallback: Gemini (if configured).
      if (!env.GEMINI_API_KEY) throw new Error(`workers_ai_failed:${err.message || err}`);
    }
  }

  // ---- PATH 2: Google AI Studio Gemini (fallback) ----
  if (env.GEMINI_API_KEY) {
    const geminiModel = modelKey.startsWith('cf:') ? 'gemini-2.5-flash' : MODEL_MAP[modelKey];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`;
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
      headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`gemini_failed:${r.status}:${(await r.text()).slice(0, 300)}`);
    const j = await r.json();
    const txt = j.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    return { text: txt.trim(), usage: j.usageMetadata || {} };
  }

  throw new Error('no_llm_configured');
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

// Strip any [[ADD_TO_CART:<id>]] whose id is not one of the real wp_ids in
// the grounding docs we just supplied to the model. This is a hard guard
// against Llama parroting placeholder ids from the prompt example
// (e.g. "1234") or hallucinating fake ones.
function sanitiseActionMarkers(text, groundingDocs) {
  const validIds = new Set(
    (groundingDocs || [])
      .filter(d => d && d.kind === 'product' && d.wp_id)
      .map(d => String(d.wp_id))
  );
  return String(text || '').replace(/\[\[\s*ADD_TO_CART\s*:\s*([^\]]+?)\s*\]\]/gi, (full, idArg) => {
    const id = String(idArg).trim();
    if (validIds.has(id)) return full; // keep as-is
    return ''; // drop fake/unknown id
  });
}

// ---------- Public handler ----------

export async function handleYahaviChat(request, env) {
  // At least one LLM provider must be configured.
  if (!env.AI && !env.GEMINI_API_KEY) {
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
    const modelKey      = env.AI ? pickModel(message, history) : 'gemini-2.5-flash';
    const { text, usage } = await callLLM({
      systemPrompt, history, userMessage: message, modelKey, env,
    });

    const safeText = sanitiseActionMarkers(text, groundingDocs);
    return jsonResponse(200, {
      reply: safeText,
      suggestions: buildSuggestions(groundingDocs),
      products: buildProducts(groundingDocs),
      grounding: groundingDocs.map(d => ({ id: d.id, title: d.title })),
      model_used: MODEL_MAP[modelKey] || modelKey,
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
