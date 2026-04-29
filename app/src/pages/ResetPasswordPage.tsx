import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft, Zap, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WP_REST_BASE } from '@/lib/api-base';

const ResetPasswordPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const key = params.get('key') ?? '';
  const login = params.get('login') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const linkValid = useMemo(() => Boolean(key && login), [key, login]);
  const passOk = password.length >= 8 && password === confirm;

  useEffect(() => {
    if (!linkValid) setError('This reset link is missing required parameters. Please request a new one.');
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
      const data = await res.json().catch(() => ({})) as Record<string, unknown>;
      if (res.ok && data?.success) {
        setDone(true);
        setTimeout(() => navigate('/login'), 3000);
      } else {
        const msg = typeof data?.message === 'string' ? data.message : `Reset failed (${res.status})`;
        setError(msg);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-hack-black via-hack-black to-hack-magenta/20 flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-hack-yellow/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-hack-magenta/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-hack-yellow to-hack-orange flex items-center justify-center shadow-lg shadow-hack-yellow/20 group-hover:scale-105 transition-transform">
              <Zap className="w-6 h-6 text-hack-black" />
            </div>
            <span className="font-display font-bold text-2xl text-white">HACKKNOW</span>
          </Link>
          <p className="text-white/60 mt-2 text-sm">Choose a new password</p>
        </div>

        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/10">
          {done ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h1 className="font-display font-bold text-2xl text-white mb-3">Password updated</h1>
              <p className="text-white/60 text-sm mb-6">Redirecting to sign in&hellip;</p>
              <Link to="/login" className="inline-flex items-center gap-2 text-hack-yellow hover:text-hack-orange transition-colors text-sm font-medium">
                <ArrowLeft className="w-4 h-4" />Go to sign in now
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="font-display font-bold text-2xl text-white text-center mb-2">Reset password</h1>
                <p className="text-white/60 text-sm text-center">
                  {linkValid ? <>For account <span className="text-hack-yellow font-medium">{login}</span></> : 'Invalid reset link'}
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm text-white/80 font-medium flex items-center gap-2">
                    <Lock className="w-4 h-4 text-hack-yellow" />New password
                  </label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters" minLength={8} required disabled={!linkValid}
                    className="w-full bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-xl h-12 pl-4 focus:border-hack-yellow focus:ring-1 focus:ring-hack-yellow" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-white/80 font-medium flex items-center gap-2">
                    <Lock className="w-4 h-4 text-hack-yellow" />Confirm password
                  </label>
                  <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter password" minLength={8} required disabled={!linkValid}
                    className="w-full bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-xl h-12 pl-4 focus:border-hack-yellow focus:ring-1 focus:ring-hack-yellow" />
                  {confirm && !passOk && <p className="text-xs text-red-300">Passwords must match and be at least 8 characters.</p>}
                </div>

                <Button type="submit" disabled={isLoading || !linkValid || !passOk}
                  className="w-full h-12 bg-gradient-to-r from-hack-yellow to-hack-orange hover:from-hack-orange hover:to-hack-magenta text-hack-black font-bold rounded-xl shadow-lg shadow-hack-yellow/20">
                  {isLoading ? 'Updating…' : (<span className="flex items-center gap-2">Update password<ArrowRight className="w-5 h-5" /></span>)}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/forgot-password" className="text-sm text-white/50 hover:text-white/80 transition-colors">Need a new link? Request again</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
