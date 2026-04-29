import type { FC, FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, BadgeCheck, Lock, Mail, Phone, Sparkles, User } from 'lucide-react';
import { registerWithWordPress, loginWithGoogle } from '@/lib/auth';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: object) => void;
          prompt: (cb?: (n: object) => void) => void;
        };
      };
    };
  }
}

const perks = [
  'Fast order tracking',
  'Download center access',
  'Wishlist and saved items',
  'HackKnow AI recommendations',
];

const signupSteps = [
  'Create your account',
  'Save phone for order updates',
  'Land directly in your dashboard',
];

const SignupPage: FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');

  const passwordsMatch = useMemo(
    () => formData.password.length >= 8 && formData.password === formData.confirmPassword,
    [formData.password, formData.confirmPassword]
  );

  const handleGoogleSignIn = () => {
    if (!window.google) return;
    window.google.accounts.id.initialize({
      client_id: '936562781728-0tds5q2uqh2qft6bq76s0airvv117ig5.apps.googleusercontent.com',
      callback: async (response: { credential: string }) => {
        try {
          await loginWithGoogle(response.credential);
          navigate('/account');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Google sign-in failed');
        }
      },
    });
    window.google.accounts.id.prompt();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!passwordsMatch) { setError('Passwords must match and be at least 8 characters.'); return; }
    if (!agreeTerms)     { setError('Accept the terms before creating the account.');       return; }
    try {
      await registerWithWordPress(formData.fullName, formData.email, formData.password);
      setError('');
      navigate('/account');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    }
  };

  return (
    <div className="min-h-screen bg-hack-yellow px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 border-4 border-hack-black bg-white px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.22em] text-hack-black shadow-[6px_6px_0_#1a1a1a] transition-transform hover:-translate-y-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back To Home
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="border-4 border-hack-black bg-hack-black p-6 text-white shadow-[10px_10px_0_#ff56f0] sm:p-8">
            <div className="inline-flex items-center gap-2 border-4 border-hack-white bg-hack-yellow px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-hack-black">
              <Sparkles className="h-4 w-4" />
              Hackknow Access Pass
            </div>

            <h1 className="mt-6 font-display text-4xl font-bold uppercase leading-none sm:text-6xl">
              Sign Up.
              <br />
              Ship Fast.
              <br />
              Stay Synced.
            </h1>

            <p className="mt-6 max-w-xl border-l-4 border-hack-yellow pl-4 text-base text-white/80 sm:text-lg">
              This account gives users one clean place for orders, downloads, support, wishlist,
              and HackKnow AI help. Signup should feel direct, loud, and useful.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {perks.map((perk) => (
                <div
                  key={perk}
                  className="border-4 border-hack-white bg-hack-white px-4 py-4 text-sm font-semibold text-hack-black shadow-[6px_6px_0_#fff055]"
                >
                  <BadgeCheck className="mb-3 h-5 w-5" />
                  {perk}
                </div>
              ))}
            </div>

            <div className="mt-8 border-4 border-hack-white bg-hack-magenta p-5 text-hack-black shadow-[8px_8px_0_#fff055]">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em]">
                What happens after signup
              </p>
              <ul className="mt-4 space-y-3 text-sm font-semibold">
                {signupSteps.map((step, index) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="inline-flex h-7 w-7 items-center justify-center border-2 border-hack-black bg-white text-xs font-bold">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="border-4 border-hack-black bg-white p-6 shadow-[10px_10px_0_#1a1a1a] sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-hack-magenta">
                  Create Account
                </p>
                <h2 className="mt-2 font-display text-3xl font-bold uppercase text-hack-black">
                  Get Your Dashboard
                </h2>
                <p className="mt-3 max-w-md text-sm font-medium text-hack-black/65">
                  Google entry can route through WordPress auth. Real email OTP and phone OTP need
                  backend auth wiring before they can be switched on safely.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="inline-flex items-center gap-2 border-4 border-hack-black bg-hack-yellow px-4 py-2 text-sm font-bold uppercase text-hack-black shadow-[4px_4px_0_#ff56f0] transition-transform hover:-translate-y-1"
              >
                Google
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em]">
                    <User className="h-4 w-4" />
                    Full Name
                  </span>
                  <input
                    className="w-full border-4 border-hack-black bg-hack-white px-4 py-3 text-sm font-medium outline-none transition-colors focus:bg-hack-yellow/30"
                    placeholder="Gagan Chauhan"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em]">
                    <Mail className="h-4 w-4" />
                    Email
                  </span>
                  <input
                    type="email"
                    className="w-full border-4 border-hack-black bg-hack-white px-4 py-3 text-sm font-medium outline-none transition-colors focus:bg-hack-yellow/30"
                    placeholder="you@hackknow.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em]">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </span>
                <input
                  type="tel"
                  className="w-full border-4 border-hack-black bg-hack-white px-4 py-3 text-sm font-medium outline-none transition-colors focus:bg-hack-yellow/30"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  pattern="[\+]?[0-9\s\-\(\)]{10,}"
                  title="Please enter a valid phone number"
                  required
                />
                <p className="mt-2 text-xs font-medium text-hack-black/65">
                  Required for order updates, downloads, and support follow-ups.
                </p>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em]">
                    <Lock className="h-4 w-4" />
                    Password
                  </span>
                  <input
                    type="password"
                    className="w-full border-4 border-hack-black bg-hack-white px-4 py-3 text-sm font-medium outline-none transition-colors focus:bg-hack-yellow/30"
                    placeholder="Minimum 8 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    minLength={8}
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em]">
                    <Lock className="h-4 w-4" />
                    Confirm
                  </span>
                  <input
                    type="password"
                    className="w-full border-4 border-hack-black bg-hack-white px-4 py-3 text-sm font-medium outline-none transition-colors focus:bg-hack-yellow/30"
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />
                </label>
              </div>

              <label className="flex items-start gap-3 border-4 border-hack-black bg-hack-yellow/35 p-4">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-hack-black"
                  required
                />
                <span className="text-sm font-medium text-hack-black">
                  I agree to the{' '}
                  <Link to="/support" className="font-bold underline underline-offset-4">
                    Terms
                  </Link>{' '}
                  and{' '}
                  <Link to="/support" className="font-bold underline underline-offset-4">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>

              {error ? (
                <div className="border-4 border-hack-black bg-hack-magenta px-4 py-3 text-sm font-bold text-hack-black">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                className="w-full border-4 border-hack-black bg-hack-yellow px-5 py-4 font-display text-lg font-bold uppercase text-hack-black shadow-[6px_6px_0_#1a1a1a] transition-transform hover:-translate-y-1 disabled:cursor-not-allowed disabled:bg-hack-black/10 disabled:shadow-none"
                disabled={!agreeTerms || !passwordsMatch}
              >
                Create Account And Open Dashboard
              </button>
            </form>

            <div className="mt-6 border-t-4 border-hack-black pt-5 text-sm font-medium text-hack-black/70">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-hack-magenta underline underline-offset-4">
                Sign in
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
