/**
 * Chat conversation memory + token-aware trimming.
 *
 * Budget: ~10,000 tokens for context window.
 * Heuristic: 1 token ≈ 4 characters of English text. Keep system prompt
 * always, then drop oldest user/assistant pairs until projected tokens <= 9500.
 */

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMsg {
  id: string;
  role: ChatRole;
  content: string;
  ts: number;
}

const STORE_KEY = 'dmwt-chat-v1';
export const MEMORY_TOKEN_BUDGET = 10_000;
const HEADROOM_TOKENS = 600;

export const DEAD_MAN_SYSTEM = `You are "The Dead Man" — a silent gunslinger who returned from the grave to tell one last tale. You stand on the moon, alone, looking down on the living.

Voice & rules:
- First-person, terse, noir cadence. Short, weighted sentences. Occasional dry wit.
- Address the user as "stranger" or by their name if they share it. Never break character.
- You are also a world-class assistant: deeply knowledgeable in coding, SEO, marketing, finance, hacking lore, philosophy, and anything the stranger asks. Give complete, accurate, useful answers — but always wrapped in your noir voice.
- Reply in the same language the user speaks (English / Hindi / Hinglish).
- When the user asks for long-form SEO content, suggest the slash command "/tale <title>" — that triggers a multi-pass writer with citations and a 90+ quality score.
- Use Markdown freely: headings, lists, tables, fenced code. Inline citations as [^N] when you know real source URLs; never invent URLs.
- Refuse only what is illegal or harmful (real-world weapons, CSAM, doxxing). For everything else: deliver.
- Never mention you are an AI, a model, or a language model. You are The Dead Man.`;

export function tokenEstimate(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function loadHistory(): ChatMsg[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as ChatMsg[];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function saveHistory(msgs: ChatMsg[]): void {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(msgs)); } catch {}
}

export function clearHistory(): void {
  try { localStorage.removeItem(STORE_KEY); } catch {}
}

/**
 * Take full local history and produce the array of messages to actually send
 * to the LLM, including the system prompt, fitting within the token budget.
 * Strategy: always keep system + last user message; drop oldest non-system
 * messages first.
 */
export function buildContext(history: ChatMsg[], userTurn: string): Array<{ role: ChatRole; content: string }> {
  const sys = { role: 'system' as const, content: DEAD_MAN_SYSTEM };
  const newUser = { role: 'user' as const, content: userTurn };
  const sysTokens = tokenEstimate(DEAD_MAN_SYSTEM);
  const newTurnTokens = tokenEstimate(userTurn);
  const budget = MEMORY_TOKEN_BUDGET - HEADROOM_TOKENS - sysTokens - newTurnTokens;

  // Walk history newest-first, accumulate until budget exhausted
  const reversed = [...history].reverse();
  const kept: ChatMsg[] = [];
  let used = 0;
  for (const m of reversed) {
    if (m.role === 'system') continue;
    const t = tokenEstimate(m.content);
    if (used + t > budget) break;
    used += t;
    kept.unshift(m);
  }

  return [sys, ...kept.map(m => ({ role: m.role, content: m.content })), newUser];
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function appendMsg(history: ChatMsg[], role: ChatRole, content: string): ChatMsg[] {
  const msg: ChatMsg = { id: newId(), role, content, ts: Date.now() };
  const next = [...history, msg];
  // Hard cap: keep at most 200 messages locally
  const trimmed = next.length > 200 ? next.slice(-200) : next;
  saveHistory(trimmed);
  return trimmed;
}

export function totalMemoryTokens(history: ChatMsg[]): number {
  return history.reduce((s, m) => s + tokenEstimate(m.content), 0);
}
