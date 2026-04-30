import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Send, StopCircle, Copy, Check, Skull, User as UserIcon, Sparkles, Wand2 } from 'lucide-react';
import { loadKeys, hasMinimumKeys } from '@/lib/keys';
import { chatStream } from '@/lib/llm';
import {
  appendMsg, buildContext, loadHistory, saveHistory, totalMemoryTokens,
  type ChatMsg,
} from '@/lib/chat';

interface Props {
  onAskKeys: () => void;
  onTaleCommand: (title: string) => void;
  onMemoryChange: (tokens: number) => void;
  resetSignal: number;
}

const SUGGESTIONS = [
  { label: 'Tell me a tale on…', prompt: '/tale ' },
  { label: 'Explain like I\'m five:', prompt: 'Explain like I am 5: ' },
  { label: 'Code review this:', prompt: '```\n\n```\nReview this code, find bugs and suggest improvements.' },
  { label: 'SEO audit my page:', prompt: 'Do a 5-point SEO audit of this URL: https://' },
  { label: 'Summarise:', prompt: 'Summarise this in 5 bullet points:\n\n' },
  { label: 'Roast my idea:', prompt: 'Honestly critique this business idea:\n\n' },
];

export default function ChatPanel({ onAskKeys, onTaleCommand, onMemoryChange, resetSignal }: Props) {
  const [history, setHistory] = useState<ChatMsg[]>(() => loadHistory());
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamBuf, setStreamBuf] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Reset on signal
  useEffect(() => {
    if (resetSignal > 0) {
      setHistory([]);
      saveHistory([]);
      setStreamBuf('');
      setError(null);
      setInput('');
      onMemoryChange(0);
      inputRef.current?.focus();
    }
  }, [resetSignal, onMemoryChange]);

  // Token tracker → header
  useEffect(() => { onMemoryChange(totalMemoryTokens(history)); }, [history, onMemoryChange]);

  // Auto-scroll on new content
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }, [history, streamBuf]);

  // Auto-grow textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [input]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    if (!hasMinimumKeys()) { onAskKeys(); return; }

    // Slash command: /tale <title>
    if (trimmed.toLowerCase().startsWith('/tale ')) {
      const title = trimmed.slice(6).trim();
      if (!title) {
        setError('Tale needs a title — try "/tale The 10 Best AI Tools for Indie Devs 2026"');
        return;
      }
      // Echo as user message in chat (so memory shows it) but trigger pipeline
      const next = appendMsg(history, 'user', trimmed);
      setHistory(next);
      const reply = `Aight stranger. Settling in to spin a long-form tale titled **"${title}"**. Stay close — opening the writer in a moment…`;
      const next2 = appendMsg(next, 'assistant', reply);
      setHistory(next2);
      setInput('');
      setTimeout(() => onTaleCommand(title), 600);
      return;
    }

    // Normal chat turn
    setError(null);
    const next = appendMsg(history, 'user', trimmed);
    setHistory(next);
    setInput('');
    setStreaming(true);
    setStreamBuf('');

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const messages = buildContext(next, ''); // userTurn already in next
      // buildContext appends a trailing user — we already have the user appended
      // so drop the duplicate trailing user injected by buildContext:
      messages.pop();
      let acc = '';
      await chatStream(
        messages,
        loadKeys(),
        { temperature: 0.78, maxTokens: 2048 },
        (chunk, done) => {
          if (chunk) { acc += chunk; setStreamBuf(acc); }
          if (done) {
            const final = appendMsg(next, 'assistant', acc || '*The Dead Man fell silent.*');
            setHistory(final);
            setStreamBuf('');
            setStreaming(false);
            abortRef.current = null;
          }
        },
        ctrl.signal,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!ctrl.signal.aborted) {
        setError(msg);
        // persist what we got so far so user keeps it
        if (streamBuf) {
          const final = appendMsg(next, 'assistant', streamBuf);
          setHistory(final);
        }
      }
      setStreaming(false);
      setStreamBuf('');
      abortRef.current = null;
    }
  }, [history, onAskKeys, onTaleCommand, streaming, streamBuf]);

  const stop = () => abortRef.current?.abort();

  const copyMsg = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1200);
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const renderMd = (md: string) => DOMPurify.sanitize(marked.parse(md, { gfm: true, breaks: false }) as string);

  const empty = history.length === 0 && !streaming;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          {empty && <EmptyState onPick={s => { setInput(s); inputRef.current?.focus(); }} />}

          {history.map(m => (
            <MessageBubble
              key={m.id}
              role={m.role}
              html={renderMd(m.content)}
              raw={m.content}
              copied={copiedId === m.id}
              onCopy={() => copyMsg(m.id, m.content)}
            />
          ))}

          {streaming && (
            <MessageBubble
              role="assistant"
              html={renderMd(streamBuf || '*…*')}
              raw={streamBuf}
              streaming
            />
          )}

          {error && (
            <div className="bx-card border-bx-red/60 bg-bx-red/10 p-4 text-sm text-bx-text">
              <div className="font-semibold text-bx-red mb-1">The bullet jammed</div>
              <div className="font-mono text-xs text-bx-text/85 break-all">{error}</div>
              <div className="text-xs text-bx-dim mt-2">Check API key (Settings) or switch preferred provider.</div>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-bx-line bg-bx-black/95 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="bx-card flex items-end gap-2 p-2 focus-within:border-bx-orange transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder='Ask what you want the most… (Shift+Enter for new line, /tale <title> for SEO content)'
              rows={1}
              className="flex-1 bg-transparent text-bx-text placeholder:text-bx-mute resize-none px-2 py-2 outline-none text-[15px] font-sans max-h-[200px]"
              disabled={streaming}
            />
            {streaming ? (
              <button onClick={stop} className="bx-btn-icon bg-bx-red/20 border-bx-red/60 text-bx-red hover:text-bx-red" title="Stop">
                <StopCircle className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => send(input)}
                disabled={!input.trim()}
                className="bx-btn-icon bg-bx-orange border-bx-orange text-black hover:bg-bx-orange2 hover:text-black disabled:opacity-30"
                title="Send (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between mt-2 px-1 text-[10px] font-mono text-bx-mute">
            <span>The Dead Man remembers up to 10,000 tokens · Markdown supported · /tale for SEO</span>
            <span>{loadKeys().preferredLLM === 'gemini' ? 'gemini-2.0-flash' : 'llama-3.3-70b'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ role, html, raw, copied, onCopy, streaming }: {
  role: ChatMsg['role'];
  html: string;
  raw: string;
  copied?: boolean;
  onCopy?: () => void;
  streaming?: boolean;
}) {
  const isUser = role === 'user';
  return (
    <div className={'flex gap-3 sm:gap-4 ' + (isUser ? 'flex-row-reverse' : '')}>
      <div className={
        'w-8 h-8 rounded-md border flex items-center justify-center shrink-0 ' +
        (isUser ? 'border-bx-line2 bg-bx-panel2 text-bx-dim' : 'border-bx-orange/60 bg-bx-orangeDim text-bx-orange')
      }>
        {isUser ? <UserIcon className="w-4 h-4" /> : <Skull className="w-4 h-4" />}
      </div>
      <div className={'flex-1 min-w-0 ' + (isUser ? 'flex justify-end' : '')}>
        <div className={
          'group relative inline-block max-w-full rounded-lg px-4 py-3 ' +
          (isUser ? 'bg-bx-panel2 border border-bx-line2 text-bx-text' : 'bg-bx-panel border border-bx-line text-bx-text')
        }>
          <div className="bx-prose break-words" dangerouslySetInnerHTML={{ __html: html }} />
          {streaming && raw && <span className="inline-block w-2 h-4 bg-bx-orange align-text-bottom ml-1 animate-pulse" />}
          {!streaming && raw && onCopy && (
            <button
              onClick={onCopy}
              className="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bx-btn-ghost py-1"
              title="Copy"
            >
              {copied ? <Check className="w-3 h-3 text-bx-orange" /> : <Copy className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="text-center py-10 sm:py-16 space-y-6">
      <div className="inline-flex w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-bx-orange/60 bg-bx-orangeDim items-center justify-center mx-auto" style={{ filter: 'drop-shadow(0 0 18px rgba(255,107,0,0.4))' }}>
        <Skull className="w-9 h-9 sm:w-10 sm:h-10 text-bx-orange animate-flicker" />
      </div>
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-bx-white">
          Ask what you want <span className="text-bx-orange">the most</span>.
        </h1>
        <p className="text-bx-dim mt-2 text-sm sm:text-base">
          The Dead Man speaks. Code, marketing, finance, philosophy, hacks — name it.
          <br className="hidden sm:block" />
          For long-form SEO content with citations, type <code className="text-bx-orange">/tale &lt;title&gt;</code>.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl mx-auto">
        {SUGGESTIONS.map(s => (
          <button
            key={s.label}
            onClick={() => onPick(s.prompt)}
            className="bx-card-flat hover:border-bx-orange transition-colors text-left px-4 py-3 group"
          >
            <div className="flex items-center gap-2">
              {s.prompt.startsWith('/tale')
                ? <Wand2 className="w-3.5 h-3.5 text-bx-orange" />
                : <Sparkles className="w-3.5 h-3.5 text-bx-mute group-hover:text-bx-orange" />}
              <span className="text-sm text-bx-text">{s.label}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
