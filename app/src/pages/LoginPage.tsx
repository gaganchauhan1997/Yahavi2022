import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Zap, ArrowRight, Mail, Lock } from 'lucide-react';
import { loginWithWordPress, loginWithGoogleToken } from '@/lib/auth';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: object) => void;
          prompt: (cb?: (n: object) => void) => void;
        };
        oauth2: {
          initTokenClient: (cfg: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
        };
      };
    };
  }
}

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  // Safe redirect: only same-origin internal paths (must start with '/' but not '//')
  const next = (() => {
    const raw = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : ''
    ).get('next') || '';
    return raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/\\')
      ? raw
      : '/account';
  })();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await loginWithWordPress(email, password);
      navigate(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (!window.google?.accounts?.oauth2) {
      setError('Google Sign-In is not available. Please try again.');
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: '936562781728-0tds5q2uqh2qft6bq76s0airvv117ig5.apps.googleusercontent.com',
      scope: 'email profile openid',
      callback: async (resp) => {
        if (!resp.access_token) {
          setError('Google sign-in was cancelled or failed.');
          return;
        }
        setIsLoading(true);
        setError('');
        try {
          await loginWithGoogleToken(resp.access_token);
          navigate(next);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Google sign-in failed');
        } finally {
          setIsLoading(false);
        }
      },
    });
    client.requestAccessToken({ prompt: 'select_account' });
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-10 -left-10 w-72 h-72 bg-hack-yellow/40 rounded-full blur-3xl" />
        <div className="absolute bottom-10 -right-10 w-96 h-96 bg-white/30 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-12 h-12 rounded-xl bg-hack-yellow flex items-center justify-center border-[3px] border-hack-black shadow-[4px_4px_0_0_#1A1A1A] group-hover:translate-y-[-2px] transition-transform">
              <Zap className="w-6 h-6 text-hack-black" strokeWidth={2.5} fill="#1A1A1A" />
            </div>
            <span className="font-display font-black text-2xl text-white drop-shadow-[2px_2px_0_rgba(26,26,26,0.4)]">
              HACKKNOW
            </span>
          </Link>
          <p className="text-white font-semibold mt-2 text-sm drop-shadow-[1px_1px_0_rgba(26,26,26,0.3)]">
            Welcome back to the marketplace
          </p>
        </div>

        {/* Neo-brutalism Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border-[3px] border-hack-black shadow-[8px_8px_0_0_#1A1A1A]">
          <h1 className="font-display font-black text-2xl text-hack-black text-center mb-5">
            Sign In
          </h1>

          {error && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-xl bg-red-100 border-[2.5px] border-red-600 text-red-800 text-sm font-semibold shadow-[3px_3px_0_0_#7f1d1d]"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-sm text-hack-black font-bold flex items-center gap-2">
                <Mail className="w-4 h-4" strokeWidth={2.5} />
                Email
              </label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                placeholder="you@yourdomain.com"
                autoComplete="email"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
                className="w-full bg-white text-hack-black placeholder:text-hack-black/40 rounded-xl h-12 px-4 border-[2.5px] border-hack-black shadow-[3px_3px_0_0_#1A1A1A] focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[2px_2px_0_0_#1A1A1A] transition-all"
                required
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-sm text-hack-black font-bold flex items-center gap-2">
                <Lock className="w-4 h-4" strokeWidth={2.5} />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full bg-white text-hack-black placeholder:text-hack-black/40 rounded-xl h-12 pl-4 pr-12 border-[2.5px] border-hack-black shadow-[3px_3px_0_0_#1A1A1A] focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[2px_2px_0_0_#1A1A1A] transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-hack-black/60 hover:text-hack-black transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" strokeWidth={2.25} /> : <Eye className="w-5 h-5" strokeWidth={2.25} />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-hack-black font-bold underline decoration-2 underline-offset-2 hover:text-hack-magenta transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button — neo-brutal */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-hack-yellow text-hack-black font-black text-base rounded-xl border-[3px] border-hack-black shadow-[5px_5px_0_0_#1A1A1A] hover:shadow-[2px_2px_0_0_#1A1A1A] hover:translate-x-[3px] hover:translate-y-[3px] active:translate-x-[5px] active:translate-y-[5px] active:shadow-none disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 inline-flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-[2.5px] border-dashed border-hack-black/30" />
            </div>
            <span className="relative flex justify-center">
              <span className="px-3 bg-white text-xs font-bold uppercase tracking-widest text-hack-black/60">
                Or continue with
              </span>
            </span>
          </div>

          {/* Google Login — neo-brutal */}
          <button
            onClick={handleGoogleLogin}
            type="button"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-hack-black font-bold border-[3px] border-hack-black shadow-[5px_5px_0_0_#1A1A1A] hover:shadow-[2px_2px_0_0_#1A1A1A] hover:translate-x-[3px] hover:translate-y-[3px] active:translate-x-[5px] active:translate-y-[5px] active:shadow-none transition-all duration-150"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#EA4335" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#4285F4" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 15.04 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          {/* Sign Up Link */}
          <p className="text-center mt-6 text-hack-black/70 text-sm font-semibold">
            Don&apos;t have an account?{' '}
            <Link
              to="/signup"
              className="text-hack-black font-black underline decoration-2 underline-offset-2 hover:text-hack-magenta transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>

        {/* Footer Links */}
        <div className="flex justify-center gap-6 mt-6 text-sm font-bold text-white drop-shadow-[1px_1px_0_rgba(26,26,26,0.3)]">
          <Link to="/support" className="hover:underline underline-offset-2">Help</Link>
          <Link to="/privacy" className="hover:underline underline-offset-2">Privacy</Link>
          <Link to="/terms" className="hover:underline underline-offset-2">Terms</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
