import { Link } from "react-router-dom";
import {
  ArrowLeft, FileText, Shield, Scale, BadgeCheck, UserX, Download,
  CreditCard, Ban, Gavel, Mail, AlertCircle,
} from "lucide-react";

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
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-hack-yellow/20">
                <FileText className="h-6 w-6 text-hack-yellow" />
              </div>
              <h1 className="font-display text-4xl font-bold lg:text-5xl">Terms & Conditions</h1>
            </div>
            <p className="max-w-2xl text-lg text-hack-white/60">
              Plain-language rules for using HackKnow, buying digital products, and accessing
              downloads. By using the site you agree to these terms.
            </p>
            <p className="text-xs font-mono text-hack-white/40 mt-4">Last updated: 29 April 2026 • Operated from Delhi, India</p>
          </div>
        </div>
      </div>

      <div className="w-full px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-3xl space-y-8">
          {/* 1. Acceptance */}
          <section className="rounded-2xl border border-hack-black/10 bg-white p-6">
            <h2 className="mb-3 flex items-center gap-3 font-display text-2xl font-bold text-hack-black">
              <BadgeCheck className="h-6 w-6 text-hack-yellow" />
              1. Acceptance & Eligibility
            </h2>
            <p className="text-hack-black/80">
              By accessing hackknow.com, shop.hackknow.com or any HackKnow service, you agree to
              these Terms, our <Link to="/privacy" className="text-hack-magenta">Privacy Policy</Link>,{" "}
              <Link to="/refund-policy" className="text-hack-magenta">Refund Policy</Link>, and{" "}
              <Link to="/dmca" className="text-hack-magenta">DMCA Policy</Link>. You confirm that you are at
              least 18 years old, capable of entering into a binding contract under the Indian
              Contract Act, 1872, and not barred from receiving services under the laws of India.
            </p>
          </section>

          {/* 2. Account */}
          <section className="rounded-2xl border border-hack-black/10 bg-white p-6">
            <h2 className="mb-3 flex items-center gap-3 font-display text-2xl font-bold text-hack-black">
              <Shield className="h-6 w-6 text-hack-magenta" />
              2. Your Account
            </h2>
            <ul className="space-y-2 text-hack-black/80">
              <li>• Provide accurate registration details and keep them up to date.</li>
              <li>• Keep your password confidential — every action under your account is your responsibility.</li>
              <li>• Notify us immediately at <a href="mailto:support@hackknow.com" className="text-hack-magenta">support@hackknow.com</a> of any unauthorised use.</li>
              <li>• One person, one free account. Multiple accounts created to abuse coupons may be merged or terminated.</li>
            </ul>
          </section>

          {/* 3. License */}
          <section className="rounded-2xl border border-hack-black/10 bg-white p-6">
            <h2 className="mb-3 flex items-center gap-3 font-display text-2xl font-bold text-hack-black">
              <FileText className="h-6 w-6 text-hack-yellow" />
              3. Digital-Product License
            </h2>
            <p className="text-hack-black/80 mb-3">
              When you complete a purchase, HackKnow grants you a non-exclusive, non-transferable,
              worldwide license to use the downloaded files in your personal and commercial work,
              subject to the rules below. You do not acquire copyright; HackKnow and its creators
              retain all intellectual-property rights.
            </p>
            <p className="font-semibold text-hack-black mb-2">You MAY:</p>
            <ul className="space-y-1.5 text-hack-black/80 mb-3">
              <li>• Use the file in your own client / business / educational projects.</li>
              <li>• Modify, customise and brand the file for your own use.</li>
              <li>• Share the rendered output (PDF, image, presentation export) with anyone.</li>
            </ul>
            <p className="font-semibold text-hack-black mb-2">You MAY NOT:</p>
            <ul className="space-y-1.5 text-hack-black/80">
              <li>• Resell, sublicense or redistribute the source file as-is or with cosmetic changes.</li>
              <li>• Upload the file to any other marketplace, template store, file-sharing or torrent site.</li>
              <li>• Claim authorship of the underlying template or design system.</li>
              <li>• Use the file for any unlawful, abusive, hateful, fraudulent or sexually explicit purpose.</li>
            </ul>
          </section>

          {/* 4. Orders & payments */}
          <section className="rounded-2xl border border-hack-black/10 bg-white p-6">
            <h2 className="mb-3 flex items-center gap-3 font-display text-2xl font-bold text-hack-black">
              <CreditCard className="h-6 w-6 text-green-600" />
              4. Orders, Pricing & Payments
            </h2>
            <ul className="space-y-2 text-hack-black/80">
              <li>• All prices are listed in Indian Rupees (₹) inclusive of applicable GST unless otherwise marked.</li>
              <li>• Payments are processed by Razorpay; we never see or store your full card or UPI credentials.</li>
              <li>• An order is confirmed only when Razorpay returns a successful transaction status — pending or failed transactions do not grant access.</li>
              <li>• HackKnow may refuse or cancel an order in cases of suspected fraud, payment dispute, or violation of these Terms.</li>
              <li>• Prices, taxes and product availability may change without notice; the price displayed at checkout is the price you pay.</li>
            </ul>
          </section>

          {/* 5. Refunds */}
          <section className="rounded-2xl border border-hack-black/10 bg-white p-6">
            <h2 className="mb-3 flex items-center gap-3 font-display text-2xl font-bold text-hack-black">
              <Scale className="h-6 w-6 text-hack-magenta" />
              5. Refunds
            </h2>
            <p className="text-hack-black/80">
              Refund eligibility is governed by our{" "}
              <Link to="/refund-policy" className="text-hack-magenta">Refund Policy</Link>. By
              purchasing, you agree to the conditions described there.
            </p>
          </section>

          {/* 6. Guest */}
          <section className="rounded-2xl border border-hack-yellow/30 bg-hack-yellow/5 p-6">
            <h2 className="mb-3 flex items-center gap-3 font-display text-2xl font-bold text-hack-black">
              <UserX className="h-6 w-6 text-hack-orange" />
              6. Guest Checkout
            </h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Ban className="mt-1 h-5 w-5 shrink-0 text-hack-orange" />
                <div>
                  <p className="font-semibold text-hack-black">No coupon codes</p>
                  <p className="text-sm text-hack-black/70">
                    Discount and promotional codes are reserved for registered, logged-in customers.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Download className="mt-1 h-5 w-5 shrink-0 text-hack-magenta" />
                <div>
                  <p className="font-semibold text-hack-black">One-time download</p>
                  <p className="text-sm text-hack-black/70">
                    Guest downloads are valid for the current browser session only and expire when the
                    session ends. Create a free account for permanent re-download access.
                  </p>
                </div>
              </li>
            </ul>
            <p className="mt-4 text-sm text-hack-black/60">
              <Link to="/signup" className="font-semibold text-hack-magenta hover:text-hack-orange">
                Create a free account →
              </Link>
            </p>
          </section>

          {/* 7. Conduct */}
          <section className="rounded-2xl border border-hack-black/10 bg-white p-6">
            <h2 className="mb-3 flex items-center gap-3 font-display text-2xl font-bold text-hack-black">
              <AlertCircle className="h-6 w-6 text-red-500" />
              7. Acceptable Use
            </h2>
            <p className="text-hack-black/80 mb-2">You agree NOT to:</p>
            <ul className="space-y-2 text-hack-black/80">
              <li>• Reverse-engineer, scrape, brute-force or otherwise abuse the site, APIs or Yahavi AI.</li>
              <li>• Attempt to bypass paywalls, rate limits or download protections.</li>
              <li>• Upload viruses, malware, or content that infringes any third-party rights.</li>
              <li>• Impersonate any other person or entity, or misrepresent your affiliation.</li>
              <li>• Use HackKnow to send unsolicited commercial messages or spam.</li>
            </ul>
          </section>

          {/* 8. Yahavi AI */}
          <section className="rounded-2xl border border-hack-black/10 bg-white p-6">
            <h2 className="mb-3 flex items-center gap-3 font-display text-2xl font-bold text-hack-black">
              <FileText className="h-6 w-6 text-hack-magenta" />
              8. Yahavi AI Disclaimer
            </h2>
            <p className="text-hack-black/80">
              Yahavi AI is an automated assistant powered by large-language-model technology. It can
              answer questions about HackKnow products, prices, policies and orders, but it may
              occasionally produce inaccurate or incomplete answers. Treat its responses as guidance,
              not legal, financial or professional advice. For binding decisions (refunds, billing,
              copyright complaints) always rely on the relevant policy page or contact a human at
              support@hackknow.com.
            </p>
          </section>

          {/* 9. Liability */}
          <section className="rounded-2xl border border-hack-black/10 bg-white p-6">
            <h2 className="mb-3 flex items-center gap-3 font-display text-2xl font-bold text-hack-black">
              <Shield className="h-6 w-6 text-hack-yellow" />
              9. Limitation of Liability
            </h2>
            <p className="text-hack-black/80">
              To the maximum extent permitted by Indian law, HackKnow's total liability arising from
              or related to your use of the site or any product purchased shall not exceed the amount
              you paid for the specific product giving rise to the claim. HackKnow is not liable for
              indirect, incidental, special, consequential or punitive damages, loss of profits, or
              loss of data resulting from your use of the site or downloaded files.
            </p>
          </section>

          {/* 10. Indemnity */}
          <section className="rounded-2xl border border-hack-black/10 bg-white p-6">
            <h2 className="mb-3 flex items-center gap-3 font-display text-2xl font-bold text-hack-black">
              <Gavel className="h-6 w-6 text-hack-orange" />
              10. Indemnity, Termination & Suspension
            </h2>
            <p className="text-hack-black/80 mb-3">
              You agree to indemnify and hold HackKnow, its founders and employees harmless from any
              third-party claim arising out of your breach of these Terms, your misuse of the
              service, or your violation of any law.
            </p>
            <p className="text-hack-black/80">
              We may suspend or terminate your account at any time for violation of these Terms,
              suspected fraud, repeated chargebacks, or court order. On termination, your license to
              all downloaded files ends and any pending orders may be cancelled.
            </p>
          </section>

          {/* 11. Governing law */}
          <section className="rounded-2xl border border-hack-black/10 bg-white p-6">
            <h2 className="mb-3 flex items-center gap-3 font-display text-2xl font-bold text-hack-black">
              <Gavel className="h-6 w-6 text-hack-magenta" />
              11. Governing Law & Jurisdiction
            </h2>
            <p className="text-hack-black/80">
              These Terms are governed by the laws of India. Any dispute arising out of or in
              connection with these Terms or any HackKnow product shall be subject to the exclusive
              jurisdiction of the courts at Delhi, India. Where mandatory consumer-protection laws of
              your country grant you stronger rights, those rights are not waived.
            </p>
          </section>

          {/* 12. Contact */}
          <section className="rounded-2xl border border-hack-black/10 bg-white p-6">
            <h2 className="mb-3 flex items-center gap-3 font-display text-2xl font-bold text-hack-black">
              <Mail className="h-6 w-6 text-green-600" />
              12. Contact / Grievance Officer
            </h2>
            <div className="font-mono text-sm text-hack-black/80 space-y-1">
              <p>HackKnow — Grievance Officer</p>
              <p>Email: <a href="mailto:legal@hackknow.com" className="text-hack-magenta">legal@hackknow.com</a> (cc: <a href="mailto:support@hackknow.com" className="text-hack-magenta">support@hackknow.com</a>)</p>
              <p>Phone: <a href="tel:+918796018700" className="text-hack-magenta">+91 87960 18700</a></p>
              <p>Address: Delhi, India</p>
            </div>
          </section>

          <div className="rounded-2xl bg-hack-black p-6 text-center text-white">
            <h2 className="mb-3 font-display text-xl font-bold">Questions about these Terms?</h2>
            <p className="mb-4 text-white/60">
              Our team will help — usually within one business day.
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
