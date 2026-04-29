import { Link } from "react-router-dom";
import {
  ArrowLeft, Shield, Database, Cookie, HardDriveDownload, MailWarning,
  Eye, Lock, Globe, UserCheck, FileText,
} from "lucide-react";

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-hack-white">
      {/* Header */}
      <div className="bg-hack-black text-hack-white py-16 lg:py-20">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-hack-yellow hover:text-hack-orange transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-hack-yellow/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-hack-yellow" />
              </div>
              <h1 className="font-display font-bold text-4xl lg:text-5xl">Privacy Policy</h1>
            </div>
            <p className="text-hack-white/60 text-lg max-w-2xl">
              Plain-language summary of what HackKnow collects, why we use cookies and cache, who we
              share it with, and the rights you have under Indian and international privacy law.
            </p>
            <p className="text-xs font-mono text-hack-white/40 mt-4">Last updated: 29 April 2026 • Operated from Delhi, India</p>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Who we are */}
          <section className="rounded-2xl border border-hack-black/10 bg-white p-6">
            <h2 className="mb-3 flex items-center gap-3 font-display text-2xl font-bold text-hack-black">
              <FileText className="h-6 w-6 text-hack-magenta" />
              Who We Are
            </h2>
            <p className="text-hack-black/80 leading-relaxed">
              HackKnow.com (“HackKnow”, “we”, “us”) is a digital-products marketplace operated from
              Delhi, India. This policy explains how we collect, use, store, share and protect any
              personal information you give us when you visit hackknow.com, shop at
              shop.hackknow.com, talk to Yahavi AI, or contact our support team.
            </p>
            <p className="text-hack-black/80 leading-relaxed mt-3">
              This policy is governed by the Indian Information Technology Act, 2000, the Information
              Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or
              Information) Rules, 2011, and the Digital Personal Data Protection Act, 2023. Where you
              are a visitor from the EU/UK or USA, we also align with the GDPR / UK GDPR / CCPA where
              they apply.
            </p>
          </section>

          {/* What we collect */}
          <section className="rounded-2xl border border-hack-black/10 bg-white p-6">
            <h2 className="mb-3 flex items-center gap-3 font-display text-2xl font-bold text-hack-black">
              <Database className="h-6 w-6 text-hack-yellow" />
              What We Collect
            </h2>
            <ul className="space-y-2 text-hack-black/80">
              <li>• <strong>Account details:</strong> name, email, password (hashed), optional phone, profile photo.</li>
              <li>• <strong>Order details:</strong> billing name, billing/email address, country, order items, amount, invoice/GST number where applicable.</li>
              <li>• <strong>Payment metadata:</strong> we never see your full card / UPI PIN. Razorpay returns only a transaction ID, last-4 digits and approval status.</li>
              <li>• <strong>Support / chat data:</strong> messages you send to support@hackknow.com or to Yahavi AI, including the language you wrote in.</li>
              <li>• <strong>Device & usage data:</strong> IP address, browser, OS, device type, pages visited, timestamps, referring URL.</li>
              <li>• <strong>Marketing opt-ins:</strong> only if you subscribe to our newsletter or check the marketing-consent box at checkout.</li>
            </ul>
          </section>

          {/* Why we use cookies + cache */}
          <section className="rounded-2xl border border-hack-yellow/30 bg-hack-yellow/5 p-6">
            <h2 className="mb-3 flex items-center gap-3 font-display text-2xl font-bold text-hack-black">
              <Cookie className="h-6 w-6 text-hack-orange" />
              Why We Use Cookies, Local-Storage & Cache
            </h2>
            <p className="text-hack-black/80 mb-3">
              We keep cookies and on-device storage to a minimum, and we never sell them.
              Specifically:
            </p>
            <ul className="space-y-2 text-hack-black/80">
              <li>• <strong>Essential session cookie</strong> — keeps you logged in and protects checkout from CSRF attacks. Without it the site would not work.</li>
              <li>• <strong>Authentication JWT</strong> (in localStorage) — replaces a server password lookup on every request, so the site stays fast and secure.</li>
              <li>• <strong>Cart cookie</strong> — remembers items in your cart between visits so you don't lose them.</li>
              <li>• <strong>Chat history</strong> (in localStorage) — Yahavi AI keeps the last 30 messages locally on <em>your</em> device so the conversation feels continuous; we do not upload it for advertising.</li>
              <li>• <strong>Optional analytics cookie</strong> — fires only after you accept it, used for aggregate page-view counts and bug-tracking.</li>
              <li>• <strong>Service-worker cache</strong> — HackKnow is a Progressive Web App; we cache the UI shell and product images on your device so the store loads instantly, works on patchy networks and reduces your mobile-data bill. Cached files live on your device, not on our servers.</li>
            </ul>
            <p className="text-xs text-hack-black/60 mt-3">
              You can clear cookies and the cache at any time from your browser settings. Doing so
              will sign you out and reset Yahavi AI's chat history.
            </p>
          </section>

          {/* How we use */}
          <section className="rounded-2xl border border-hack-black/10 bg-white p-6">
            <h2 className="mb-3 flex items-center gap-3 font-display text-2xl font-bold text-hack-black">
              <Eye className="h-6 w-6 text-hack-magenta" />
              How We Use This Information
            </h2>
            <ul className="space-y-2 text-hack-black/80">
              <li>• To create and operate your account, deliver downloads, and process refunds.</li>
              <li>• To prevent fraud, abuse and chargebacks.</li>
              <li>• To answer your support queries and improve product listings.</li>
              <li>• To improve Yahavi AI's accuracy in your language. Conversations are not used to identify you personally and are never sold.</li>
              <li>• To send transactional emails (order confirmations, receipts, password resets) — these cannot be opted out of as long as you have an active account.</li>
              <li>• To send marketing emails <em>only</em> if you opt in. You can unsubscribe with one click at any time.</li>
            </ul>
          </section>

          {/* Sharing */}
          <section className="rounded-2xl border border-hack-black/10 bg-white p-6">
            <h2 className="mb-3 flex items-center gap-3 font-display text-2xl font-bold text-hack-black">
              <Globe className="h-6 w-6 text-green-600" />
              Who We Share Data With
            </h2>
            <p className="text-hack-black/80 mb-3">
              We share the minimum personal data needed with the following processors, all bound by
              data-protection contracts:
            </p>
            <ul className="space-y-2 text-hack-black/80">
              <li>• <strong>Razorpay</strong> — payment processing (India).</li>
              <li>• <strong>Hostinger</strong> — WooCommerce backend hosting (EU).</li>
              <li>• <strong>Google Cloud</strong> — frontend hosting & object storage (multi-region).</li>
              <li>• <strong>Google Gemini API</strong> — Yahavi AI's language model (data sent only when you talk to the chat).</li>
              <li>• <strong>Email service provider</strong> — transactional and (opt-in) marketing email delivery.</li>
              <li>• <strong>Law-enforcement</strong> — only when legally compelled by an order from a court of competent jurisdiction in India.</li>
            </ul>
            <p className="text-hack-black/80 mt-3">
              We do <strong>not</strong> sell, rent or trade your personal data with advertisers, data
              brokers, or any third party for monetary or other consideration.
            </p>
          </section>

          {/* Security */}
          <section className="rounded-2xl border border-hack-black/10 bg-white p-6">
            <h2 className="mb-3 flex items-center gap-3 font-display text-2xl font-bold text-hack-black">
              <Lock className="h-6 w-6 text-hack-yellow" />
              How We Protect Your Data
            </h2>
            <ul className="space-y-2 text-hack-black/80">
              <li>• HTTPS (TLS 1.3) on every page and API call.</li>
              <li>• Passwords stored only as salted bcrypt hashes — we never see them.</li>
              <li>• Sessions are short-lived JWTs signed with a rotating secret.</li>
              <li>• Database access is restricted to specific IP addresses and SSH keys.</li>
              <li>• Daily encrypted backups with a 30-day retention window.</li>
              <li>• Continuous monitoring for failed-login spikes, brute-force attacks and rate-limit violations.</li>
            </ul>
          </section>

          {/* Retention */}
          <section className="rounded-2xl border border-hack-black/10 bg-white p-6">
            <h2 className="mb-3 flex items-center gap-3 font-display text-2xl font-bold text-hack-black">
              <HardDriveDownload className="h-6 w-6 text-hack-magenta" />
              How Long We Keep It
            </h2>
            <ul className="space-y-2 text-hack-black/80">
              <li>• <strong>Account data</strong> — until you delete the account, plus 30 days of soft-delete recovery.</li>
              <li>• <strong>Order &amp; tax records</strong> — kept for the period required by Indian tax law (currently 8 years).</li>
              <li>• <strong>Support emails</strong> — 24 months, then archived.</li>
              <li>• <strong>Yahavi AI chat history</strong> — stored only in your browser; we do not retain it server-side.</li>
              <li>• <strong>Analytics logs</strong> — 90 days, then aggregated.</li>
            </ul>
          </section>

          {/* Your rights */}
          <section className="rounded-2xl border border-hack-black/10 bg-white p-6">
            <h2 className="mb-3 flex items-center gap-3 font-display text-2xl font-bold text-hack-black">
              <UserCheck className="h-6 w-6 text-green-600" />
              Your Rights
            </h2>
            <p className="text-hack-black/80 mb-3">
              Under the DPDP Act, 2023 (India) and the GDPR / CCPA where applicable, you can ask us
              to:
            </p>
            <ul className="space-y-2 text-hack-black/80">
              <li>• Confirm what personal data we hold about you and provide a copy.</li>
              <li>• Correct or update inaccurate data.</li>
              <li>• Delete your account and associated data (subject to mandatory retention laws).</li>
              <li>• Withdraw marketing consent at any time.</li>
              <li>• Nominate someone to exercise these rights on your behalf in case of incapacity or death.</li>
              <li>• File a complaint with the Data Protection Board of India if you believe we are non-compliant.</li>
            </ul>
            <p className="text-hack-black/80 mt-3">
              To exercise any right, email{" "}
              <a href="mailto:privacy@hackknow.com" className="text-hack-magenta hover:text-hack-orange">
                privacy@hackknow.com
              </a>{" "}
              (cc: support@hackknow.com). We will respond within 30 days.
            </p>
          </section>

          {/* Children */}
          <section className="rounded-2xl border border-hack-black/10 bg-white p-6">
            <h2 className="mb-3 flex items-center gap-3 font-display text-2xl font-bold text-hack-black">
              <MailWarning className="h-6 w-6 text-hack-orange" />
              Children & Minors
            </h2>
            <p className="text-hack-black/80">
              HackKnow is not intended for children under 18. We do not knowingly collect data from
              minors. If you believe a minor has registered an account, write to us at
              privacy@hackknow.com and we will delete it within 7 days.
            </p>
          </section>

          {/* Changes */}
          <section className="rounded-2xl border border-hack-black/10 bg-white p-6">
            <h2 className="mb-3 font-display text-2xl font-bold text-hack-black">Changes to this Policy</h2>
            <p className="text-hack-black/80">
              We may update this policy when our products or laws change. The “Last updated” date at
              the top is always current. Material changes will also be announced on the homepage and
              via email if you have an account.
            </p>
          </section>

          {/* Grievance Officer */}
          <div className="rounded-2xl bg-hack-black p-6 text-white">
            <h2 className="font-display text-xl font-bold mb-3">Grievance Officer (India)</h2>
            <p className="text-white/70 mb-4 text-sm">
              In compliance with the Information Technology Act, 2000 and the Consumer Protection
              Act, 2019, the contact details of our Grievance Officer are below:
            </p>
            <div className="font-mono text-sm space-y-1 text-white/90">
              <p>Name: Grievance Cell, HackKnow</p>
              <p>Email: <a href="mailto:legal@hackknow.com" className="text-hack-yellow">legal@hackknow.com</a></p>
              <p>Phone: <a href="tel:+918796018700" className="text-hack-yellow">+91 87960 18700</a></p>
              <p>Address: Delhi, India</p>
              <p>Hours: Mon–Fri, 10:00–19:00 IST</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
