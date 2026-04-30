/**
 * Slide-up modal that runs the SEO content pipeline triggered by /tale <title>.
 * Lets user pick template, watches progress, then shows score + output editor.
 */
import { useEffect, useRef, useState } from 'react';
import { X, Wand2 } from 'lucide-react';
import TemplatePicker from './TemplatePicker';
import GenerationProgress from './GenerationProgress';
import ScoreBadge from './ScoreBadge';
import OutputEditor from './OutputEditor';
import { runPipeline, type PipelinePhase } from '@/lib/pipeline';
import type { TemplateId } from '@/lib/prompts';
import { loadKeys } from '@/lib/keys';
import type { ScoreBreakdown } from '@/lib/score';

interface Props {
  open: boolean;
  initialTitle: string;
  onClose: () => void;
}

export default function TaleModal({ open, initialTitle, onClose }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [templateId, setTemplateId] = useState<TemplateId>('longform-blog');
  const [phase, setPhase] = useState<PipelinePhase>('idle');
  const [detail, setDetail] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [attempt, setAttempt] = useState(1);
  const [partialMd, setPartialMd] = useState('');
  const [finalMd, setFinalMd] = useState('');
  const [score, setScore] = useState<ScoreBreakdown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startedRef = useRef(false);

  // Reset whenever modal opens with a new title
  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setPhase('idle'); setDetail(''); setProgressPct(0); setAttempt(1);
      setPartialMd(''); setFinalMd(''); setScore(null); setError(null);
      startedRef.current = false;
    }
  }, [open, initialTitle]);

  // Auto-start once when title is present and modal opens
  useEffect(() => {
    if (open && initialTitle && !startedRef.current) {
      startedRef.current = true;
      void start(initialTitle, templateId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialTitle]);

  const start = async (t: string, tplId: TemplateId) => {
    if (!t.trim()) { setError('Tale needs a title.'); setPhase('error'); return; }
    setError(null); setFinalMd(''); setPartialMd(''); setScore(null);
    setProgressPct(0); setAttempt(1);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const result = await runPipeline({
        title: t.trim(),
        templateId: tplId,
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
      setError(msg); setPhase('error');
    } finally {
      abortRef.current = null;
    }
  };

  const cancel = () => abortRef.current?.abort();
  const restart = () => start(title, templateId);

  if (!open) return null;

  const generating = phase !== 'idle' && phase !== 'done' && phase !== 'error';
  const showOutput = (finalMd || partialMd) && !error;
  const fileBase = (title || 'last-tale')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

  return (
    <div className="fixed inset-0 z-40 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bx-card w-full max-w-4xl my-0 sm:my-8 max-h-screen sm:max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-bx-panel border-b border-bx-line px-5 py-3 flex items-center justify-between gap-3 z-10">
          <div className="flex items-center gap-2 min-w-0">
            <Wand2 className="w-4 h-4 text-bx-orange shrink-0" />
            <div className="truncate">
              <div className="text-sm font-medium text-bx-white truncate">Tale: {title}</div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-bx-mute">SEO writer · multi-pass · 90+ score</div>
            </div>
          </div>
          <button onClick={() => { cancel(); onClose(); }} className="bx-btn-icon"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Template picker (locked while generating) */}
          {!showOutput && (
            <div>
              <label className="bx-label block mb-2">Template</label>
              <fieldset disabled={generating}><TemplatePicker selected={templateId} onSelect={setTemplateId} /></fieldset>
            </div>
          )}

          {/* Progress */}
          {phase !== 'idle' && (
            <GenerationProgress
              phase={phase}
              detail={detail}
              progressPct={progressPct}
              attempt={attempt}
              error={error || undefined}
              onCancel={generating ? cancel : undefined}
            />
          )}

          {error && (
            <div className="bx-card border-bx-red/60 bg-bx-red/10 p-4 text-sm">
              <div className="font-semibold text-bx-red">Generation failed</div>
              <div className="font-mono text-xs text-bx-text/85 break-all mt-1">{error}</div>
              <button onClick={restart} className="bx-btn mt-3">Try again</button>
            </div>
          )}

          {showOutput && (
            <>
              {score && <ScoreBadge score={score} />}
              <OutputEditor markdown={finalMd || partialMd} onChange={setFinalMd} fileBaseName={fileBase} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
