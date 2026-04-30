import { useEffect, useRef, useState, useCallback } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Send, StopCircle, Copy, Check, Skull, User as UserIcon, Download } from 'lucide-react';
import Logo from './Logo';
import { loadKeys, hasMinimumKeys } from '@/lib/keys';
import { chatStream } from '@/lib/llm';
import {
  appendMsg, buildContext, loadHistory, saveHistory,
  type ChatMsg,
} from '@/lib/chat';

interface Props {
  onAskKeys: () => void;
  resetSignal: number;
}

export default function ChatPanel({ onAskKeys, resetSignal }: Props) {
  const [history, setHistory] = useState<ChatMsg[]>(() => loadHistory());
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamBuf, setStreamBuf] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Reset
  useEffect(() => {
    if (resetSignal > 0) {
      setHistory([]); saveHistory([]);
      setStreamBuf(''); setError(''); setInput('');
      inputRef.current?.focus();
    }
  }, [resetSignal]);

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

    setError(null);
    const next = appendMsg(history, 'user', trimmed);
    setHistory(next);
    setInput('');
    setStreaming(true);
    setStreamBuf('');

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const messages = buildContext(next, '');
      messages.pop(); // remove trailing dup user injected by buildContext
      let acc = '';
      await chatStream(
        messages, loadKeys(),
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
        if (streamBuf) {
          const final = appendMsg(next, 'assistant', streamBuf);
          setHistory(final);
        }
      }
      setStreaming(false);
      setStreamBuf('');
      abortRef.current = null;
    }
  }, [history, onAskKeys, streaming, streamBuf]);

  const stop = () => abortRef.current?.abort();

  const copyMsg = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1200);
  };

  const exportMsg = (text: string, idx: number) => {
    // Try to derive a filename from the first line / heading
    const firstLine = (text.split('\n').find(l => l.trim().length > 0) || `tale-${idx + 1}`)
      .replace(/^#+\s*/, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'tale';
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${firstLine}.md`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
      {/* Messages / empty hero */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
          {empty && <Hero />}

          {history.map((m, i) => (
            <MessageBubble
              key={m.id}
              role={m.role}
              html={renderMd(m.content)}
              raw={m.content}
              copied={copiedId === m.id}
              onCopy={() => copyMsg(m.id, m.content)}
              onExport={m.role === 'assistant' ? () => exportMsg(m.content, i) : undefined}
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
              <div className="text-xs text-bx-dim mt-2">Check API key (settings) or switch provider.</div>
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
              placeholder="Ask what you want the most…"
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
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <div className="text-center py-8 sm:py-14">
      <div className="inline-block">
        <Logo size={120} withGlow animated />
      </div>
      <h1 className="mt-6 text-3xl sm:text-4xl font-semibold text-bx-white tracking-tight">
        The Dead <span className="text-bx-orange">Man</span>
      </h1>
      <p className="mt-3 font-mono text-[11px] sm:text-xs uppercase tracking-[0.32em] text-bx-orange">
        Few words&nbsp;·&nbsp;Last word&nbsp;·&nbsp;Best word
      </p>
      <p className="mt-6 text-bx-dim text-sm sm:text-[15px] max-w-md mx-auto">
        Ask what you want the most.
      </p>
    </div>
  );
}

function MessageBubble({ role, html, raw, copied, onCopy, onExport, streaming }: {
  role: ChatMsg['role'];
  html: string;
  raw: string;
  copied?: boolean;
  onCopy?: () => void;
  onExport?: () => void;
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
          {!streaming && raw && (onCopy || onExport) && (
            <div className="absolute -top-3 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onCopy && (
                <button onClick={onCopy} className="bx-btn-ghost py-1 flex items-center gap-1" title="Copy">
                  {copied ? <Check className="w-3 h-3 text-bx-orange" /> : <Copy className="w-3 h-3" />}
                  <span className="text-[9px]">{copied ? 'Copied' : 'Copy'}</span>
                </button>
              )}
              {onExport && (
                <button onClick={onExport} className="bx-btn-ghost py-1 flex items-center gap-1" title="Export as Markdown">
                  <Download className="w-3 h-3" />
                  <span className="text-[9px]">.md</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
