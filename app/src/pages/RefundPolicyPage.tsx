import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, CheckCircle, XCircle, Clock } from 'lucide-react';

const RefundPolicyPage = () => {
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
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-hack-yellow/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-hack-yellow" />
              </div>
              <h1 className="font-display font-bold text-4xl lg:text-5xl">
                Refund Policy
              </h1>
            </div>
            <p className="text-hack-white/60 text-lg max-w-2xl">
              Fair, transparent and India-legal refund rules for digital products.
            </p>
            <p className="text-xs font-mono text-hack-white/40 mt-4">Last updated: 29 April 2026 • Operated from Delhi, India</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="max-w-3xl mx-auto">
          <div className="prose prose-lg max-w-none">
            <p className="text-hack-black/70 text-lg leading-relaxed mb-8">
              HackKnow sells <strong>digital, downloadable products</strong>. Once a file has been
              successfully delivered to your device, it cannot be physically returned. This policy
              explains exactly when we will refund — and when we will not — in line with the Indian
              Consumer Protection Act, 2019 and accepted international e-commerce practice.
            </p>

            {/* Non-Refundable Section */}
            <div className="bg-red-50 rounded-2xl p-6 mb-8 border border-red-100">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-xl text-red-700 mb-2">
                    Non-Refundable Items
                  </h2>
                  <p className="text-red-600/80 mb-4">
                    The following situations do not qualify for refunds:
                  </p>
                  <ul className="space-y-2 text-red-600/80">
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">•</span>
                      <span>Downloaded or accessed digital products</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">•</span>
                      <span>Changed your mind after purchase</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">•</span>
                      <span>Product does not meet your expectations (please review screenshots/descriptions before purchase)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">•</span>
                      <span>Lack of technical knowledge to use the product</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Eligible Refunds */}
            <div className="bg-green-50 rounded-2xl p-6 mb-8 border border-green-100">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-xl text-green-700 mb-2">
                    Eligible for Refund
                  </h2>
                  <p className="text-green-600/80 mb-4">
                    Refunds may be granted in these situations:
                  </p>
                  <ul className="space-y-2 text-green-600/80">
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>
                      <span>Product file is corrupted or cannot be opened</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>
                      <span>Significantly different from the product description</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>
                      <span>Missing files that were advertised in the listing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>
                      <span>Duplicate purchase of the same product</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>
                      <span>Technical issues preventing download (within 24 hours)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Time Limit */}
            <div className="bg-hack-yellow/10 rounded-2xl p-6 mb-8 border border-hack-yellow/20">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-hack-yellow/20 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-hack-yellow" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-xl text-hack-black mb-2">
                    Time Limit for Refund Requests
                  </h2>
                  <p className="text-hack-black/70">
                    All refund requests must be submitted within <strong>7 days</strong> of the purchase date. 
                    Requests submitted after this period will not be considered unless there are 
                    exceptional circumstances.
                  </p>
                </div>
              </div>
            </div>

            {/* How to Request */}
            <h2 className="font-display font-bold text-2xl text-hack-black mb-4">
              How to Request a Refund
            </h2>
            <ol className="space-y-4 text-hack-black/70 mb-8">
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-full bg-hack-black text-white flex items-center justify-center text-sm font-bold shrink-0">1</span>
                <span>Contact our support team at <a href="mailto:support@hackknow.com" className="text-hack-magenta hover:text-hack-orange">support@hackknow.com</a></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-full bg-hack-black text-white flex items-center justify-center text-sm font-bold shrink-0">2</span>
                <span>Include your order number and detailed reason for the refund request</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-full bg-hack-black text-white flex items-center justify-center text-sm font-bold shrink-0">3</span>
                <span>Attach screenshots if applicable (for technical issues)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-full bg-hack-black text-white flex items-center justify-center text-sm font-bold shrink-0">4</span>
                <span>Allow up to 5 business days for review and response</span>
              </li>
            </ol>

            {/* Processing Time */}
            <h2 className="font-display font-bold text-2xl text-hack-black mb-4">
              Refund Processing
            </h2>
            <p className="text-hack-black/70 mb-8">
              Approved refunds are processed within 5-10 business days. The refund will be 
              credited to your original payment method. Depending on your bank or payment 
              provider, it may take additional time for the funds to appear in your account.
            </p>

            {/* Creator Disputes */}
            <h2 className="font-display font-bold text-2xl text-hack-black mb-4">
              Dispute Resolution
            </h2>
            <p className="text-hack-black/70 mb-8">
              If you disagree with our refund decision, you may request a review by our 
              dispute resolution team. Please provide any additional information that 
              supports your case. Our team will review and provide a final decision 
              within 10 business days.
            </p>

            {/* Chargeback notice */}
            <h2 className="font-display font-bold text-2xl text-hack-black mb-4">
              Chargebacks & Payment Disputes
            </h2>
            <p className="text-hack-black/70 mb-8">
              Filing a chargeback with your bank or card network for a successfully downloaded
              digital product, without first contacting our support team, is treated as a payment
              dispute. We will share the order log, IP, download timestamp and any communication with
              the payment provider to respond. Repeat chargeback offenders may have their HackKnow
              account suspended.
            </p>

            {/* Jurisdiction */}
            <h2 className="font-display font-bold text-2xl text-hack-black mb-4">
              Governing Law
            </h2>
            <p className="text-hack-black/70 mb-8">
              This refund policy is governed by the laws of India. Disputes are subject to the
              exclusive jurisdiction of the courts at Delhi, India. Statutory rights granted to
              consumers under their local laws are not affected.
            </p>

            {/* Contact */}
            <div className="bg-hack-black rounded-2xl p-6 lg:p-8 text-white text-center">
              <h2 className="font-display font-bold text-xl mb-3">Questions About Refunds?</h2>
              <p className="text-white/60 mb-4">
                Email <a href="mailto:support@hackknow.com" className="text-hack-yellow">support@hackknow.com</a> or call <a href="tel:+918796018700" className="text-hack-yellow">+91 87960 18700</a>.
              </p>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center px-6 py-3 bg-hack-yellow text-hack-black rounded-full font-bold hover:bg-hack-yellow/90 transition-colors"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicyPage;
