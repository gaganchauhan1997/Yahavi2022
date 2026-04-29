import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Zap, ArrowRight, CheckCircle } from 'lucide-react';
import { WP_REST_BASE } from '@/lib/api-base';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${WP_REST_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (res.ok || res.status === 200) {
        setIsSubmitted(true);
      } else if (res.status === 404) {
        setIsSubmitted(true);
      } else {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const msg =
          typeof data?.message === 'string' ? data.message : `Request failed (${res.status})`;
        setError(msg);
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
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
            Digital Marketplace
          </p>
        </div>

        {/* Neo-brutalism Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border-[3px] border-hack-black shadow-[8px_8px_0_0_#1A1A1A]">
          {isSubmitted ? (
            /* Success State — neo-brutal */
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-300 flex items-center justify-center mx-auto mb-4 border-[3px] border-hack-black shadow-[4px_4px_0_0_#1A1A1A]">
                <CheckCircle className="w-8 h-8 text-hack-black" strokeWidth={2.5} />
              </div>
              <h1 className="font-display font-black text-2xl text-hack-black mb-3">
                Check your inbox
              </h1>
              <p className="text-hack-black/70 text-sm mb-6 leading-relaxed font-medium">
                If an account exists for{' '}
                <span className="text-hack-black font-black break-all">{email}</span>, you'll
                receive a password reset link shortly. Check your spam folder if it doesn't arrive.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-hack-yellow text-hack-black rounded-xl text-sm font-black border-[2.5px] border-hack-black shadow-[4px_4px_0_0_#1A1A1A] hover:shadow-[2px_2px_0_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-150"
              >
                <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
                Back to Sign In
              </Link>
            </div>
          ) : (
            /* Form State — neo-brutal */
            <>
              <div className="mb-5">
                <h1 className="font-display font-black text-2xl text-hack-black text-center mb-2">
                  Reset Password
                </h1>
                <p className="text-hack-black/65 text-sm text-center font-medium">
                  Enter your email and we'll send you a reset link.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-4 p-3 rounded-xl bg-red-100 border-[2.5px] border-red-600 text-red-800 text-sm font-semibold shadow-[3px_3px_0_0_#7f1d1d]"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm text-hack-black font-bold flex items-center gap-2">
                    <Mail className="w-4 h-4" strokeWidth={2.5} />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@yourdomain.com"
                    autoComplete="email"
                    autoFocus
                    required
                    className="w-full bg-white text-hack-black placeholder:text-hack-black/40 rounded-xl h-12 px-4 border-[2.5px] border-hack-black shadow-[3px_3px_0_0_#1A1A1A] focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[2px_2px_0_0_#1A1A1A] transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-hack-yellow text-hack-black font-black text-base rounded-xl border-[3px] border-hack-black shadow-[5px_5px_0_0_#1A1A1A] hover:shadow-[2px_2px_0_0_#1A1A1A] hover:translate-x-[3px] hover:translate-y-[3px] active:translate-x-[5px] active:translate-y-[5px] active:shadow-none disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 inline-flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Reset Link
                      <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-5 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-hack-black/70 font-bold hover:text-hack-black underline decoration-2 underline-offset-2 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-center gap-6 mt-6 text-sm font-bold text-white drop-shadow-[1px_1px_0_rgba(26,26,26,0.3)]">
          <Link to="/support" className="hover:underline underline-offset-2">
            Help
          </Link>
          <Link to="/privacy" className="hover:underline underline-offset-2">
            Privacy
          </Link>
          <Link to="/terms" className="hover:underline underline-offset-2">
            Terms
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
