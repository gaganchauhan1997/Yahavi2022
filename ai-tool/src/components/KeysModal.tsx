import { useState, useEffect } from 'react';
import { X, KeyRound, ExternalLink, Eye, EyeOff, Trash2, ShieldCheck } from 'lucide-react';
import { loadKeys, saveKeys, hasMinimumKeys, type Keys } from '@/lib/keys';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called when user just transitioned from "no keys" → "has keys" — used to trigger launch animation. */
  onFirstKeySaved?: () => void;
  /** If true, modal mounts in mandatory mode (no close button, blocks until at least one key is saved). */
  mandatory?: boolean;
}

const PROVIDERS = [
  { key: 'groq' as const, label: 'Groq', signupUrl: 'https://console.groq.com/keys', help: 'llama-3.3-70b — fastest, generous free tier', tag: 'LLM' },
  { key: 'gemini' as const, label: 'Google Gemini', signupUrl: 'https://aistudio.google.com/app/apikey', help: 'gemini-2.0-flash — strong quality, free tier', tag: 'LLM' },
  { key: 'tavily' as const, label: 'Tavily Search', signupUrl: 'https://tavily.com/', help: 'Best for citations · 1k free/mo', tag: 'Search' },
  { key: 'brave' as const, label: 'Brave Search', signupUrl: 'https://brave.com/search/api/', help: 'Alt search · 2k free/mo', tag: 'Search' },
  { key: 'serper' as const, label: 'Serper.dev', signupUrl: 'https://serper.dev/', help: 'Google results via API · 2.5k free', tag: 'Search' },
];

export default function KeysModal({ open, onClose, onFirstKeySaved, mandatory = false }: Props) {
  const [keys, setKeys] = useState<Keys>({});
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [hadKeys, setHadKeys] = useState(false);

  useEffect(() => {
    if (open) {
      setKeys(loadKeys());
      setHadKeys(hasMinimumKeys());
    }
  }, [open]);

  if (!open) return null;

  const update = (k: keyof Keys, v: string) => setKeys(p => ({ ...p, [k]: v }));
  const canSave = !!(keys.groq || keys.gemini);

  /** Wipe a single provider key from form state + persisted storage immediately. */
  const deleteOne = (k: keyof Keys) => {
    const next = { ...keys };
    delete next[k];
    setKeys(next);
    saveKeys(next);
  };

  /** Wipe ALL keys + preferences from form state + persisted storage. */
  const deleteAll = () => {
    if (!confirm('Delete all keys from this browser? This cannot be undone.')) return;
    setKeys({});
    saveKeys({});
    setHadKeys(false);
  };

  const save = () => {
    if (!canSave) return;
    saveKeys(keys);
    const wasFirst = !hadKeys && hasMinimumKeys();
    if (wasFirst && onFirstKeySaved) {
      onFirstKeySaved();
      // KeysModal closes after the launch animation completes
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={() => { if (!mandatory) onClose(); }}
    >
      <div className="bx-card max-w-2xl w-full p-6 sm:p-8 my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-xl font-semibold text-bx-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-bx-orange" /> Bring Your Own Keys
            </h2>
            <p className="text-sm text-bx-dim mt-1">
              {mandatory
                ? 'The Dead Man needs a key to speak. Add at least one LLM key to begin.'
                : 'Keys live only in your browser. They never touch any server.'}
            </p>
          </div>
          {!mandatory && (
            <button onClick={onClose} className="text-bx-mute hover:text-bx-text p-1"><X className="w-5 h-5" /></button>
          )}
        </div>

        <div className="bx-divider" />

        <div className="space-y-4">
          {PROVIDERS.map(p => (
            <div key={p.key}>
              <div className="flex items-baseline justify-between mb-1.5">
                <label className="bx-label flex items-center gap-2">
                  {p.label}
                  <span className="text-bx-mute font-normal normal-case tracking-normal text-[10px]">· {p.tag}</span>
                </label>
                <a href={p.signupUrl} target="_blank" rel="noreferrer" className="text-[10px] text-bx-orange hover:text-bx-orange2 flex items-center gap-1 font-mono uppercase tracking-wider">
                  Get key <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <div className="relative">
                <input
                  type={show[p.key] ? 'text' : 'password'}
                  value={(keys[p.key] as string) || ''}
                  onChange={e => update(p.key, e.target.value)}
                  placeholder={`${p.label} API key…`}
                  className="bx-input pr-20 font-mono text-sm"
                  autoComplete="off"
                />
                {(keys[p.key] as string) && (
                  <button
                    type="button"
                    onClick={() => deleteOne(p.key)}
                    className="absolute right-9 top-1/2 -translate-y-1/2 text-bx-mute hover:text-red-500 p-1"
                    aria-label={`Delete ${p.label} key`}
                    title="Delete this key from your browser"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShow(s => ({ ...s, [p.key]: !s[p.key] }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-bx-mute hover:text-bx-orange p-1"
                  aria-label={show[p.key] ? 'Hide key' : 'Show key'}
                >
                  {show[p.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-bx-mute mt-1">{p.help}</p>
            </div>
          ))}

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="bx-label block mb-1.5">Preferred LLM</label>
              <select
                value={keys.preferredLLM || ''}
                onChange={e => update('preferredLLM', e.target.value)}
                className="bx-input"
              >
                <option value="">Auto (first available)</option>
                <option value="groq">Groq · llama-3.3-70b</option>
                <option value="gemini">Gemini 2.0 Flash</option>
              </select>
            </div>
            <div>
              <label className="bx-label block mb-1.5">Preferred Search</label>
              <select
                value={keys.preferredSearch || ''}
                onChange={e => update('preferredSearch', e.target.value)}
                className="bx-input"
              >
                <option value="">Auto (first available)</option>
                <option value="tavily">Tavily</option>
                <option value="brave">Brave</option>
                <option value="serper">Serper</option>
                <option value="none">None (LLM-only)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bx-divider" />

        {/* Privacy promise — exactly what we do (and don't) with your keys */}
        <div className="rounded-md border border-bx-orange/40 bg-bx-orange/5 px-3.5 py-3 mb-4">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-bx-orange flex-shrink-0 mt-0.5" />
            <div className="text-[11.5px] text-bx-text leading-relaxed">
              <span className="font-semibold text-bx-orange">We don't save your API key data.</span>{' '}
              Keys live only in this browser's local storage — never sent to any server of ours.
              Just enter your key, generate your content, then delete it from our platform here.
              If you want a clean exit, also revoke it from the provider's API-key dashboard.
              <div className="mt-1.5 text-bx-mute text-[10.5px]">
                Press <span className="font-mono text-bx-orange">Delete All</span> below to wipe every key from this device in one click.
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <button
            onClick={deleteAll}
            type="button"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-bx-mute hover:text-red-500 border border-bx-mute/30 hover:border-red-500/60 px-3 py-1.5 rounded-md transition-colors"
            title="Wipe all stored keys from this browser"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete All
          </button>
          <button onClick={save} disabled={!canSave} className="bx-btn">
            {hadKeys ? 'Save & Close' : 'Summon the Dead Man'}
          </button>
        </div>
      </div>
    </div>
  );
}
