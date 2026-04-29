import { Link } from "react-router-dom";
import { ArrowLeft, ShieldAlert, FileWarning, Mail, Clock, Scale, AlertTriangle } from "lucide-react";

const DMCAPage = () => {
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
                <ShieldAlert className="w-6 h-6 text-hack-yellow" />
              </div>
              <h1 className="font-display font-bold text-4xl lg:text-5xl">DMCA / Copyright Notice</h1>
            </div>
            <p className="text-hack-white/60 text-lg max-w-2xl">
              How to report copyright infringement on HackKnow.com under the U.S. DMCA, the Indian
              Information Technology Act, 2000 (and IT Intermediary Rules, 2021), and other applicable laws.
            </p>
            <p className="text-xs font-mono text-hack-white/40 mt-4">Last updated: 29 April 2026</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Intro */}
          <section className="rounded-2xl border border-hack-black/10 bg-white p-6">
            <p className="text-hack-black/80 leading-relaxed">
              HackKnow respects the intellectual-property rights of others and expects its users to do
              the same. We respond to clear, complete notices of alleged copyright infringement in
              accordance with the U.S. Digital Millennium Copyright Act (DMCA) and India's Information
              Technology Act, 2000 read with the Information Technology (Intermediary Guidelines and
              Digital Media Ethics Code) Rules, 2021.
            </p>
            <p className="text-hack-black/80 leading-relaxed mt-3">
              If you believe content available on, sold through, or linked from <strong>hackknow.com</strong>{" "}
              or <strong>shop.hackknow.com</strong> infringes a copyright you own or control, please send
              us a written notice as described below.
            </p>
          </section>

          {/* What to include */}
          <section className="rounded-2xl border border-hack-black/10 bg-white p-6">
            <h2 className="mb-4 flex items-center gap-3 font-display text-2xl font-bold text-hack-black">
              <FileWarning className="h-6 w-6 text-hack-magenta" />
              Filing a Takedown Notice
            </h2>
            <p className="text-hack-black/70 mb-4">
              A valid notice must include all of the following — incomplete notices will be sent back
              for clarification:
            </p>
            <ol className="space-y-3 text-hack-black/80">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-hack-black text-white flex items-center justify-center text-xs font-bold shrink-0">1</span>
                A physical or electronic signature of the copyright owner, or a person authorised to act on their behalf.
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-hack-black text-white flex items-center justify-center text-xs font-bold shrink-0">2</span>
                A clear identification of the copyrighted work claimed to have been infringed (and where it was originally published, if possible).
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-hack-black text-white flex items-center justify-center text-xs font-bold shrink-0">3</span>
                The exact URL(s) on hackknow.com / shop.hackknow.com where the allegedly infringing material is located.
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-hack-black text-white flex items-center justify-center text-xs font-bold shrink-0">4</span>
                Your contact details — full legal name, address, telephone number and email.
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-hack-black text-white flex items-center justify-center text-xs font-bold shrink-0">5</span>
                A statement made in good faith that the disputed use is not authorised by the copyright owner, its agent, or the law.
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-hack-black text-white flex items-center justify-center text-xs font-bold shrink-0">6</span>
                A statement, made <em>under penalty of perjury</em>, that the information in the notice is accurate and that you are the copyright owner or authorised to act on the owner's behalf.
              </li>
            </ol>
          </section>

          {/* Where to send */}
          <section className="rounded-2xl border border-hack-yellow/30 bg-hack-yellow/5 p-6">
            <h2 className="mb-3 flex items-center gap-3 font-display text-2xl font-bold text-hack-black">
              <Mail className="h-6 w-6 text-hack-orange" />
              Where to Send Your Notice
            </h2>
            <p className="text-hack-black/80 mb-4">
              Designated Grievance / Copyright Officer for HackKnow:
            </p>
            <div className="rounded-xl bg-white p-4 border border-hack-black/10 font-mono text-sm text-hack-black/80 space-y-1">
              <p>HackKnow — Grievance Officer</p>
              <p>Email: <a href="mailto:legal@hackknow.com" className="text-hack-magenta">legal@hackknow.com</a> (cc: <a href="mailto:support@hackknow.com" className="text-hack-magenta">support@hackknow.com</a>)</p>
              <p>Phone: <a href="tel:+918796018700" className="text-hack-magenta">+91 87960 18700</a></p>
              <p>Address: Delhi, India</p>
            </div>
            <p className="text-xs text-hack-black/60 mt-3">
              Subject line: <strong>“DMCA Takedown – [URL of the infringing page]”</strong>
            </p>
          </section>

          {/* Timeline */}
          <section className="rounded-2xl border border-hack-black/10 bg-white p-6">
            <h2 className="mb-3 flex items-center gap-3 font-display text-2xl font-bold text-hack-black">
              <Clock className="h-6 w-6 text-green-600" />
              Our Response Timeline
            </h2>
            <ul className="space-y-2 text-hack-black/80">
              <li>• Acknowledgement of your notice within <strong>48 hours</strong> of receipt.</li>
              <li>• Investigation and action (takedown, restriction, or rejection with reason) within <strong>15 days</strong>, in line with Rule 3(2) of the IT Intermediary Rules, 2021.</li>
              <li>• Voluntary disclosure of the action taken to both the complainant and the affected user.</li>
            </ul>
          </section>

          {/* Counter-notice */}
          <section className="rounded-2xl border border-hack-black/10 bg-white p-6">
            <h2 className="mb-3 flex items-center gap-3 font-display text-2xl font-bold text-hack-black">
              <Scale className="h-6 w-6 text-hack-magenta" />
              Counter-Notice (If Your Content Was Removed by Mistake)
            </h2>
            <p className="text-hack-black/70 mb-3">
              If you believe content of yours was removed in error, you may submit a counter-notice
              containing:
            </p>
            <ul className="space-y-2 text-hack-black/80">
              <li>• Your physical or electronic signature.</li>
              <li>• Identification of the material that was removed and the URL where it appeared.</li>
              <li>• A statement under penalty of perjury that you have a good-faith belief the material was removed by mistake or misidentification.</li>
              <li>• Your full name, address, phone, email and consent to the jurisdiction of the courts at Delhi, India.</li>
            </ul>
            <p className="text-hack-black/70 mt-3">
              Send counter-notices to the same email above with subject <strong>“DMCA Counter-Notice”</strong>.
            </p>
          </section>

          {/* Repeat infringer */}
          <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h2 className="mb-3 flex items-center gap-3 font-display text-2xl font-bold text-red-700">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              Repeat-Infringer Policy & Misuse Warning
            </h2>
            <p className="text-red-900/80 mb-2">
              Accounts that are the subject of repeated, valid copyright complaints will be terminated
              without notice and refused future service.
            </p>
            <p className="text-red-900/80">
              Filing a knowingly false DMCA notice or counter-notice is itself a violation of law and
              may result in legal liability, including damages and legal fees, under §512(f) of the
              U.S. DMCA and Section 79 of the Indian IT Act, 2000.
            </p>
          </section>

          {/* Contact box */}
          <div className="rounded-2xl bg-hack-black p-6 text-center text-white">
            <h2 className="mb-3 font-display text-xl font-bold">Need help filing a notice?</h2>
            <p className="mb-4 text-white/60">
              Our team can walk you through the process — usually within one business day.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-full bg-hack-yellow px-6 py-3 font-bold text-hack-black transition-colors hover:bg-hack-yellow/90"
            >
              Contact the Grievance Team
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DMCAPage;
