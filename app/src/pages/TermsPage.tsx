import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Shield, Scale, BadgeCheck } from 'lucide-react';

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-hack-white">
      <div className="bg-hack-black py-16 text-hack-white lg:py-20">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <Link
              to="/"
              className="mb-6 inline-flex items-center gap-2 text-hack-yellow transition-colors hover:text-hack-orange"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-hack-yellow/20">
                <FileText className="h-6 w-6 text-hack-yellow" />
              </div>
              <h1 className="font-display text-4xl font-bold lg:text-5xl">Terms & Conditions</h1>
            </div>
            <p className="max-w-2xl text-lg text-hack-white/60">
              Rules for using Hackknow, buying digital products, and accessing downloads.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-3xl space-y-8">
          <section className="rounded-2xl border border-hack-black/10 bg-white p-6">
            <h2 className="mb-3 flex items-center gap-3 font-display text-2xl font-bold text-hack-black">
              <BadgeCheck className="h-6 w-6 text-hack-yellow" />
              Marketplace Access
            </h2>
            <p className="text-hack-black/70">
              By using Hackknow, you agree to provide accurate account details, keep your login secure,
              and use the marketplace only for lawful purposes.
            </p>
          </section>

          <section className="rounded-2xl border border-hack-black/10 bg-white p-6">
            <h2 className="mb-3 flex items-center gap-3 font-display text-2xl font-bold text-hack-black">
              <Shield className="h-6 w-6 text-hack-magenta" />
              Digital Product License
            </h2>
            <p className="text-hack-black/70">
              Purchases grant a usage license for the specific product listing. Products may be used in
              personal and commercial work unless the listing says otherwise, but they cannot be resold
              as standalone files.
            </p>
          </section>

          <section className="rounded-2xl border border-hack-black/10 bg-white p-6">
            <h2 className="mb-3 flex items-center gap-3 font-display text-2xl font-bold text-hack-black">
              <Scale className="h-6 w-6 text-green-600" />
              Orders, Refunds, and Support
            </h2>
            <p className="text-hack-black/70">
              Orders are processed through approved payment providers. Refund decisions follow the published
              refund policy, and download/support access depends on a valid completed order.
            </p>
          </section>

          <div className="rounded-2xl bg-hack-black p-6 text-center text-white">
            <h2 className="mb-3 font-display text-xl font-bold">Need clarification?</h2>
            <p className="mb-4 text-white/60">
              Contact the Hackknow team for account, billing, or licensing questions.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-full bg-hack-yellow px-6 py-3 font-bold text-hack-black transition-colors hover:bg-hack-yellow/90"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
