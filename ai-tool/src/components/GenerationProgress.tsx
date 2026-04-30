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
  idle: { label: 'Ready', icon: FileText },
  research: { label: 'Researching sources', icon: Search },
  outline: { label: 'Architecting outline', icon: FileText },
  draft: { label: 'Writing the tale', icon: PenLine },
  score: { label: 'Scoring quality', icon: Gauge },
  polish: { label: 'Polishing weak spots', icon: Sparkles },
  finalize: { label: 'Finalising', icon: FileCheck2 },
  done: { label: 'Tale told', icon: CheckCircle2 },
  error: { label: 'Something went sideways', icon: AlertOctagon },
};

export default function GenerationProgress({ phase, detail, progressPct = 0, attempt, error, onCancel }: Props) {
  const meta = PHASE_META[phase];
  const Icon = meta.icon;
  const isError = phase === 'error';
  const isDone = phase === 'done';
  const inFlight = !isError && !isDone && phase !== 'idle';
  return (
    <div className="noir-card p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className={
          'w-12 h-12 rounded-sm border-2 flex items-center justify-center shrink-0 ' +
          (isError ? 'border-noir-blood bg-noir-blood/20' :
            isDone ? 'border-noir-gold bg-noir-gold/20' :
            'border-noir-fog/60 bg-noir-black/40')
        }>
          {inFlight ? <Loader2 className="w-5 h-5 text-noir-gold animate-spin" /> : <Icon className={'w-5 h-5 ' + (isError ? 'text-noir-blood' : 'text-noir-gold')} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <div className="font-display font-semibold text-noir-bone">
              {meta.label}
              {attempt && attempt > 1 && <span className="ml-2 text-xs font-mono text-noir-gold/80">pass #{attempt}</span>}
            </div>
            <div className="font-mono text-xs text-noir-fog">{Math.round(progressPct)}%</div>
          </div>
          <div className="text-sm text-noir-bone/75 truncate">{detail || (isError ? error : '…')}</div>
        </div>
      </div>
      <div className="mt-4 h-1.5 bg-noir-black/60 rounded-full overflow-hidden">
        <div
          className={'h-full transition-all duration-500 ' + (isError ? 'bg-noir-blood' : 'bg-gradient-to-r from-noir-gold to-noir-blood')}
          style={{ width: Math.max(2, Math.min(100, progressPct)) + '%' }}
        />
      </div>
      {inFlight && onCancel && (
        <div className="mt-3 text-right">
          <button onClick={onCancel} className="noir-btn-ghost">Cancel</button>
        </div>
      )}
    </div>
  );
}
