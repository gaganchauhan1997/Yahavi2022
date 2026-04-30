import { Gauge, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { ScoreBreakdown } from '@/lib/score';

interface Props {
  score: ScoreBreakdown;
}

const ROWS: Array<[keyof ScoreBreakdown, string, number]> = [
  ['length', 'Length', 15],
  ['structure', 'Structure', 15],
  ['readability', 'Readability', 15],
  ['keywordDensity', 'Keyword Density', 10],
  ['citations', 'Citations', 15],
  ['listsTables', 'Lists & Tables', 10],
  ['coherence', 'Coherence', 10],
  ['originality', 'Originality', 10],
];

export default function ScoreBadge({ score }: Props) {
  const [open, setOpen] = useState(false);
  const tier = score.total >= 90 ? 'gold' : score.total >= 75 ? 'amber' : 'red';
  const tierClass = tier === 'gold' ? 'text-noir-gold border-noir-gold' : tier === 'amber' ? 'text-amber-400 border-amber-400' : 'text-noir-blood border-noir-blood';
  const tierLabel = tier === 'gold' ? 'Tale Worthy' : tier === 'amber' ? 'Needs Polish' : 'Rough Draft';
  return (
    <div className="noir-card p-4 sm:p-5">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-4 text-left">
        <div className="flex items-center gap-3">
          <div className={'w-14 h-14 rounded-sm border-2 flex items-center justify-center font-display font-bold text-2xl ' + tierClass}>
            {score.total}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Gauge className="w-3.5 h-3.5 text-noir-gold/80" />
              <span className="font-display font-semibold text-noir-bone">Quality Score</span>
            </div>
            <div className={'text-xs font-mono uppercase tracking-widest ' + tierClass}>{tierLabel}</div>
          </div>
        </div>
        <ChevronDown className={'w-5 h-5 text-noir-fog transition-transform ' + (open ? 'rotate-180' : '')} />
      </button>
      {open && (
        <div className="mt-4 pt-4 border-t border-noir-fog/30 space-y-2">
          {ROWS.map(([k, label, max]) => {
            const v = score[k] as number;
            const pct = (v / max) * 100;
            return (
              <div key={k}>
                <div className="flex justify-between items-baseline text-xs mb-1">
                  <span className="text-noir-bone/80">{label}</span>
                  <span className="font-mono text-noir-fog">{v}/{max}</span>
                </div>
                <div className="h-1 bg-noir-black/60 rounded-full overflow-hidden">
                  <div className={'h-full ' + (pct >= 80 ? 'bg-noir-gold' : pct >= 50 ? 'bg-amber-500' : 'bg-noir-blood')} style={{ width: pct + '%' }} />
                </div>
              </div>
            );
          })}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-noir-fog/30 text-[11px] font-mono">
            <Stat k="Words" v={score.metrics.wordCount.toLocaleString()} />
            <Stat k="Flesch" v={score.metrics.flesch.toString()} />
            <Stat k="H2 / H3" v={`${score.metrics.h2Count} / ${score.metrics.h3Count}`} />
            <Stat k="Citations" v={score.metrics.citationCount.toString()} />
            <Stat k="Lists" v={score.metrics.listCount.toString()} />
            <Stat k="Tables" v={score.metrics.tableCount.toString()} />
            <Stat k="KW density" v={score.metrics.keywordDensityPct + '%'} />
            <Stat k="Repeat" v={(score.metrics.repetitionRatio * 100).toFixed(1) + '%'} />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-noir-black/40 px-2 py-1.5 rounded-sm">
      <div className="text-noir-fog uppercase text-[9px] tracking-wider">{k}</div>
      <div className="text-noir-bone">{v}</div>
    </div>
  );
}
