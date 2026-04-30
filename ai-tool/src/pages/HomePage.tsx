import { useState, useRef, useCallback, useEffect } from 'react';
import { Wand2, AlertOctagon } from 'lucide-react';
import TemplatePicker from '@/components/TemplatePicker';
import GenerationProgress from '@/components/GenerationProgress';
import ScoreBadge from '@/components/ScoreBadge';
import OutputEditor from '@/components/OutputEditor';
import KeysModal from '@/components/KeysModal';
import { TEMPLATE_LIST, type TemplateId } from '@/lib/prompts';
import { loadKeys, hasMinimumKeys } from '@/lib/keys';
import { runPipeline, type PipelinePhase } from '@/lib/pipeline';
import type { ScoreBreakdown } from '@/lib/score';

interface Props {
  openSettings: () => void;
  settingsOpen: boolean;
  closeSettings: () => void;
}

export default function HomePage({ openSettings, settingsOpen, closeSettings }: Props) {
  const [title, setTitle] = useState('');
  const [templateId, setTemplateId] = useState<TemplateId>('longform-blog');
  const [phase, setPhase] = useState<PipelinePhase>('idle');
  const [detail, setDetail] = useState<string>('');
  const [progressPct, setProgressPct] = useState(0);
  const [attempt, setAttempt] = useState(1);
  const [partialMd, setPartialMd] = useState('');
  const [finalMd, setFinalMd] = useState('');
  const [score, setScore] = useState<ScoreBreakdown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasKeys, setHasKeys] = useState(hasMinimumKeys());
  const abortRef = useRef<AbortController | null>(null);

  // Re-check keys when modal closes
  useEffect(() => {
    if (!settingsOpen) setHasKeys(hasMinimumKeys());
  }, [settingsOpen]);

  const generating = phase !== 'idle' && phase !== 'done' && phase !== 'error';

  const onGenerate = useCallback(async () => {
    setError(null);
    setFinalMd('');
    setPartialMd('');
    setScore(null);
    setProgressPct(0);
    setAttempt(1);
    if (!title.trim()) { setError('Title likh bhai.'); return; }
    if (!hasMinimumKeys()) { openSettings(); return; }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const result = await runPipeline({
        title: title.trim(),
        templateId,
        keys: loadKeys(),
        signal: ctrl.signal,
        maxAttempts: 2,
        targetScore: 90,
        onProgress: e => {
          setPhase(e.phase);
          if (e.detail !== undefined) setDetail(e.detail);
          if (e.progressPct !== undefined) setProgressPct(e.progressPct);
          if (e.attempt !== undefined) setAttempt(e.attempt);
          if (e.partialMd !== undefined) setPartialMd(e.partialMd);
          if (e.score) setScore(e.score);
        },
      });
      setFinalMd(result.markdown);
      setScore(result.score);
      setPhase('done');
      setProgressPct(100);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setPhase('error');
    } finally {
      abortRef.current = null;
    }
  }, [title, templateId, openSettings]);

  const onCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const fileBaseName = (title || 'last-tale')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

  const showOutput = (finalMd || partialMd) && !error;

  return (
    <>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Hero / pitch */}
        {!showOutput && phase === 'idle' && (
          <section className="text-center space-y-4 py-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-noir-blood/40 rounded-full bg-noir-blood/10 font-mono text-[10px] uppercase tracking-[0.25em] text-noir-blood">
              <span className="w-1.5 h-1.5 rounded-full bg-noir-blood animate-pulse" /> SEO content · GPT/Claude/Perplexity-grade · 90+ score guaranteed
            </div>
            <h1 className="font-display font-black text-4xl sm:text-5xl md:text-6xl text-noir-bone leading-tight">
              The dead don't lie.
              <br />
              <span className="italic text-noir-blood">They tell tales.</span>
            </h1>
            <p className="max-w-2xl mx-auto text-noir-bone/70 text-base sm:text-lg leading-relaxed">
              Title likho. Template chuno. Citations + readable structure + 90+ quality score ke saath full SEO article milta hai. Copy karo, export karo, publish karo. Zero backend — sab kuch tumhare browser me.
            </p>
          </section>
        )}

        {/* Title input */}
        <section className="noir-card p-5 sm:p-7 space-y-5">
          <div>
            <label htmlFor="title" className="noir-label block mb-2">
              Article title (your only input — sab baaki AI sambhal lega)
            </label>
            <div className="relative">
              <input
                id="title"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. The 10 Best AI Coding Assistants for Indian Devs in 2026"
                className="noir-input text-lg font-display"
                disabled={generating}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) onGenerate(); }}
              />
            </div>
            <p className="text-[11px] text-noir-fog mt-2 font-mono">
              {title.length}/120 chars · enter dabane se start hoga
            </p>
          </div>

          <div>
            <label className="noir-label block mb-3">Pick a template</label>
            <TemplatePicker selected={templateId} onSelect={setTemplateId} />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="text-xs text-noir-bone/60 font-mono">
              {hasKeys ? <span className="text-noir-gold">● keys loaded</span> : <span className="text-noir-blood">● no LLM key — open Settings</span>}
              <span className="mx-2 text-noir-fog">·</span>
              <span>tpl: {TEMPLATE_LIST.find(t => t.id === templateId)?.label}</span>
            </div>
            <button
              onClick={onGenerate}
              disabled={generating || !title.trim()}
              className="noir-btn flex items-center justify-center gap-2 self-stretch sm:self-auto"
            >
              <Wand2 className="w-4 h-4" />
              {generating ? 'Telling tale…' : 'Tell the Tale'}
            </button>
          </div>
        </section>

        {/* Progress */}
        {phase !== 'idle' && (
          <section className="space-y-4">
            <GenerationProgress
              phase={phase}
              detail={detail}
              progressPct={progressPct}
              attempt={attempt}
              error={error || undefined}
              onCancel={generating ? onCancel : undefined}
            />
            {error && (
              <div className="noir-card p-4 border-noir-blood/50 bg-noir-blood/10 flex items-start gap-3">
                <AlertOctagon className="w-5 h-5 text-noir-blood shrink-0 mt-0.5" />
                <div>
                  <div className="font-display font-semibold text-noir-blood">Generation failed</div>
                  <div className="text-sm text-noir-bone/80 mt-1 font-mono break-all">{error}</div>
                  <div className="text-xs text-noir-bone/60 mt-2">Common fixes: check API key in Settings, switch preferred provider, simplify the title.</div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Output */}
        {showOutput && (
          <section className="space-y-4">
            {score && <ScoreBadge score={score} />}
            <OutputEditor
              markdown={finalMd || partialMd}
              onChange={setFinalMd}
              fileBaseName={fileBaseName}
            />
          </section>
        )}

        <footer className="text-center pt-8 text-[11px] font-mono text-noir-fog uppercase tracking-[0.25em] border-t border-noir-fog/20 mt-12">
          <span className="text-noir-blood">✗</span> Dead Man Will Tell Last Tale · A HackKnow tool · BYOK · No data ever leaves your browser
        </footer>
      </main>

      <KeysModal open={settingsOpen} onClose={closeSettings} />
    </>
  );
}
