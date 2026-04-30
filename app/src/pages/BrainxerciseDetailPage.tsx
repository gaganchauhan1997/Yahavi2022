import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, Lightbulb, Loader2, RefreshCw, XCircle } from 'lucide-react';
import {
  fetchBrainxercise,
  checkBrainxercise,
  cellRefToRC,
  type HKBrainxDetail,
  type HKBrainxCheckResult,
} from '@/lib/hk-brainx';
import { useDocumentMeta } from '@/lib/useDocumentMeta';

/* x-data-spreadsheet sheet row format */
type XRow = { cells: Record<number, { text: string }> };

/* Convert our backend cells (Excel A1 notation) → x-data-spreadsheet rows */
function buildXSData(detail: HKBrainxDetail) {
  const rowsObj: Record<number, XRow> = {};
  const cells = detail.sheet.cells || {};
  Object.entries(cells).forEach(([ref, val]) => {
    const rc = cellRefToRC(ref);
    if (!rc) return;
    if (!rowsObj[rc.r]) rowsObj[rc.r] = { cells: {} };
    rowsObj[rc.r].cells[rc.c] = { text: val == null ? '' : String(val) };
  });
  return [
    {
      name: 'Sheet1',
      freeze: detail.sheet.freeze || 'A1',
      rows: { ...rowsObj, len: Math.max(detail.sheet.rows || 15, 15) },
      cols: { len: Math.max(detail.sheet.cols || 8, 8) },
    },
  ];
}

const DIFF_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  beginner:     { label: 'Beginner',     bg: 'bg-green-200',  text: 'text-green-900' },
  intermediate: { label: 'Intermediate', bg: 'bg-yellow-200', text: 'text-yellow-900' },
  advanced:     { label: 'Advanced',     bg: 'bg-orange-200', text: 'text-orange-900' },
  pro:          { label: 'Pro',          bg: 'bg-red-200',    text: 'text-red-900' },
};

export default function BrainxerciseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [detail, setDetail] = useState<HKBrainxDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<HKBrainxCheckResult | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [sheetReady, setSheetReady] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const xsRef = useRef<any>(null);

  useDocumentMeta({
    title: detail ? `${detail.title} — Brainxercise | Hackknow` : 'Brainxercise | Hackknow',
    description: detail?.question?.slice(0, 150) || 'Practice Excel-style problems in your browser.',
  });

  /* Fetch detail */
  useEffect(() => {
    if (!slug) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      setResult(null);
      setSheetReady(false);
      try {
        const d = await fetchBrainxercise(slug);
        if (!alive) return;
        setDetail(d);
        if (d.time_limit > 0) setSecondsLeft(d.time_limit);
      } catch (e) {
        if (alive) setErr((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  /* Lazy-mount x-data-spreadsheet once detail is ready */
  useEffect(() => {
    if (!detail || !containerRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        // Lazy load library + CSS only on this page
        const [{ default: Spreadsheet }] = await Promise.all([
          import('x-data-spreadsheet'),
          import('x-data-spreadsheet/dist/xspreadsheet.css' as string),
        ]);
        if (cancelled || !containerRef.current) return;

        // Clear any prior instance
        containerRef.current.innerHTML = '';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SS: any = Spreadsheet;
        const xs = new SS(containerRef.current, {
          mode: 'edit',
          showToolbar: true,
          showGrid: true,
          showContextmenu: true,
          view: {
            height: () => Math.min(window.innerHeight * 0.55, 520),
            width: () => containerRef.current?.clientWidth || 800,
          },
          row: { len: Math.max(detail.sheet.rows || 15, 15), height: 28 },
          col: { len: Math.max(detail.sheet.cols || 8, 8), width: 110, indexWidth: 50, minWidth: 60 },
        });
        xs.loadData(buildXSData(detail));
        xsRef.current = xs;
        setSheetReady(true);
      } catch (e) {
        console.error('[Brainxercise] Could not mount spreadsheet:', e);
        if (!cancelled) setErr('Could not load the spreadsheet editor. Refresh karo.');
      }
    })();

    return () => {
      cancelled = true;
      if (containerRef.current) containerRef.current.innerHTML = '';
      xsRef.current = null;
    };
  }, [detail]);

  /* Countdown timer */
  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0 || result) return;
    const t = setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, result]);

  /* Read all current cell values from x-data-spreadsheet */
  function collectCells(): Record<string, string> {
    const out: Record<string, string> = {};
    const xs = xsRef.current;
    if (!xs || typeof xs.getData !== 'function') return out;
    const data = xs.getData();
    const sheet = Array.isArray(data) ? data[0] : data;
    if (!sheet || !sheet.rows) return out;
    Object.entries(sheet.rows).forEach(([rk, rv]) => {
      if (rk === 'len') return;
      const r = parseInt(rk, 10);
      if (Number.isNaN(r)) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cells = (rv as any)?.cells || {};
      Object.entries(cells).forEach(([ck, cv]) => {
        const c = parseInt(ck, 10);
        if (Number.isNaN(c)) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const text = (cv as any)?.text;
        if (text === undefined || text === null || text === '') return;
        // Convert (r,c) → A1 notation
        let n = c + 1;
        let letters = '';
        while (n > 0) {
          const m = (n - 1) % 26;
          letters = String.fromCharCode(65 + m) + letters;
          n = Math.floor((n - 1) / 26);
        }
        out[`${letters}${r + 1}`] = String(text);
      });
    });
    return out;
  }

  async function handleSubmit() {
    if (!detail || !slug) return;
    setChecking(true);
    setResult(null);
    try {
      const cells = collectCells();
      const res = await checkBrainxercise(slug, cells);
      setResult(res);
      if (res.pass) setSecondsLeft(null);
    } catch (e) {
      setResult({ pass: false, correct: 0, total: 0, score: 0, wrong: [], hint: (e as Error).message });
    } finally {
      setChecking(false);
    }
  }

  function handleReset() {
    if (!detail || !xsRef.current) return;
    xsRef.current.loadData(buildXSData(detail));
    setResult(null);
    if (detail.time_limit > 0) setSecondsLeft(detail.time_limit);
  }

  const diff = detail ? DIFF_BADGE[detail.difficulty] || DIFF_BADGE.beginner : null;

  return (
    <div className="min-h-screen bg-[#fffbea]">
      {/* HERO */}
      <div className="bg-hack-black text-white py-8">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <Link to="/brainxercise" className="inline-flex items-center gap-2 text-hack-yellow hover:text-hack-orange mb-3 text-sm">
              <ArrowLeft className="w-4 h-4" /> All Brainxercises
            </Link>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {diff && (
                <span className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded ${diff.bg} ${diff.text}`}>
                  {diff.label}
                </span>
              )}
              {detail?.categories.map((c) => (
                <span key={c} className="text-[11px] font-mono bg-white/10 text-white/70 px-2 py-1 rounded">
                  {c}
                </span>
              ))}
              {secondsLeft !== null && secondsLeft > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono bg-hack-yellow text-hack-black rounded ml-auto">
                  <Clock className="w-3 h-3" /> {secondsLeft}s
                </span>
              )}
              {secondsLeft !== null && secondsLeft <= 0 && !result?.pass && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono bg-red-200 text-red-900 rounded ml-auto">
                  Time's up — submit ya reset karo
                </span>
              )}
            </div>
            <h1 className="font-display font-bold text-2xl lg:text-3xl mb-1">
              {loading ? 'Loading…' : detail?.title || 'Not found'}
            </h1>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-6xl mx-auto">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-hack-black/30" />
            </div>
          )}
          {err && !loading && (
            <div className="bg-red-50 border-[3px] border-red-500 rounded-2xl p-6 text-red-900 shadow-[5px_5px_0_#000] mb-6">
              <p className="font-bold mb-1">Problem.</p>
              <p className="text-sm font-mono break-all">{err}</p>
            </div>
          )}

          {detail && !loading && (
            <>
              {/* Question */}
              <div className="bg-white border-[3px] border-hack-black rounded-2xl p-5 shadow-[5px_5px_0_#000] mb-5">
                <p className="text-[11px] font-mono uppercase tracking-widest text-hack-black/55 mb-2">
                  Question
                </p>
                <p className="text-base lg:text-lg font-medium leading-relaxed whitespace-pre-wrap">
                  {detail.question || 'No question text provided.'}
                </p>
              </div>

              {/* Spreadsheet */}
              <div className="bg-white border-[3px] border-hack-black rounded-2xl shadow-[5px_5px_0_#000] mb-5 overflow-hidden">
                {!sheetReady && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-hack-black/30 mr-2" />
                    <span className="text-sm text-hack-black/55 font-mono">Loading spreadsheet…</span>
                  </div>
                )}
                <div ref={containerRef} className="w-full" style={{ minHeight: sheetReady ? 0 : 0 }} />
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 mb-5">
                <button
                  onClick={handleSubmit}
                  disabled={checking || !sheetReady}
                  className="px-6 py-3 bg-hack-black text-hack-white font-bold rounded-full hover:bg-hack-black/80 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {checking ? 'Checking…' : 'Submit Answer'}
                </button>
                <button
                  onClick={handleReset}
                  disabled={!sheetReady}
                  className="px-5 py-3 bg-white text-hack-black font-bold rounded-full border-2 border-hack-black hover:bg-hack-yellow/30 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Reset Sheet
                </button>
              </div>

              {/* Result */}
              {result && (
                <div
                  className={`border-[3px] rounded-2xl p-5 shadow-[5px_5px_0_#000] mb-6 ${
                    result.pass ? 'bg-green-100 border-green-700' : 'bg-red-50 border-red-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result.pass ? (
                      <CheckCircle2 className="w-7 h-7 text-green-700 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-7 h-7 text-red-600 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-display font-bold text-xl">
                        {result.pass ? 'Bilkul sahi!' : 'Almost. Try again.'}
                      </p>
                      <p className="text-sm font-mono mt-1">
                        Score: {result.score}% · Correct {result.correct} / {result.total}
                      </p>
                      {result.wrong.length > 0 && (
                        <p className="text-xs font-mono mt-2 text-hack-black/70">
                          Wrong cells: {result.wrong.join(', ')}
                        </p>
                      )}
                      {result.hint && (
                        <div className="mt-3 inline-flex items-start gap-2 bg-yellow-50 border border-yellow-300 rounded-lg px-3 py-2">
                          <Lightbulb className="w-4 h-4 text-yellow-700 mt-0.5" />
                          <p className="text-sm">{result.hint}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              {detail.description && (
                <div className="bg-white border border-hack-black/15 rounded-xl p-5 mb-8">
                  <p className="text-[11px] font-mono uppercase tracking-widest text-hack-black/55 mb-2">
                    About this exercise
                  </p>
                  <div
                    className="prose prose-sm max-w-none text-hack-black/80"
                    dangerouslySetInnerHTML={{ __html: detail.description }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
