import { useState, useMemo, useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Copy, Download, Check, Eye, Code, FileDown } from 'lucide-react';

interface Props {
  markdown: string;
  onChange: (md: string) => void;
  fileBaseName: string;
}

type View = 'preview' | 'markdown';

export default function OutputEditor({ markdown, onChange, fileBaseName }: Props) {
  const [view, setView] = useState<View>('preview');
  const [copied, setCopied] = useState<'md' | 'html' | null>(null);

  marked.setOptions({ gfm: true, breaks: false });
  const html = useMemo(() => DOMPurify.sanitize(marked.parse(markdown) as string), [markdown]);
  const wc = (markdown.match(/\b[\w']+\b/g) || []).length;

  const copy = async (kind: 'md' | 'html') => {
    if (kind === 'html') {
      try {
        const blob = new Blob([html], { type: 'text/html' });
        const data = [new ClipboardItem({ 'text/html': blob, 'text/plain': new Blob([markdown], { type: 'text/plain' }) })];
        await navigator.clipboard.write(data);
      } catch { await navigator.clipboard.writeText(markdown); }
    } else {
      await navigator.clipboard.writeText(markdown);
    }
    setCopied(kind);
    setTimeout(() => setCopied(null), 1400);
  };

  const download = (kind: 'md' | 'html' | 'txt') => {
    let content: string, mime: string, ext: string;
    if (kind === 'md') { content = markdown; mime = 'text/markdown'; ext = 'md'; }
    else if (kind === 'html') {
      content = `<!doctype html><html><head><meta charset="utf-8"><title>${fileBaseName}</title>
<style>body{font-family:Georgia,serif;max-width:760px;margin:2rem auto;padding:0 1rem;line-height:1.65;color:#222}h1,h2,h3{font-family:Helvetica,Arial,sans-serif}h2{border-bottom:1px solid #ddd;padding-bottom:.3rem;margin-top:2rem}pre{background:#f4f4f4;padding:1rem;overflow:auto}code{background:#f4f4f4;padding:.1rem .3rem;border-radius:3px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:.5rem}th{background:#f4f4f4;text-align:left}blockquote{border-left:3px solid #ff6b00;padding-left:1rem;color:#555;margin:1rem 0}</style>
</head><body>${html}</body></html>`;
      mime = 'text/html'; ext = 'html';
    } else {
      content = markdown.replace(/[#*_`>~\[\]()|]/g, '').replace(/\n{3,}/g, '\n\n');
      mime = 'text/plain'; ext = 'txt';
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${fileBaseName}.${ext}`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  useEffect(() => {
    if (view !== 'markdown') return;
    const el = document.getElementById('md-editor') as HTMLTextAreaElement | null;
    if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
  }, [view, markdown]);

  return (
    <div className="bx-card overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border-b border-bx-line bg-bx-ink">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('preview')}
            className={'bx-btn-ghost flex items-center gap-1.5 ' + (view === 'preview' ? 'border-bx-orange text-bx-orange' : '')}
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>
          <button
            onClick={() => setView('markdown')}
            className={'bx-btn-ghost flex items-center gap-1.5 ' + (view === 'markdown' ? 'border-bx-orange text-bx-orange' : '')}
          >
            <Code className="w-3.5 h-3.5" /> Markdown
          </button>
          <span className="font-mono text-[10px] text-bx-mute uppercase tracking-wider ml-2">{wc.toLocaleString()} words</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => copy('md')} className="bx-btn-ghost flex items-center gap-1.5">
            {copied === 'md' ? <Check className="w-3.5 h-3.5 text-bx-orange" /> : <Copy className="w-3.5 h-3.5" />}
            Copy MD
          </button>
          <button onClick={() => copy('html')} className="bx-btn-ghost flex items-center gap-1.5">
            {copied === 'html' ? <Check className="w-3.5 h-3.5 text-bx-orange" /> : <Copy className="w-3.5 h-3.5" />}
            Copy Rich
          </button>
          <div className="relative group">
            <button className="bx-btn-ghost flex items-center gap-1.5">
              <FileDown className="w-3.5 h-3.5" /> Export ▾
            </button>
            <div className="absolute right-0 top-full mt-1 bg-bx-panel border border-bx-line2 rounded-md shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-10 min-w-[140px]">
              {(['md', 'html', 'txt'] as const).map(k => (
                <button
                  key={k}
                  onClick={() => download(k)}
                  className="w-full text-left px-3 py-2 text-xs font-mono uppercase tracking-wider hover:bg-bx-orangeDim hover:text-bx-orange text-bx-text flex items-center gap-2"
                >
                  <Download className="w-3 h-3" /> .{k}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {view === 'preview' ? (
        <div className="bx-prose p-5 sm:p-7 max-h-[70vh] overflow-y-auto" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <textarea
          id="md-editor"
          value={markdown}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-bx-ink text-bx-text font-mono text-sm p-5 leading-relaxed border-0 focus:outline-none focus:ring-0 min-h-[400px] resize-none"
          spellCheck={false}
        />
      )}
    </div>
  );
}
