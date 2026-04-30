import * as Icons from 'lucide-react';
import { TEMPLATE_LIST, type TemplateId } from '@/lib/prompts';

interface Props {
  selected: TemplateId;
  onSelect: (id: TemplateId) => void;
}

export default function TemplatePicker({ selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {TEMPLATE_LIST.map(tpl => {
        const Icon = (Icons as unknown as Record<string, React.FC<{ className?: string }>>)[tpl.icon] || Icons.FileText;
        const active = selected === tpl.id;
        return (
          <button
            key={tpl.id}
            onClick={() => onSelect(tpl.id)}
            className={
              'text-left p-3 rounded-md border transition-colors ' +
              (active
                ? 'border-bx-orange bg-bx-orangeDim/30'
                : 'border-bx-line2 hover:border-bx-orange/60 bg-bx-ink')
            }
          >
            <div className="flex items-start gap-3">
              <div className={
                'w-8 h-8 rounded-md border flex items-center justify-center shrink-0 ' +
                (active ? 'border-bx-orange bg-bx-orangeDim' : 'border-bx-line2 bg-bx-panel')
              }>
                <Icon className={'w-4 h-4 ' + (active ? 'text-bx-orange' : 'text-bx-dim')} />
              </div>
              <div className="min-w-0">
                <div className={'font-medium text-sm ' + (active ? 'text-bx-orange' : 'text-bx-text')}>
                  {tpl.label}
                </div>
                <div className="text-[11px] text-bx-mute leading-snug mt-0.5">{tpl.pitch}</div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-bx-mute mt-1">
                  {tpl.targetWords[0]}–{tpl.targetWords[1]} words
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
