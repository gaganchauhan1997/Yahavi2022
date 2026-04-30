/**
 * LLM client — OpenAI-compatible APIs (Groq) + Gemini native API.
 * No backend; all calls direct from browser using user's BYOK.
 */

import type { Keys, Provider } from './keys';

export interface LLMOptions {
  system?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface LLMResult {
  text: string;
  provider: Provider;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
}

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GEMINI_MODEL = 'gemini-2.0-flash-exp';

async function callGroq(prompt: string, key: string, opts: LLMOptions = {}): Promise<LLMResult> {
  const messages: Array<{ role: string; content: string }> = [];
  if (opts.system) messages.push({ role: 'system', content: opts.system });
  messages.push({ role: 'user', content: prompt });
  const body: Record<string, unknown> = {
    model: GROQ_MODEL,
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 4096,
  };
  if (opts.jsonMode) body.response_format = { type: 'json_object' };
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Groq ${r.status}: ${err.slice(0, 200)}`);
  }
  const data = await r.json();
  return {
    text: data.choices?.[0]?.message?.content ?? '',
    provider: 'groq',
    model: GROQ_MODEL,
    promptTokens: data.usage?.prompt_tokens,
    completionTokens: data.usage?.completion_tokens,
  };
}

async function callGemini(prompt: string, key: string, opts: LLMOptions = {}): Promise<LLMResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`;
  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxTokens ?? 4096,
      ...(opts.jsonMode ? { responseMimeType: 'application/json' } : {}),
    },
  };
  if (opts.system) {
    body.systemInstruction = { parts: [{ text: opts.system }] };
  }
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Gemini ${r.status}: ${err.slice(0, 200)}`);
  }
  const data = await r.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') ?? '';
  return {
    text,
    provider: 'gemini',
    model: GEMINI_MODEL,
    promptTokens: data.usageMetadata?.promptTokenCount,
    completionTokens: data.usageMetadata?.candidatesTokenCount,
  };
}

/** Auto-pick provider based on user prefs + available keys. */
export async function generate(prompt: string, keys: Keys, opts: LLMOptions = {}): Promise<LLMResult> {
  const preferred = keys.preferredLLM;
  const order: Provider[] = preferred
    ? [preferred, preferred === 'groq' ? 'gemini' : 'groq']
    : ['groq', 'gemini'];
  let lastErr: Error | null = null;
  for (const p of order) {
    if (p === 'groq' && keys.groq) {
      try { return await callGroq(prompt, keys.groq, opts); }
      catch (e) { lastErr = e as Error; }
    }
    if (p === 'gemini' && keys.gemini) {
      try { return await callGemini(prompt, keys.gemini, opts); }
      catch (e) { lastErr = e as Error; }
    }
  }
  throw lastErr ?? new Error('No LLM API key configured. Add Groq or Gemini key in Settings.');
}
