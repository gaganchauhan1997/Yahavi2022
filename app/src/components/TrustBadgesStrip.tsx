import { FileSpreadsheet, Download, Globe2, Mail, ShieldCheck, ExternalLink } from 'lucide-react';

const BADGES = [
  { icon: ShieldCheck, label: 'License included', sub: 'Read the usage terms' },
  { icon: Download, label: 'Direct downloads', sub: 'Free Excel collection' },
  { icon: Mail, label: 'Email support', sub: 'team@hackknow.com' },
  { icon: ExternalLink, label: 'Source attribution', sub: 'Original authors credited' },
  { icon: FileSpreadsheet, label: 'Excel workbooks', sub: 'Editable files' },
  { icon: Globe2,      label: 'Made in India',     sub: 'Built for the World' },
];

export default function TrustBadgesStrip({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`bg-white border-y-[2px] border-hack-black/10 ${compact ? 'py-3' : 'py-5 sm:py-6'}`}>
      <div className="max-w-7xl mx-auto px-4">
        <ul className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4`}>
          {BADGES.map(({ icon: Icon, label, sub }) => (
            <li key={label} className="flex items-center gap-2.5 group">
              <span className="shrink-0 w-9 h-9 rounded-lg bg-hack-yellow/40 border border-hack-black/10 flex items-center justify-center group-hover:bg-hack-yellow transition">
                <Icon className="w-4.5 h-4.5 text-hack-black" />
              </span>
              <div className="min-w-0">
                <div className="font-display font-bold text-xs sm:text-sm text-hack-black leading-tight truncate">{label}</div>
                {!compact && <div className="text-[10px] sm:text-xs text-hack-black/70 leading-tight truncate">{sub}</div>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
