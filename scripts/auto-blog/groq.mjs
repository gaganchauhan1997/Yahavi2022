// Thin Groq client. Returns parsed JSON or throws { code: 429, retryAfterSec } / { code: 'other', message }.

import { parseLooseJson, estTokens } from "./utils.mjs";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

/**
 * Call Groq with one system + one user message. Forces JSON object response.
 * @param {string} apiKey
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @returns {Promise<{ ok: true, json: object, tokens: number }>}
 * @throws {{ code: 429 | number | 'network', message: string, retryAfterSec?: number }}
 */
export async function callGroq(apiKey, systemPrompt, userPrompt) {
  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 4096,
    temperature: 0.75,  // high enough for human variation
    top_p: 0.95,
    response_format: { type: "json_object" },
  };

  let resp;
  try {
    resp = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw { code: "network", message: e.message };
  }

  if (resp.status === 429) {
    // Parse retry-after header (seconds or HTTP-date)
    const retryAfter = resp.headers.get("retry-after");
    let retryAfterSec = 60 * 60; // default 1h
    if (retryAfter) {
      const n = parseInt(retryAfter, 10);
      if (!isNaN(n) && n > 0 && n < 86400) retryAfterSec = n;
    }
    const text = await resp.text().catch(() => "");
    throw { code: 429, message: `rate-limited (retry in ${retryAfterSec}s)`, retryAfterSec, raw: text.slice(0, 200) };
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw { code: resp.status, message: `Groq ${resp.status}: ${text.slice(0, 200)}` };
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || "";
  const parsed = parseLooseJson(content);
  if (!parsed) {
    throw { code: "parse", message: `Could not parse Groq response as JSON: ${content.slice(0, 200)}` };
  }

  const usage = data.usage || {};
  const tokens = usage.total_tokens || estTokens(content);
  return { ok: true, json: parsed, tokens };
}
