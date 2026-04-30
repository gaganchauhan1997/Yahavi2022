import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Send,
  MessageSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

const CF7_URL = '/wp-json/contact-form-7/v1/contact-forms/959/feedback';

const ContactPage = () => {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    const boundary = Math.random().toString(36).slice(2);
    const nl = '\r\n';

    // CF7 REST API requires multipart/form-data with hidden metadata fields
    const fields: Record<string, string> = {
      _wpcf7:                '959',
      _wpcf7_version:        '5.9',
      _wpcf7_locale:         'en_US',
      _wpcf7_unit_tag:       'wpcf7-f959-p0-o1',
      _wpcf7_container_post: '0',
      'your-name':           formData.name,
      'your-email':          formData.email,
      'your-subject':        formData.subject,
      'your-message':        formData.message,
      'your-issues':         'Other',
      'your-country':        'India',
      'your-mobile':         '9876543210',
    };

    const parts = Object.entries(fields).map(
      ([k, v]) =>
        `--${boundary}${nl}Content-Disposition: form-data; name="${k}"${nl}${nl}${v}`,
    );
    const body = parts.join(nl) + `${nl}--${boundary}--`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(CF7_URL, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
        body,
        signal: controller.signal,
      });
      clearTimeout(timer);
      const json = await res.json().catch(() => null);

      if (json?.status === 'mail_sent') {
        setIsSubmitted(true);
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setErrorMsg(json?.message || 'Message could not be sent. Please try again.');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setErrorMsg('Request timed out. Please email us at team@hackknow.com');
      } else {
        setErrorMsg('Unable to connect. Please email us at team@hackknow.com');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ----- shared neobrutal classes ----- */
  const neoCard =
    'bg-white border-[3px] border-hack-black rounded-2xl shadow-[6px_6px_0_0_#0A0A0A]';
  const neoInput =
    'w-full h-12 px-4 bg-white border-[2.5px] border-hack-black rounded-xl text-hack-black placeholder:text-hack-black/40 focus:outline-none focus:bg-hack-yellow/10 focus:shadow-[3px_3px_0_0_#0A0A0A] transition-all font-medium';

  return (
    <div className="min-h-screen bg-hack-white pt-24 pb-20">
      {/* Hero — flat black brutal block */}
      <div className="w-full px-4 sm:px-6 lg:px-8 mb-12">
        <div className="max-w-6xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 text-xs font-mono uppercase tracking-widest text-hack-black bg-hack-yellow border-[2px] border-hack-black rounded-md shadow-[2px_2px_0_0_#0A0A0A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.75} /> Back home
          </Link>

          <div className="relative inline-block">
            <span className="absolute -top-3 -right-6 sm:-right-10 z-10 inline-flex items-center gap-1 bg-hack-magenta text-white font-display font-black text-[11px] uppercase tracking-widest px-2.5 py-1 rounded-md border-[2px] border-hack-black shadow-[3px_3px_0_0_#0A0A0A] -rotate-6">
              <Sparkles className="w-3 h-3" strokeWidth={3} /> Real humans
            </span>
            <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl tracking-tight text-hack-black leading-none">
              Talk to <span className="text-hack-magenta">HackKnow</span>.
            </h1>
          </div>
          <p className="mt-5 text-base sm:text-lg text-hack-black/70 max-w-2xl font-medium">
            Question, idea, complaint, collab — whatever it is, our team reads every message.
            Reply usually lands in your inbox within{' '}
            <span className="bg-hack-yellow px-1.5 py-0.5 border-[1.5px] border-hack-black rounded font-bold">
              24 hours
            </span>
            .
          </p>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* LEFT: Contact info cards */}
          <div className="space-y-5">
            {/* Email card */}
            <a
              href="mailto:team@hackknow.com"
              className={`${neoCard} block p-5 sm:p-6 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_0_#0A0A0A] transition-all`}
            >
              <div className="flex items-start gap-4">
                <span className="flex-none inline-flex w-12 h-12 items-center justify-center rounded-xl bg-hack-yellow border-[2.5px] border-hack-black shadow-[3px_3px_0_0_#0A0A0A]">
                  <Mail className="w-6 h-6 text-hack-black" strokeWidth={2.5} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display font-black text-lg text-hack-black">Email Us</h3>
                  <p className="text-xs font-mono uppercase tracking-wider text-hack-black/50 mt-0.5">
                    For everything · all replies signed by a human
                  </p>
                  <p className="mt-2 font-display font-black text-hack-magenta text-base sm:text-lg break-all">
                    team@hackknow.com
                  </p>
                </div>
              </div>
            </a>

            {/* Phone card */}
            <a
              href="tel:+918796018700"
              className={`${neoCard} block p-5 sm:p-6 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_0_#0A0A0A] transition-all`}
            >
              <div className="flex items-start gap-4">
                <span className="flex-none inline-flex w-12 h-12 items-center justify-center rounded-xl bg-hack-magenta border-[2.5px] border-hack-black shadow-[3px_3px_0_0_#0A0A0A]">
                  <Phone className="w-6 h-6 text-white" strokeWidth={2.5} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display font-black text-lg text-hack-black">Call Us</h3>
                  <p className="text-xs font-mono uppercase tracking-wider text-hack-black/50 mt-0.5">
                    Mon–Fri · 9 AM – 6 PM IST
                  </p>
                  <p className="mt-2 font-display font-black text-hack-black text-base sm:text-lg">
                    +91 87960 18700
                  </p>
                </div>
              </div>
            </a>

            {/* Address card */}
            <div className={`${neoCard} p-5 sm:p-6`}>
              <div className="flex items-start gap-4">
                <span className="flex-none inline-flex w-12 h-12 items-center justify-center rounded-xl bg-hack-orange border-[2.5px] border-hack-black shadow-[3px_3px_0_0_#0A0A0A]">
                  <MapPin className="w-6 h-6 text-hack-black" strokeWidth={2.5} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display font-black text-lg text-hack-black">Where We Are</h3>
                  <p className="text-xs font-mono uppercase tracking-wider text-hack-black/50 mt-0.5">
                    Built in India · for the world
                  </p>
                  <p className="mt-2 text-base text-hack-black font-bold">
                    HackKnow HQ<br />
                    Delhi NCR, India
                  </p>
                </div>
              </div>
            </div>

            {/* Hours card */}
            <div className={`${neoCard} p-5 sm:p-6`}>
              <div className="flex items-start gap-4">
                <span className="flex-none inline-flex w-12 h-12 items-center justify-center rounded-xl bg-green-400 border-[2.5px] border-hack-black shadow-[3px_3px_0_0_#0A0A0A]">
                  <Clock className="w-6 h-6 text-hack-black" strokeWidth={2.5} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display font-black text-lg text-hack-black">Business Hours</h3>
                  <p className="text-xs font-mono uppercase tracking-wider text-hack-black/50 mt-0.5">
                    Asia/Kolkata
                  </p>
                  <p className="mt-2 text-sm text-hack-black font-semibold leading-relaxed">
                    Mon – Fri · 9:00 AM – 6:00 PM IST
                    <br />
                    Sat – Sun · Closed (we still read emails)
                  </p>
                </div>
              </div>
            </div>

            {/* Quick links chips */}
            <div className="pt-2">
              <h3 className="font-display font-black text-sm uppercase tracking-widest text-hack-black/60 mb-3">
                Quick links
              </h3>
              <div className="flex flex-wrap gap-2.5">
                <Link
                  to="/support"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border-[2px] border-hack-black rounded-full text-xs font-bold shadow-[2px_2px_0_0_#0A0A0A] hover:bg-hack-yellow hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5" strokeWidth={2.75} /> Help Center
                </Link>
                <Link
                  to="/support"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border-[2px] border-hack-black rounded-full text-xs font-bold shadow-[2px_2px_0_0_#0A0A0A] hover:bg-hack-yellow hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                >
                  FAQ
                </Link>
                <Link
                  to="/affiliate"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border-[2px] border-hack-black rounded-full text-xs font-bold shadow-[2px_2px_0_0_#0A0A0A] hover:bg-hack-yellow hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                >
                  Affiliate Program
                </Link>
              </div>
            </div>
          </div>

          {/* RIGHT: Contact form */}
          <div className="relative">
            {/* Comic-style sticker badge */}
            <span className="absolute -top-3 -left-2 z-10 inline-flex items-center gap-1 bg-hack-yellow text-hack-black font-display font-black text-[11px] uppercase tracking-widest px-2.5 py-1 rounded-md border-[2px] border-hack-black shadow-[3px_3px_0_0_#0A0A0A] -rotate-3">
              ✉ Drop us a line
            </span>

            <div
              className={`${neoCard} p-6 sm:p-8 shadow-[8px_8px_0_0_#0A0A0A]`}
            >
              {isSubmitted ? (
                <div className="text-center py-10">
                  <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-green-400 border-[3px] border-hack-black shadow-[5px_5px_0_0_#0A0A0A] flex items-center justify-center -rotate-3">
                    <CheckCircle2 className="w-10 h-10 text-hack-black" strokeWidth={2.75} />
                  </div>
                  <h3 className="font-display font-black text-2xl text-hack-black mb-2">
                    Message Sent!
                  </h3>
                  <p className="text-hack-black/70 mb-6 max-w-sm mx-auto font-medium">
                    Thanks for reaching out — a real human from our team will reply within 24 hours.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsSubmitted(false)}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-white text-hack-black border-[2.5px] border-hack-black rounded-xl font-display font-bold text-sm shadow-[4px_4px_0_0_#0A0A0A] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0A0A0A] transition-all"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="font-display font-black text-2xl sm:text-3xl text-hack-black mb-1 leading-tight">
                    Send us a message
                  </h2>
                  <p className="text-sm text-hack-black/60 font-medium mb-6">
                    Free fields, no spam, no auto-reply bots — just write what you need.
                  </p>

                  {errorMsg && (
                    <div className="mb-5 flex items-start gap-3 rounded-xl bg-red-50 border-[2.5px] border-red-500 p-4 text-sm text-red-800 font-semibold shadow-[3px_3px_0_0_#0A0A0A]">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-widest text-hack-black/70 mb-1.5 font-bold">
                        Your Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                        className={neoInput}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-widest text-hack-black/70 mb-1.5 font-bold">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="you@yourdomain.com"
                        className={neoInput}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-widest text-hack-black/70 mb-1.5 font-bold">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="How can we help?"
                        className={neoInput}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-widest text-hack-black/70 mb-1.5 font-bold">
                        Message
                      </label>
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Tell us what's on your mind…"
                        rows={5}
                        className="w-full px-4 py-3 bg-white border-[2.5px] border-hack-black rounded-xl text-hack-black placeholder:text-hack-black/40 focus:outline-none focus:bg-hack-yellow/10 focus:shadow-[3px_3px_0_0_#0A0A0A] transition-all font-medium resize-none"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-hack-yellow text-hack-black border-[3px] border-hack-black rounded-xl font-display font-black text-base shadow-[5px_5px_0_0_#0A0A0A] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_#0A0A0A] active:translate-x-[5px] active:translate-y-[5px] active:shadow-none disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                    >
                      {isSubmitting ? (
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
                          Sending…
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" strokeWidth={2.75} /> Send Message
                        </>
                      )}
                    </button>

                    <p className="text-[11px] text-hack-black/50 text-center font-mono uppercase tracking-widest pt-1">
                      Or just write to{' '}
                      <a
                        href="mailto:team@hackknow.com"
                        className="text-hack-magenta font-bold hover:underline"
                      >
                        team@hackknow.com
                      </a>
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
