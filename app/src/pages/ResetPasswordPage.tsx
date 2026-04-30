import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Lock,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { WP_REST_BASE } from '@/lib/api-base';

const ResetPasswordPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const key = params.get('key') ?? '';
  const login = params.get('login') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const linkValid = useMemo(() => Boolean(key && login), [key, login]);
  const passOk = password.length >= 8 && password === confirm;

  useEffect(() => {
    if (!linkValid)
      setError(
        'This reset link is missing required parameters. Please request a new one.',
      );
  }, [linkValid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkValid || !passOk) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${WP_REST_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ key, login, password }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (res.ok && data?.success) {
        setDone(true);
        setTimeout(() => navigate('/login'), 3000);
      } else {
        const msg =
          typeof data?.message === 'string'
            ? data.message
            : `Reset failed (${res.status})`;
        setError(msg);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /* ---------- shared neobrutal classes ---------- */
  const neoCard =
    'bg-white border-[3px] border-hack-black rounded-2xl shadow-[6px_6px_0_0_#0A0A0A]';
  const neoInput =
    'w-full h-12 pl-11 pr-12 bg-white border-[2.5px] border-hack-black rounded-xl text-hack-black placeholder:text-hack-black/40 focus:outline-none focus:bg-hack-yellow/10 focus:shadow-[3px_3px_0_0_#0A0A0A] transition-all font-medium';
  const neoBtn =
    'w-full h-12 inline-flex items-center justify-center gap-2 bg-hack-yellow border-[3px] border-hack-black rounded-xl shadow-[5px_5px_0_0_#0A0A0A] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0A0A0A] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all font-display font-black text-base text-hack-black uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[5px_5px_0_0_#0A0A0A]';

  return (
    <div className="min-h-screen bg-hack-white pt-24 pb-20 relative overflow-hidden">
      {/* faint brutal grid backdrop */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#0A0A0A 1px, transparent 1px), linear-gradient(90deg, #0A0A0A 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="w-full px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-md mx-auto">
          {/* back chip */}
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 text-xs font-mono uppercase tracking-widest text-hack-black bg-hack-yellow border-[2px] border-hack-black rounded-md shadow-[2px_2px_0_0_#0A0A0A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.75} /> Back to sign in
          </Link>

          {/* heading w/ sparkle sticker */}
          <div className="relative inline-block mb-3">
            <span className="absolute -top-3 -right-6 sm:-right-10 z-10 inline-flex items-center gap-1 bg-hack-magenta text-white font-display font-black text-[11px] uppercase tracking-widest px-2.5 py-1 rounded-md border-[2px] border-hack-black shadow-[3px_3px_0_0_#0A0A0A] -rotate-6">
              <Sparkles className="w-3 h-3" strokeWidth={3} /> Fresh start
            </span>
            <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight text-hack-black leading-none">
              Reset <span className="text-hack-magenta">password</span>.
            </h1>
          </div>

          <p className="mt-4 mb-8 text-base text-hack-black/70 font-medium">
            {linkValid ? (
              <>
                For account{' '}
                <span className="bg-hack-yellow px-1.5 py-0.5 border-[1.5px] border-hack-black rounded font-bold text-hack-black">
                  {login}
                </span>
              </>
            ) : (
              'Invalid or expired reset link.'
            )}
          </p>

          {/* main card */}
          <div className={`${neoCard} p-6 sm:p-8`}>
            {done ? (
              <div className="text-center py-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-hack-yellow border-[3px] border-hack-black shadow-[4px_4px_0_0_#0A0A0A] mb-5">
                  <CheckCircle2
                    className="w-9 h-9 text-hack-black"
                    strokeWidth={3}
                  />
                </div>
                <h2 className="font-display font-black text-2xl text-hack-black mb-2 uppercase">
                  Password updated
                </h2>
                <p className="text-hack-black/60 text-sm mb-6 font-medium">
                  Redirecting to sign in&hellip;
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-hack-black text-hack-yellow border-[2.5px] border-hack-black rounded-lg shadow-[3px_3px_0_0_#FFD93D] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#FFD93D] transition-all font-bold text-sm uppercase tracking-wider"
                >
                  <ArrowRight className="w-4 h-4" strokeWidth={3} /> Sign in now
                </Link>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-5 p-3 rounded-lg bg-hack-magenta/10 border-[2px] border-hack-magenta text-hack-magenta text-sm font-semibold flex items-start gap-2">
                    <AlertCircle
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                      strokeWidth={2.75}
                    />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* New password */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-hack-black font-bold">
                      <Lock className="w-3.5 h-3.5" strokeWidth={3} /> New password
                    </label>
                    <div className="relative">
                      <KeyRound
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-hack-black/60"
                        strokeWidth={2.5}
                      />
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        minLength={8}
                        required
                        disabled={!linkValid}
                        className={neoInput}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-hack-black/60 hover:text-hack-black"
                        aria-label={showPw ? 'Hide password' : 'Show password'}
                      >
                        {showPw ? (
                          <EyeOff className="w-4 h-4" strokeWidth={2.5} />
                        ) : (
                          <Eye className="w-4 h-4" strokeWidth={2.5} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-hack-black font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" strokeWidth={3} /> Confirm
                      password
                    </label>
                    <div className="relative">
                      <KeyRound
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-hack-black/60"
                        strokeWidth={2.5}
                      />
                      <input
                        type={showCf ? 'text' : 'password'}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="Re-enter password"
                        minLength={8}
                        required
                        disabled={!linkValid}
                        className={neoInput}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCf((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-hack-black/60 hover:text-hack-black"
                        aria-label={showCf ? 'Hide password' : 'Show password'}
                      >
                        {showCf ? (
                          <EyeOff className="w-4 h-4" strokeWidth={2.5} />
                        ) : (
                          <Eye className="w-4 h-4" strokeWidth={2.5} />
                        )}
                      </button>
                    </div>
                    {confirm && !passOk && (
                      <p className="text-xs text-hack-magenta font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" strokeWidth={3} />
                        Passwords must match and be at least 8 characters.
                      </p>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isLoading || !linkValid || !passOk}
                    className={neoBtn}
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-[2.5px] border-hack-black border-t-transparent rounded-full animate-spin" />
                        Updating&hellip;
                      </>
                    ) : (
                      <>
                        Update password
                        <ArrowRight className="w-5 h-5" strokeWidth={3} />
                      </>
                    )}
                  </button>
                </form>

                {/* foot link */}
                <div className="mt-6 pt-5 border-t-[2px] border-dashed border-hack-black/20 text-center">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-hack-black/70 hover:text-hack-black font-bold underline decoration-hack-yellow decoration-[3px] underline-offset-4 hover:decoration-hack-magenta transition-colors"
                  >
                    Need a new link? Request again
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* tiny brutal footnote */}
          <p className="mt-6 text-center text-xs font-mono uppercase tracking-widest text-hack-black/50">
            Secured by HackKnow &middot; <span className="text-hack-magenta">team@hackknow.com</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
