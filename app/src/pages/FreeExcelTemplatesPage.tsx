import { useState } from 'react';
import { Download, ExternalLink, FileSpreadsheet } from 'lucide-react';
import templates from '@/content/free-excel-templates.json';
import { useDocumentMeta } from '@/lib/useDocumentMeta';
const categories = ['All', ...new Set(templates.map(file => file.category))];
export default function FreeExcelTemplatesPage() {
  const [category, setCategory] = useState('All');
  useDocumentMeta({ title: 'Free Excel Templates for Commercial Use | HackKnow', description: 'Download free Excel templates for finance, career and business planning. MIT-licensed workbooks with source attribution and the original license included.' });
  return (
    <div className="pt-28 lg:pt-36 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <header className="max-w-3xl mb-9">
        <p className="font-mono text-xs uppercase tracking-widest text-hack-magenta mb-3">Free resources · Commercial use permitted</p>
        <h1 className="font-display font-black text-4xl lg:text-5xl mb-5">Free Excel templates.<br />Useful from the first sheet.</h1>
        <p className="text-hack-black/75 text-lg leading-relaxed">Practical workbooks for finance, career and business planning. No account or payment required. Every download includes a HackKnow-branded Excel workbook with our website link, the original MIT license and source attribution.</p>
        <p className="mt-4 text-sm text-hack-black/70">Commercial use and redistribution are permitted under the included license. Keep the copyright and license notice when sharing. These are third-party templates, adapted with a HackKnow welcome tab and supplied as-is; review sample values and formulas before using them for business or financial decisions.</p>
      </header>
      <div role="group" aria-label="Filter Excel templates by category" className="flex flex-wrap gap-3 mb-8">
        {categories.map(value => <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)} className={`rounded-full border-2 border-hack-black px-5 py-2 text-sm font-bold ${category === value ? 'bg-hack-black text-white' : 'bg-white text-hack-black'}`}>{value}</button>)}
      </div>
      <p className="text-sm text-hack-black/60 mb-5" aria-live="polite">{templates.filter(file => category === 'All' || file.category === category).length} templates</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.filter(file => category === 'All' || file.category === category).map(file => (
          <article key={file.slug} className="rounded-2xl bg-white border-[3px] border-hack-black shadow-[4px_4px_0_0_#1A1A1A] p-6 flex flex-col">
            <FileSpreadsheet className="w-8 h-8 text-hack-magenta mb-4" aria-hidden="true" />
            <p className="text-xs font-mono uppercase text-hack-black/60 mb-2">{file.category} · Free download</p>
            <h2 className="font-display font-bold text-xl mb-3">{file.title}</h2>
            <p className="text-sm text-hack-black/75 leading-relaxed mb-4">{file.description}</p>
            <p className="text-xs text-hack-black/60 mb-3">By {file.author} · MIT license · {Math.ceil(file.bytes / 1024)} KB</p>
            <div className="flex gap-4 text-xs mb-5"><a href={file.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 inline-flex gap-1 items-center">Original source <ExternalLink className="w-3 h-3" /></a><a href={file.licenseSource} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">License</a></div>
            <a href={file.download} download className="mt-auto inline-flex items-center justify-center gap-2 bg-hack-yellow text-hack-black border-2 border-hack-black rounded-xl p-3 font-bold text-sm"><Download className="w-4 h-4" /> Download Excel + license (ZIP)</a>
          </article>
        ))}
      </div>
    </div>
  );
}
