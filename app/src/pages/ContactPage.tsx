import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, Send, MessageSquare, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/* CF7 form hash from shortcode: [contact-form-7 id="99cfbdb" title="Hackknow Contact Us"] */
const CF7_ENDPOINT = 'https://shop.hackknow.com/wp-json/contact-form-7/v1/contact-forms/959/feedback';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    // Build CF7 form-data payload (CF7 REST API expects multipart/form-data or urlencoded)
    const body = new URLSearchParams({
      'your-name':    formData.name,
      'your-email':   formData.email,
      'your-subject': formData.subject,
      'your-message': formData.message,
    });

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(CF7_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const json = await res.json().catch(() => null);

      // CF7 returns status "mail_sent" on success
      if (json?.status === 'mail_sent') {
        setIsSubmitted(true);
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        // CF7 validation error or spam — show server message
        const msg = json?.message || 'Message could not be sent. Please try again.';
        setErrorMsg(msg);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setErrorMsg('Request timed out. Please email us directly at support@hackknow.com');
      } else {
        setErrorMsg('Unable to connect. Please email us at support@hackknow.com');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <h1 className="font-display font-bold text-4xl lg:text-5xl mb-4">
              Contact Us
            </h1>
            <p className="text-hack-white/60 text-lg max-w-2xl">
              Have a question or need help? We are here to assist you. Reach out to our team.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div>
              <h2 className="font-display font-bold text-2xl mb-6">Get in Touch</h2>
              <p className="text-hack-black/60 mb-8">
                Our support team is available Monday to Friday, 9 AM to 6 PM IST. 
                We typically respond within 24 hours.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-hack-yellow/20 flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6 text-hack-yellow" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">Email Us</h3>
                    <p className="text-hack-black/60 text-sm mb-1">For general inquiries</p>
                    <a 
                      href="mailto:support@hackknow.com" 
                      className="text-hack-magenta hover:text-hack-orange transition-colors"
                    >
                      support@hackknow.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-hack-magenta/20 flex items-center justify-center shrink-0">
                    <Phone className="w-6 h-6 text-hack-magenta" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">Call Us</h3>
                    <p className="text-hack-black/60 text-sm mb-1">Mon-Fri, 9AM-6PM IST</p>
                    <a 
                      href="tel:+918796018700" 
                      className="text-hack-magenta hover:text-hack-orange transition-colors"
                    >
                      +91 87960 18700
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-hack-orange/20 flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6 text-hack-orange" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">Visit Us</h3>
                    <p className="text-hack-black/60 text-sm">
                      123 Digital Street<br />
                      Tech Park, Bangalore<br />
                      Karnataka, India 560001
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">Business Hours</h3>
                    <p className="text-hack-black/60 text-sm">
                      Monday - Friday: 9:00 AM - 6:00 PM IST<br />
                      Saturday - Sunday: Closed
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="mt-8 pt-8 border-t border-hack-black/10">
                <h3 className="font-bold text-lg mb-4">Quick Links</h3>
                <div className="flex flex-wrap gap-3">
                  <Link 
                    to="/support" 
                    className="inline-flex items-center gap-2 px-4 py-2 bg-hack-black/5 rounded-full text-sm hover:bg-hack-yellow/20 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Help Center
                  </Link>
                  <Link 
                    to="/support" 
                    className="inline-flex items-center gap-2 px-4 py-2 bg-hack-black/5 rounded-full text-sm hover:bg-hack-yellow/20 transition-colors"
                  >
                    FAQ
                  </Link>
                  <Link 
                    to="/affiliate" 
                    className="inline-flex items-center gap-2 px-4 py-2 bg-hack-black/5 rounded-full text-sm hover:bg-hack-yellow/20 transition-colors"
                  >
                    Affiliate Program
                  </Link>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white rounded-3xl p-6 lg:p-8 border border-hack-black/5">
              {isSubmitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Send className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="font-display font-bold text-xl mb-2">Message Sent!</h3>
                  <p className="text-hack-black/60 mb-6">
                    Thank you for reaching out. We will get back to you within 24 hours.
                  </p>
                  <Button 
                    onClick={() => setIsSubmitted(false)}
                    variant="outline"
                    className="border-hack-black/20"
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="font-display font-bold text-xl mb-6">Send us a Message</h2>
                  
                  {errorMsg && (
                    <div className="mb-4 flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Your Name</label>
                      <Input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="John Doe"
                        className="h-12"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Email Address</label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="you@yourdomain.com"
                        className="h-12"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Subject</label>
                      <Input
                        type="text"
                        value={formData.subject}
                        onChange={(e) => setFormData({...formData, subject: e.target.value})}
                        placeholder="How can we help?"
                        className="h-12"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Message</label>
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                        placeholder="Tell us more about your inquiry..."
                        rows={5}
                        className="w-full px-4 py-3 rounded-xl bg-hack-white border border-hack-black/10 focus:outline-none focus:border-hack-yellow focus:ring-1 focus:ring-hack-yellow resize-none"
                        required
                      />
                    </div>
                    <Button 
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-12 bg-gradient-to-r from-hack-yellow to-hack-orange text-hack-black font-bold rounded-xl"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Sending...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Send className="w-5 h-5" />
                          Send Message
                        </span>
                      )}
                    </Button>
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
