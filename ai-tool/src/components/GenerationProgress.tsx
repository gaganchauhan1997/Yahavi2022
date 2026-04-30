import { Loader2, CheckCircle2, AlertOctagon, Search, FileText, PenLine, Gauge, Sparkles, FileCheck2 } from 'lucide-react';
import type { PipelinePhase } from '@/lib/pipeline';

interface Props {
  phase: PipelinePhase;
  detail?: string;
  progressPct?: number;
  attempt?: number;
  error?: string;
  onCancel?: () => void;
}

const PHASE_META: Record<PipelinePhase, { label: string; icon: typeof Search }> = {
  idle:     { label: 'Ready', icon: FileText },
  research: { label: 'Researching sources', icon: Search },
  outline:  { label: 'Architecting outline', icon: FileText },
  draft:    { label: 'Writing the tale', icon: PenLine },
  score:    { label: 'Scoring quality', icon: Gauge },
  polish:   { label: 'Polishing weak spots', icon: Sparkles },
  finalize: { label: 'Finalising', icon: FileCheck2 },
  done:     { label: 'Tale told', icon: CheckCircle2 },
  error:    { label: 'Something went sideways', icon: AlertOctagon },
};

export default function GenerationProgress({ phase, detail, progressPct = 0, attempt, error, onCancel }: Props) {
  const meta = PHASE_META[phase];
  const Icon = meta.icon;
  const isError = phase === 'error';
  const isDone = phase === 'done';
  const inFlight = !isError && !isDone && phase !== 'idle';
  return (
    <div className="bx-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className={
          'w-11 h-11 rounded-md border-2 flex items-center justify-center shrink-0 ' +
          (isError ? 'border-bx-red bg-bx-red/10' : isDone ? 'border-bx-orange bg-bx-orangeDim' : 'border-bx-line2 bg-bx-ink')
        }>
          {inFlight
            ? <Loader2 className="w-5 h-5 text-bx-orange animate-spin" />
            : <Icon className={'w-5 h-5 ' + (isError ? 'text-bx-red' : 'text-bx-orange')} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3 mb-0.5">
            <div className="font-medium text-bx-text text-sm">
              {meta.label}
              {attempt && attempt > 1 && <span className="ml-2 text-xs font-mono text-bx-orange/80">pass #{attempt}</span>}
            </div>
            <div className="font-mono text-xs text-bx-mute">{Math.round(progressPct)}%</div>
          </div>
          <div className="text-sm text-bx-dim truncate">{detail || (isError ? error : '…')}</div>
        </div>
      </div>
      <div className="mt-3 h-1 bg-bx-ink rounded-full overflow-hidden">
        <div
          className={'h-full transition-all duration-500 ' + (isError ? 'bg-bx-red' : 'bg-bx-orange')}
          style={{ width: Math.max(2, Math.min(100, progressPct)) + '%' }}
        />
      </div>
      {inFlight && onCancel && (
        <div className="mt-3 text-right">
          <button onClick={onCancel} className="bx-btn-ghost">Cancel</button>
        </div>
      )}
    </div>
  );
}
