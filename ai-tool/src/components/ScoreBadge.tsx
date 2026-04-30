import { Gauge, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { ScoreBreakdown } from '@/lib/score';

interface Props { score: ScoreBreakdown; }

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
  const cls = tier === 'gold' ? 'text-bx-orange border-bx-orange' : tier === 'amber' ? 'text-amber-400 border-amber-400' : 'text-bx-red border-bx-red';
  const tag = tier === 'gold' ? 'Tale Worthy' : tier === 'amber' ? 'Needs Polish' : 'Rough Draft';
  return (
    <div className="bx-card p-4">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-4 text-left">
        <div className="flex items-center gap-3">
          <div className={'w-12 h-12 rounded-md border-2 flex items-center justify-center font-semibold text-xl ' + cls}>
            {score.total}
          </div>
          <div>
            <div className="flex items-center gap-2 text-bx-text font-medium text-sm">
              <Gauge className="w-3.5 h-3.5 text-bx-orange" /> Quality Score
            </div>
            <div className={'text-xs font-mono uppercase tracking-widest ' + cls}>{tag}</div>
          </div>
        </div>
        <ChevronDown className={'w-5 h-5 text-bx-mute transition-transform ' + (open ? 'rotate-180' : '')} />
      </button>
      {open && (
        <div className="mt-4 pt-4 border-t border-bx-line2 space-y-2">
          {ROWS.map(([k, label, max]) => {
            const v = score[k] as number;
            const pct = (v / max) * 100;
            return (
              <div key={k}>
                <div className="flex justify-between items-baseline text-xs mb-1">
                  <span className="text-bx-text">{label}</span>
                  <span className="font-mono text-bx-mute">{v}/{max}</span>
                </div>
                <div className="h-1 bg-bx-ink rounded-full overflow-hidden">
                  <div className={'h-full ' + (pct >= 80 ? 'bg-bx-orange' : pct >= 50 ? 'bg-amber-500' : 'bg-bx-red')} style={{ width: pct + '%' }} />
                </div>
              </div>
            );
          })}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-bx-line2 text-[11px] font-mono">
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
    <div className="bg-bx-ink px-2 py-1.5 rounded">
      <div className="text-bx-mute uppercase text-[9px] tracking-wider">{k}</div>
      <div className="text-bx-text">{v}</div>
    </div>
  );
}
