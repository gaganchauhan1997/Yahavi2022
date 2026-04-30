import * as Icons from 'lucide-react';
import { TEMPLATE_LIST, type TemplateId } from '@/lib/prompts';

interface Props {
  selected: TemplateId;
  onSelect: (id: TemplateId) => void;
}

export default function TemplatePicker({ selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {TEMPLATE_LIST.map(tpl => {
        const Icon = (Icons as unknown as Record<string, React.FC<{ className?: string }>>)[tpl.icon] || Icons.FileText;
        const active = selected === tpl.id;
        return (
          <button
            key={tpl.id}
            onClick={() => onSelect(tpl.id)}
            className={
              'text-left p-4 border-2 rounded-sm transition-all duration-200 ' +
              (active
                ? 'border-noir-gold bg-noir-gold/10 shadow-[3px_3px_0_0_rgba(212,175,55,0.4)]'
                : 'border-noir-fog/40 hover:border-noir-bone/60 bg-noir-ash/40')
            }
          >
            <div className="flex items-start gap-3">
              <div className={
                'w-9 h-9 rounded-sm border flex items-center justify-center shrink-0 ' +
                (active ? 'border-noir-gold bg-noir-gold/20' : 'border-noir-fog/50 bg-noir-black/40')
              }>
                <Icon className={'w-4 h-4 ' + (active ? 'text-noir-gold' : 'text-noir-bone/80')} />
              </div>
              <div className="min-w-0">
                <div className={'font-display font-semibold text-sm leading-tight mb-1 ' + (active ? 'text-noir-gold' : 'text-noir-bone')}>
                  {tpl.label}
                </div>
                <div className="text-[11px] text-noir-bone/65 leading-snug">
                  {tpl.pitch}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-noir-fog mt-1.5">
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
