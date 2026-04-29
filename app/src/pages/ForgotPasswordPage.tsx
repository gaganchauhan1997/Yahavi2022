import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Zap, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
        const data = await res.json().catch(() => ({})) as Record<string, unknown>;
        const msg = typeof data?.message === 'string' ? data.message : `Request failed (${res.status})`;
        setError(msg);
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-hack-black via-hack-black to-hack-magenta/20 flex items-center justify-center p-4">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-hack-yellow/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-hack-magenta/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-hack-yellow to-hack-orange flex items-center justify-center shadow-lg shadow-hack-yellow/20 group-hover:scale-105 transition-transform">
              <Zap className="w-6 h-6 text-hack-black" />
            </div>
            <span className="font-display font-bold text-2xl text-white">HACKKNOW</span>
          </Link>
          <p className="text-white/60 mt-2 text-sm">Digital Marketplace</p>
        </div>

        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/10">
          {isSubmitted ? (
            /* Success State */
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h1 className="font-display font-bold text-2xl text-white mb-3">Check your inbox</h1>
              <p className="text-white/60 text-sm mb-6 leading-relaxed">
                If an account exists for <span className="text-hack-yellow font-medium">{email}</span>,
                you'll receive a password reset link shortly. Check your spam folder if it doesn't arrive.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-hack-yellow hover:text-hack-orange transition-colors text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </div>
          ) : (
            /* Form State */
            <>
              <div className="mb-6">
                <h1 className="font-display font-bold text-2xl text-white text-center mb-2">
                  Reset Password
                </h1>
                <p className="text-white/60 text-sm text-center">
                  Enter your email and we'll send you a reset link.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm text-white/80 font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4 text-hack-yellow" />
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@yourdomain.com"
                    className="w-full bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-xl h-12 pl-4 focus:border-hack-yellow focus:ring-1 focus:ring-hack-yellow"
                    required
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-hack-yellow to-hack-orange hover:from-hack-orange hover:to-hack-magenta text-hack-black font-bold rounded-xl transition-all duration-300 shadow-lg shadow-hack-yellow/20"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Send Reset Link
                      <ArrowRight className="w-5 h-5" />
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-center gap-6 mt-8 text-sm text-white/40">
          <Link to="/support" className="hover:text-white transition-colors">Help</Link>
          <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
