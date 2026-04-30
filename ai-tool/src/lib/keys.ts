/**
 * BYOK — user-supplied API keys for LLM + search providers.
 * Stored in localStorage (lightly obfuscated). User responsibility.
 */

export type Provider = 'groq' | 'gemini';
export type SearchProvider = 'tavily' | 'brave' | 'serper' | 'none';

export interface Keys {
  groq?: string;
  gemini?: string;
  tavily?: string;
  brave?: string;
  serper?: string;
  preferredLLM?: Provider;
  preferredSearch?: SearchProvider;
}

const KEY = 'dmwt-keys-v1';

function obfuscate(s: string): string {
  return btoa(encodeURIComponent(s.split('').reverse().join('')));
}
function deobfuscate(s: string): string {
  try { return decodeURIComponent(atob(s)).split('').reverse().join(''); } catch { return ''; }
}

export function loadKeys(): Keys {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw) as Record<string, string>;
    const out: Keys = {};
    if (obj.groq) out.groq = deobfuscate(obj.groq);
    if (obj.gemini) out.gemini = deobfuscate(obj.gemini);
    if (obj.tavily) out.tavily = deobfuscate(obj.tavily);
    if (obj.brave) out.brave = deobfuscate(obj.brave);
    if (obj.serper) out.serper = deobfuscate(obj.serper);
    if (obj.preferredLLM) out.preferredLLM = obj.preferredLLM as Provider;
    if (obj.preferredSearch) out.preferredSearch = obj.preferredSearch as SearchProvider;
    return out;
  } catch {
    return {};
  }
}

export function saveKeys(keys: Keys): void {
  const obj: Record<string, string> = {};
  if (keys.groq) obj.groq = obfuscate(keys.groq);
  if (keys.gemini) obj.gemini = obfuscate(keys.gemini);
  if (keys.tavily) obj.tavily = obfuscate(keys.tavily);
  if (keys.brave) obj.brave = obfuscate(keys.brave);
  if (keys.serper) obj.serper = obfuscate(keys.serper);
  if (keys.preferredLLM) obj.preferredLLM = keys.preferredLLM;
  if (keys.preferredSearch) obj.preferredSearch = keys.preferredSearch;
  localStorage.setItem(KEY, JSON.stringify(obj));
}

export function hasMinimumKeys(): boolean {
  const k = loadKeys();
  return !!(k.groq || k.gemini);
}
