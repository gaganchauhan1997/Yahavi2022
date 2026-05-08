// Yahavi AI v2 — Cloudflare Pages Function handler.
// RAG via Vertex AI Search (Discovery Engine) + Gemini 2.5 Flash via Vertex AI.
//
// Activation: requires CF Pages secret GCP_SA_JSON (paste full SA JSON string).
// If absent or malformed, exports a sentinel so the middleware falls back to WP.

import { buildSystemPrompt } from './yahavi-prompt.js';

const PROJECT     = 'hackknow-ai';
const REGION      = 'asia-south1';
const ENGINE_PATH = `projects/${PROJECT}/locations/global/collections/default_collection/engines/hackknow-engine`;
const MODEL       = 'gemini-2.5-flash';

// ---------- GCP OAuth: SA-JSON → access token (RS256 JWT, SubtleCrypto) ----------

let _tokenCache = null; // { token, expiresAt }

function b64urlEncode(buf) {
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function pemToBinary(pem) {
  // Strip "-----BEGIN/END PRIVATE KEY-----" + newlines, then base64-decode.
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

async function getAccessToken(saJsonStr) {
  const now = Math.floor(Date.now() / 1000);
  if (_tokenCache && _tokenCache.expiresAt > now + 60) return _tokenCache.token;

  const sa = JSON.parse(saJsonStr);
  const header  = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss:   sa.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  };
  const enc = new TextEncoder();
  const headerB64  = b64urlEncode(enc.encode(JSON.stringify(header)));
  const payloadB64 = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBinary(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );
  const sigBuf = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(signingInput));
  const jwt = `${signingInput}.${b64urlEncode(sigBuf)}`;

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });
  if (!r.ok) throw new Error(`oauth_token_failed:${r.status}:${await r.text()}`);
  const j = await r.json();
  _tokenCache = { token: j.access_token, expiresAt: now + (j.expires_in || 3600) };
  return _tokenCache.token;
}

// ---------- Vertex AI Search ----------

async function searchKnowledgeBase(query, accessToken) {
  const url = `https://discoveryengine.googleapis.com/v1/${ENGINE_PATH}/servingConfigs/default_search:search`;
  const body = {
    query: query.slice(0, 500),
    pageSize: 5,
    contentSearchSpec: { snippetSpec: { returnSnippet: true } },
  };
  const r = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`search_failed:${r.status}:${await r.text()}`);
  const j = await r.json();
  const docs = (j.results || []).map((res) => {
    const d  = res.document || {};
    const sd = d.structData || {};
    const snip = (res.document?.derivedStructData?.snippets?.[0]?.snippet
               || res.document?.derivedStructData?.snippets?.[0]?.snippet_text
               || '').slice(0, 600);
    return {
      id: d.id,
      kind: sd.kind,
      title: sd.name || sd.title || d.id,
      slug: sd.slug,
      permalink: sd.permalink,
      price: sd.price,
      currency: sd.currency,
      categories: sd.categories || [],
      wp_id: sd.wp_id,
      snippet: snip,
    };
  });
  return docs;
}

// ---------- Smart routing (Flash vs Pro) ----------

function pickModel(message, history) {
  // Heuristic: Pro for longer/complex/multi-turn queries; Flash for short ones.
  // (Pro costs ~5x but handles reasoning much better.)
  const wc = (message || '').trim().split(/\s+/).length;
  const turns = (history || []).length;
  const complex = /compare|difference|why|kaise|kyun|kyon|explain|recommend|which is better|which one/i.test(message || '');
  if (wc >= 30 || turns >= 8 || complex) return 'gemini-2.5-pro';
  return 'gemini-2.5-flash';
}

// ---------- Gemini call ----------

async function callGemini({ systemPrompt, history, userMessage, model, accessToken }) {
  const url = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${REGION}/publishers/google/models/${model}:generateContent`;
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
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
      topP: 0.95,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };
  const r = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`gemini_failed:${r.status}:${await r.text()}`);
  const j = await r.json();
  const txt = j.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  return { text: txt.trim(), usage: j.usageMetadata || {} };
}

// ---------- Response shaper: align with existing WP /chat shape ----------

function buildSuggestions(docs) {
  // Up to 4 quick chips from non-product docs (pages, courses, roadmaps).
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
  const saJson = env.GCP_SA_JSON;
  if (!saJson) {
    // Sentinel: not configured — caller should fall back to WP path.
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
    const accessToken = await getAccessToken(saJson);
    const groundingDocs = await searchKnowledgeBase(message, accessToken);
    const systemPrompt  = buildSystemPrompt({ groundingDocs, userLocale });
    const model         = pickModel(message, history);
    const { text, usage } = await callGemini({
      systemPrompt, history, userMessage: message, model, accessToken,
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
    // Hard failure → tell middleware to fall back so user always gets a reply.
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
