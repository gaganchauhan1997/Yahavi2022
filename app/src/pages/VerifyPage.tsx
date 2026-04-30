import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, Loader2, Send, ShieldCheck, Upload } from 'lucide-react';
import { fetchVerifyStatus, submitVerify, type HKVerifyMe } from '@/lib/hk-content';
import { isAuthenticated } from '@/lib/auth';

const STATUS_BADGE: Record<string, { c: string; l: string; i: typeof Clock }> = {
  none:     { c: 'bg-white text-hack-black border-hack-black',           l: 'Not submitted', i: Upload },
  pending:  { c: 'bg-amber-100 text-amber-900 border-amber-400',         l: 'Under review',  i: Clock },
  approved: { c: 'bg-emerald-100 text-emerald-900 border-emerald-400',   l: 'Approved',      i: CheckCircle2 },
  rejected: { c: 'bg-red-100 text-red-900 border-red-400',               l: 'Rejected',      i: AlertCircle },
};

export default function VerifyPage() {
  const authed = isAuthenticated();
  const [me, setMe] = useState<HKVerifyMe | null>(null);
  const [loading, setLoading] = useState(true);

  const [type, setType] = useState<'mis' | 'student'>('mis');
  const [proofType, setProofType] = useState<'linkedin' | 'id' | 'email' | 'other'>('linkedin');
  const [proofUrl, setProofUrl] = useState('');
  const [proofImage, setProofImage] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!authed) { setLoading(false); return; }
    let alive = true;
    (async () => {
      try { const r = await fetchVerifyStatus(); if (alive) setMe(r); }
      catch { /* ignore — show form */ }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [authed]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setErrMsg('Max 5 MB please.'); return; }
    const r = new FileReader();
    r.onload = ev => setProofImage(String(ev.target?.result || ''));
    r.readAsDataURL(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrMsg(null); setOkMsg(null);
    if (!proofUrl && !proofImage) { setErrMsg('Add either a profile/proof URL or upload an image.'); return; }
    setSubmitting(true);
    try {
      const r = await submitVerify({ type, proof_type: proofType, proof_url: proofUrl || undefined, proof_image: proofImage || undefined, notes: notes || undefined });
      setOkMsg('Submitted. We usually review within a few hours — you\'ll be notified by email.');
      setMe(prev => ({ ...(prev || { status: 'none' }), status: r.status as HKVerifyMe['status'], type, proof_type: proofType, submitted_at: new Date().toISOString() }));
    } catch (e) {
      setErrMsg((e as Error).message);
    } finally { setSubmitting(false); }
  }

  const status = me?.status || 'none';
  const badge = STATUS_BADGE[status];

  return (
    <div className="min-h-screen bg-[#fffbea]">
      <div className="bg-hack-black text-white py-12 lg:py-16">
        <div className="w-full px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-hack-yellow hover:text-hack-orange mb-5 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-hack-yellow/15 border border-hack-yellow/30 text-hack-yellow text-xs font-mono uppercase tracking-widest rounded-full mb-4">
            <ShieldCheck className="w-3.5 h-3.5" /> One-time verification
          </div>
          <h1 className="font-display font-bold text-4xl lg:text-5xl mb-3">Get Verified</h1>
          <p className="text-white/65 text-base">
            MIS pros unlock 90% off MIS templates · Students unlock 6 months FREE on courses.
          </p>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 max-w-3xl mx-auto">
        {!authed ? (
          <div className="bg-white border-[3px] border-hack-black rounded-2xl p-6 shadow-[5px_5px_0_#000] text-center">
            <p className="mb-4 text-hack-black/75">Sign in first to submit verification.</p>
            <Link to="/login?next=/verify" className="inline-flex items-center gap-2 bg-hack-yellow border-[3px] border-hack-black px-6 py-3 rounded-full font-display font-bold uppercase tracking-wide text-sm shadow-[4px_4px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition">
              Sign in
            </Link>
          </div>
        ) : loading ? (
          <div className="flex items-center gap-2 text-hack-black/60"><Loader2 className="w-4 h-4 animate-spin" /> Checking status…</div>
        ) : (
          <>
            {/* Current status */}
            <div className={`mb-6 inline-flex items-center gap-2 px-3 py-1.5 border-[2px] rounded-full text-sm font-bold ${badge.c}`}>
              <badge.i className="w-4 h-4" /> {badge.l}
              {me?.type && <span className="text-xs font-mono uppercase opacity-70">· {me.type}</span>}
            </div>

            {status === 'approved' ? (
              <div className="bg-emerald-50 border-[3px] border-emerald-400 rounded-2xl p-6 shadow-[5px_5px_0_#10b981]">
                <h3 className="font-display font-bold text-xl mb-2">You're all set</h3>
                <p className="text-emerald-900/85 text-sm">
                  Your discount auto-applies at checkout. {me?.verified_until && <>Valid until <strong>{new Date(me.verified_until).toLocaleDateString('en-IN')}</strong>.</>}
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="bg-white border-[3px] border-hack-black rounded-2xl p-6 shadow-[6px_6px_0_#000] space-y-5">
                {status === 'pending' && (
                  <div className="bg-amber-50 border-[2px] border-amber-300 rounded-xl p-3 text-amber-900 text-sm">
                    Your previous submission is still being reviewed. You can resubmit if needed.
                  </div>
                )}
                {status === 'rejected' && (
                  <div className="bg-red-50 border-[2px] border-red-300 rounded-xl p-3 text-red-900 text-sm">
                    Last submission was rejected. Try again with clearer proof.
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold mb-2">I am a…</label>
                  <div className="flex gap-2">
                    {(['mis','student'] as const).map(t => (
                      <button key={t} type="button" onClick={() => setType(t)}
                        className={`flex-1 px-4 py-3 rounded-xl border-[2.5px] text-sm font-bold uppercase tracking-wider transition ${type === t ? 'bg-hack-yellow border-hack-black shadow-[3px_3px_0_#000]' : 'bg-white border-hack-black/30 text-hack-black/60'}`}>
                        {t === 'mis' ? 'MIS Pro (90% off)' : 'Student (6mo free)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Proof type</label>
                  <select value={proofType} onChange={e => setProofType(e.target.value as typeof proofType)}
                    className="w-full px-4 py-3 rounded-xl border-[2.5px] border-hack-black bg-white text-sm font-medium">
                    <option value="linkedin">LinkedIn profile URL</option>
                    <option value="id">College / Company ID</option>
                    <option value="email">Work / college email</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {(proofType === 'linkedin' || proofType === 'email' || proofType === 'other') && (
                  <div>
                    <label className="block text-sm font-bold mb-2">Profile / proof URL</label>
                    <input type="url" placeholder="https://linkedin.com/in/yourname"
                      value={proofUrl} onChange={e => setProofUrl(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-[2.5px] border-hack-black bg-white text-sm" />
                  </div>
                )}

                {(proofType === 'id' || proofType === 'other') && (
                  <div>
                    <label className="block text-sm font-bold mb-2">Upload ID image (max 5 MB)</label>
                    <input type="file" accept="image/*" onChange={onFile}
                      className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-[2px] file:border-hack-black file:bg-hack-yellow file:font-bold file:cursor-pointer" />
                    {proofImage && <img src={proofImage} alt="proof preview" className="mt-3 max-h-48 rounded-xl border-[2px] border-hack-black" />}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold mb-2">Anything else? <span className="font-normal text-hack-black/55">(optional)</span></label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                    className="w-full px-4 py-3 rounded-xl border-[2.5px] border-hack-black bg-white text-sm" />
                </div>

                {errMsg && <div className="bg-red-50 border-[2px] border-red-300 rounded-xl p-3 text-red-900 text-sm">{errMsg}</div>}
                {okMsg  && <div className="bg-emerald-50 border-[2px] border-emerald-300 rounded-xl p-3 text-emerald-900 text-sm">{okMsg}</div>}

                <button type="submit" disabled={submitting}
                  className="inline-flex items-center gap-2 bg-hack-yellow border-[3px] border-hack-black px-7 py-3.5 rounded-full font-display font-bold uppercase tracking-wide text-sm text-hack-black shadow-[5px_5px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[3px] hover:translate-y-[3px] transition disabled:opacity-60 disabled:cursor-not-allowed">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <><Send className="w-4 h-4" /> Submit for review</>}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
