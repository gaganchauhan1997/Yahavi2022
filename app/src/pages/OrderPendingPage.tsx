/**
 * /order-pending
 *
 * Shown when Razorpay payment succeeds but the server-sync (verify) call fails.
 * The cart is cleared before redirecting here, so the user is NOT double-charged.
 * We surface the Razorpay payment ID so the support team can manually confirm.
 */
import { useSearchParams, Link } from 'react-router-dom';
import { AlertTriangle, Copy, Mail, ArrowRight } from 'lucide-react';
import { useState } from 'react';

const OrderPendingPage = () => {
  const [params] = useSearchParams();
  const paymentId = params.get('payment_id') ?? '';
  const [copied, setCopied] = useState(false);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(paymentId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  };

  return (
    <div className="min-h-screen bg-hack-white flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-hack-yellow/20 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-hack-orange" />
        </div>

        <h1 className="font-display font-bold text-3xl text-hack-black mb-3">
          Payment Received
        </h1>
        <h2 className="font-display font-semibold text-xl text-hack-orange mb-4">
          Order Sync Pending
        </h2>

        <p className="text-hack-black/60 mb-8 leading-relaxed">
          Your payment was <strong className="text-hack-black">successfully processed</strong> by
          Razorpay, but we couldn't confirm your order with our server right now. 
          Don't worry — <strong className="text-hack-black">you have NOT been double-charged.</strong>
          {' '}Our team will process your order manually within 2–4 hours.
        </p>

        {/* Payment ID Card */}
        {paymentId && (
          <div className="bg-hack-black rounded-2xl p-6 mb-8 text-left">
            <p className="text-xs font-mono uppercase tracking-widest text-hack-white/50 mb-2">
              Your Razorpay Payment ID
            </p>
            <div className="flex items-center gap-3">
              <code className="text-hack-yellow font-mono text-sm flex-1 break-all">
                {paymentId}
              </code>
              <button
                onClick={copyId}
                className="shrink-0 w-9 h-9 rounded-lg bg-hack-white/10 hover:bg-hack-yellow/20 flex items-center justify-center transition-colors"
                aria-label="Copy payment ID"
              >
                {copied ? (
                  <span className="text-xs text-green-400 font-bold">✓</span>
                ) : (
                  <Copy className="w-4 h-4 text-hack-white/60" />
                )}
              </button>
            </div>
            <p className="text-xs text-hack-white/40 mt-3">
              Save this ID — it's your proof of payment. Share it when contacting support.
            </p>
          </div>
        )}

        {/* What happens next */}
        <div className="bg-hack-black/5 rounded-2xl p-6 mb-8 text-left space-y-3">
          <h3 className="font-display font-bold text-hack-black text-sm uppercase tracking-wide mb-3">
            What happens next
          </h3>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-hack-yellow flex items-center justify-center text-xs font-bold text-hack-black shrink-0 mt-0.5">1</span>
            <p className="text-sm text-hack-black/70">
              Our team receives an alert and manually confirms your payment within 2–4 hours.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-hack-yellow flex items-center justify-center text-xs font-bold text-hack-black shrink-0 mt-0.5">2</span>
            <p className="text-sm text-hack-black/70">
              You'll receive an email with your download links once the order is confirmed.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-hack-yellow flex items-center justify-center text-xs font-bold text-hack-black shrink-0 mt-0.5">3</span>
            <p className="text-sm text-hack-black/70">
              If you don't hear from us within 4 hours, contact support with your Payment ID above.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/contact"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-hack-black text-hack-white rounded-full font-bold text-sm hover:bg-hack-black/80 transition-colors"
          >
            <Mail className="w-4 h-4" />
            Contact Support
          </Link>
          <Link
            to="/shop"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-hack-black/20 text-hack-black rounded-full font-medium text-sm hover:border-hack-black/40 transition-colors"
          >
            Continue Shopping
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <p className="text-xs text-hack-black/40 mt-8">
          Email us at{' '}
          <a href="mailto:support@hackknow.com" className="text-hack-magenta hover:text-hack-orange transition-colors">
            support@hackknow.com
          </a>
          {' '}or call{' '}
          <a href="tel:+918796018700" className="text-hack-magenta hover:text-hack-orange transition-colors">
            +91 87960 18700
          </a>
        </p>
      </div>
    </div>
  );
};

export default OrderPendingPage;
