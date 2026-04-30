/**
 * LLM client — Groq (OpenAI-compatible) + Gemini native API.
 * Browser-direct calls using BYOK.
 *
 * Two surfaces:
 *   generate()       — single-turn, returns full text
 *   chat()           — multi-turn, returns full text
 *   chatStream()     — multi-turn, streams chunks via callback
 */

import type { Keys, Provider } from './keys';
import type { ChatRole } from './chat';

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

export interface ChatMessage { role: ChatRole; content: string; }

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GEMINI_MODEL = 'gemini-2.0-flash-exp';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// ---------------- Single-turn generate ----------------
async function callGroq(prompt: string, key: string, opts: LLMOptions = {}): Promise<LLMResult> {
  const messages: ChatMessage[] = [];
  if (opts.system) messages.push({ role: 'system', content: opts.system });
  messages.push({ role: 'user', content: prompt });
  const body: Record<string, unknown> = {
    model: GROQ_MODEL,
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 4096,
  };
  if (opts.jsonMode) body.response_format = { type: 'json_object' };
  const r = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Groq ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data = await r.json();
  return {
    text: data.choices?.[0]?.message?.content ?? '',
    provider: 'groq', model: GROQ_MODEL,
    promptTokens: data.usage?.prompt_tokens, completionTokens: data.usage?.completion_tokens,
  };
}

async function callGemini(prompt: string, key: string, opts: LLMOptions = {}): Promise<LLMResult> {
  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`;
  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxTokens ?? 4096,
      ...(opts.jsonMode ? { responseMimeType: 'application/json' } : {}),
    },
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data = await r.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') ?? '';
  return {
    text, provider: 'gemini', model: GEMINI_MODEL,
    promptTokens: data.usageMetadata?.promptTokenCount, completionTokens: data.usageMetadata?.candidatesTokenCount,
  };
}

export async function generate(prompt: string, keys: Keys, opts: LLMOptions = {}): Promise<LLMResult> {
  const order: Provider[] = keys.preferredLLM
    ? [keys.preferredLLM, keys.preferredLLM === 'groq' ? 'gemini' : 'groq']
    : ['groq', 'gemini'];
  let lastErr: Error | null = null;
  for (const p of order) {
    try {
      if (p === 'groq' && keys.groq) return await callGroq(prompt, keys.groq, opts);
      if (p === 'gemini' && keys.gemini) return await callGemini(prompt, keys.gemini, opts);
    } catch (e) { lastErr = e as Error; }
  }
  throw lastErr ?? new Error('No LLM API key configured. Add Groq or Gemini key in Settings.');
}

// ---------------- Multi-turn chat ----------------
async function chatGroq(messages: ChatMessage[], key: string, opts: LLMOptions = {}): Promise<LLMResult> {
  const body: Record<string, unknown> = {
    model: GROQ_MODEL,
    messages,
    temperature: opts.temperature ?? 0.75,
    max_tokens: opts.maxTokens ?? 2048,
  };
  const r = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Groq ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data = await r.json();
  return {
    text: data.choices?.[0]?.message?.content ?? '',
    provider: 'groq', model: GROQ_MODEL,
    promptTokens: data.usage?.prompt_tokens, completionTokens: data.usage?.completion_tokens,
  };
}

async function chatGemini(messages: ChatMessage[], key: string, opts: LLMOptions = {}): Promise<LLMResult> {
  const sys = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  const turns = messages.filter(m => m.role !== 'system');
  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`;
  const body: Record<string, unknown> = {
    contents: turns.map(t => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.content }] })),
    generationConfig: { temperature: opts.temperature ?? 0.75, maxOutputTokens: opts.maxTokens ?? 2048 },
  };
  if (sys) body.systemInstruction = { parts: [{ text: sys }] };
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data = await r.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') ?? '';
  return {
    text, provider: 'gemini', model: GEMINI_MODEL,
    promptTokens: data.usageMetadata?.promptTokenCount, completionTokens: data.usageMetadata?.candidatesTokenCount,
  };
}

export async function chat(messages: ChatMessage[], keys: Keys, opts: LLMOptions = {}): Promise<LLMResult> {
  const order: Provider[] = keys.preferredLLM
    ? [keys.preferredLLM, keys.preferredLLM === 'groq' ? 'gemini' : 'groq']
    : ['groq', 'gemini'];
  let lastErr: Error | null = null;
  for (const p of order) {
    try {
      if (p === 'groq' && keys.groq) return await chatGroq(messages, keys.groq, opts);
      if (p === 'gemini' && keys.gemini) return await chatGemini(messages, keys.gemini, opts);
    } catch (e) { lastErr = e as Error; }
  }
  throw lastErr ?? new Error('No LLM API key configured.');
}

// ---------------- Streaming chat ----------------
type StreamCallback = (chunk: string, done: boolean) => void;

async function chatGroqStream(messages: ChatMessage[], key: string, opts: LLMOptions, cb: StreamCallback, signal?: AbortSignal): Promise<void> {
  const body = {
    model: GROQ_MODEL,
    messages,
    temperature: opts.temperature ?? 0.75,
    max_tokens: opts.maxTokens ?? 2048,
    stream: true,
  };
  const r = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
    signal,
  });
  if (!r.ok || !r.body) throw new Error(`Groq stream ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      const payload = t.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const j = JSON.parse(payload);
        const delta = j.choices?.[0]?.delta?.content || '';
        if (delta) cb(delta, false);
      } catch {}
    }
  }
  cb('', true);
}

async function chatGeminiStream(messages: ChatMessage[], key: string, opts: LLMOptions, cb: StreamCallback, signal?: AbortSignal): Promise<void> {
  const sys = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  const turns = messages.filter(m => m.role !== 'system');
  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`;
  const body: Record<string, unknown> = {
    contents: turns.map(t => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.content }] })),
    generationConfig: { temperature: opts.temperature ?? 0.75, maxOutputTokens: opts.maxTokens ?? 2048 },
  };
  if (sys) body.systemInstruction = { parts: [{ text: sys }] };
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  if (!r.ok || !r.body) throw new Error(`Gemini stream ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      const payload = t.slice(5).trim();
      if (!payload) continue;
      try {
        const j = JSON.parse(payload);
        const delta = j.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || '';
        if (delta) cb(delta, false);
      } catch {}
    }
  }
  cb('', true);
}

export async function chatStream(messages: ChatMessage[], keys: Keys, opts: LLMOptions, cb: StreamCallback, signal?: AbortSignal): Promise<void> {
  const order: Provider[] = keys.preferredLLM
    ? [keys.preferredLLM, keys.preferredLLM === 'groq' ? 'gemini' : 'groq']
    : ['groq', 'gemini'];
  let lastErr: Error | null = null;
  for (const p of order) {
    try {
      if (p === 'groq' && keys.groq) return await chatGroqStream(messages, keys.groq, opts, cb, signal);
      if (p === 'gemini' && keys.gemini) return await chatGeminiStream(messages, keys.gemini, opts, cb, signal);
    } catch (e) { lastErr = e as Error; }
  }
  throw lastErr ?? new Error('No LLM API key configured.');
}
