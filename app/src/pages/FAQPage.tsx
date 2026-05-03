import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, HelpCircle, MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

const faqs = [
  {
    category: 'General',
    questions: [
      {
        q: 'What is HackKnow?',
        a: 'HackKnow is India\'s premium digital marketplace where creators and professionals can buy and download high-quality digital products including Excel templates, MIS dashboards, PowerPoint decks, website templates, marketing kits, and self-paced courses. We offer 233+ premium products across 28 categories, trusted by 10,000+ Indian professionals.'
      },
      {
        q: 'How do I create an account on HackKnow?',
        a: 'Click the "Sign Up" button in the top right corner, enter your email and password, and verify your email. The whole process takes less than 60 seconds, and your account is free forever.'
      },
      {
        q: 'Is HackKnow free to use?',
        a: 'Yes — creating an account, browsing the entire catalogue, and downloading our 100+ free resources is completely free. You only pay when you choose to buy a premium template, dashboard, or course.'
      },
      {
        q: 'Where is HackKnow based?',
        a: 'HackKnow is proudly Made in India and built for the world. Our team is based in India and we ship digital products to customers across India, the United States, the United Kingdom, the UAE, Canada, Australia, and 50+ other countries.'
      }
    ]
  },
  {
    category: 'Purchases & Payments',
    questions: [
      {
        q: 'How do downloads work after purchase?',
        a: 'The moment your payment is confirmed, you get an instant email with your download link. You can also re-download anytime from "My Orders" inside your account dashboard. Downloads are unlimited for life — no expiry, no monthly limits.'
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We accept all major credit cards, debit cards, UPI (Google Pay, PhonePe, Paytm), net banking from 50+ Indian banks, and digital wallets — all through our secure payment partner Razorpay. International cards are also accepted.'
      },
      {
        q: 'Are payments on HackKnow secure?',
        a: 'Yes — every transaction is processed via Razorpay\'s PCI-DSS Level 1 certified gateway with end-to-end encryption. We never see or store your card details. Our checkout uses HTTPS with HSTS preload, and the entire site runs on HTTP/2 with TLS 1.3.'
      },
      {
        q: 'What is your refund policy?',
        a: 'Because our products are instantly downloadable digital files, refunds are limited. However, if a download is broken, the file is corrupted, or the product is materially different from the description, contact support@hackknow.com within 7 days and we will refund or replace it. See our full Refund Policy for details.'
      }
    ]
  },
  {
    category: 'Products & Quality',
    questions: [
      {
        q: 'What kinds of products can I buy on HackKnow?',
        a: 'Premium Excel dashboards (sales, finance, HR, MIS), PowerPoint presentation templates, website themes (HTML, WordPress), marketing kits, social media templates, business document templates, calculators, calendars, courses on Excel & MIS reporting, career roadmaps, and much more — across 28 curated categories.'
      },
      {
        q: 'Are the templates editable?',
        a: 'Yes — every Excel, PowerPoint, and document template ships in fully editable native format (.xlsx, .pptx, .docx). Website templates ship with editable source files. You own the files for life and can adapt them freely for personal or commercial use under our standard licence.'
      },
      {
        q: 'How is HackKnow different from Envato or Flipkart?',
        a: 'HackKnow is curated specifically for the Indian professional and SME market. Pricing is in INR with UPI checkout, products are sized for Indian business workflows (GST-ready invoices, INR formatting, Indian fiscal year calendars), and our support is India-timezone-friendly. We are also smaller and more curated — every listing is hand-reviewed.'
      }
    ]
  },
  {
    category: 'Selling on HackKnow',
    questions: [
      {
        q: 'How do I become a seller / vendor?',
        a: 'Anyone can sell on HackKnow. Create a free account, visit /become-a-vendor, submit a short application with samples of your work, and our team reviews it within 24-48 hours. Once approved, you can list unlimited products from your seller dashboard.'
      },
      {
        q: 'What commission does HackKnow charge sellers?',
        a: 'Sellers keep 70% of every sale; HackKnow takes a 30% commission which covers payment processing, hosting, customer support, marketing, and platform development. There is no upfront fee, no monthly subscription, and no listing charge.'
      },
      {
        q: 'When and how do sellers get paid?',
        a: 'Payouts are processed weekly. Once your seller balance crosses ₹500, you can request payout to any Indian bank account or UPI ID — typically credited within 1-2 business days.'
      }
    ]
  },
  {
    category: 'Technical & Files',
    questions: [
      {
        q: 'What file formats does HackKnow support?',
        a: 'We host every common business and design format: .xlsx, .xlsm, .pptx, .docx, .pdf, .zip, .html, .css, .js, .psd, .fig, .sketch, .ai, .png, .jpg, .svg, .mp4, and more. Each product page lists exactly which formats are included.'
      },
      {
        q: 'How do I open the files I download?',
        a: 'Most files open with standard tools you probably already have: Microsoft Office (Excel, PowerPoint, Word), Google Workspace (Sheets, Slides, Docs), or free alternatives like LibreOffice. Design files need Figma, Adobe Photoshop, or Sketch.'
      },
      {
        q: 'Is there a file size limit?',
        a: 'Single files can be up to 500 MB. For larger products (full website themes with assets, video courses, etc.), we serve them as cloud-hosted bundles with download-resume support — so even slow connections finish reliably.'
      }
    ]
  }
];

// Flat array for JSON-LD generation
const allFaqs = faqs.flatMap(s => s.questions);

const FAQPage = () => {
  const [openItems, setOpenItems] = useState<{[key: string]: boolean}>({});

  // Inject FAQPage JSON-LD on mount, remove on unmount.
  // This is the structured data Google uses to render rich-snippet
  // FAQ accordions directly inside the search result — huge SERP real-estate win.
  useEffect(() => {
    const id = 'hk-faqpage-ld';
    const json = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: allFaqs.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    };
    let el = document.getElementById(id) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(json);
    return () => { el?.remove(); };
  }, []);

  const toggleItem = (key: string) => {
    setOpenItems(prev => ({...prev, [key]: !prev[key]}));
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
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-hack-yellow/20 flex items-center justify-center">
                <HelpCircle className="w-6 h-6 text-hack-yellow" />
              </div>
              <h1 className="font-display font-bold text-4xl lg:text-5xl">
                Frequently Asked Questions
              </h1>
            </div>
            <p className="text-hack-white/60 text-lg max-w-2xl">
              Find answers to common questions about buying, selling, and using HackKnow.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="max-w-4xl mx-auto">
          {faqs.map((section, sectionIdx) => (
            <div key={section.category} className="mb-12">
              <h2 className="font-display font-bold text-2xl mb-6 text-hack-black">
                {section.category}
              </h2>
              <div className="space-y-4">
                {section.questions.map((item, idx) => {
                  const key = `${sectionIdx}-${idx}`;
                  const isOpen = openItems[key];
                  return (
                    <div 
                      key={key}
                      className="bg-white rounded-2xl border border-hack-black/5 overflow-hidden"
                    >
                      <button
                        onClick={() => toggleItem(key)}
                        className="w-full flex items-center justify-between p-5 text-left hover:bg-hack-black/5 transition-colors"
                      >
                        <span className="font-bold text-hack-black pr-4">{item.q}</span>
                        <ChevronDown 
                          className={`w-5 h-5 text-hack-black/40 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
                        />
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-5">
                          <p className="text-hack-black/70 leading-relaxed">
                            {item.a}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Still Need Help */}
          <div className="bg-gradient-to-br from-hack-yellow to-hack-orange rounded-3xl p-8 lg:p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-hack-black/10 flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-hack-black" />
            </div>
            <h2 className="font-display font-bold text-2xl lg:text-3xl text-hack-black mb-4">
              Still Have Questions?
            </h2>
            <p className="text-hack-black/70 mb-6 max-w-md mx-auto">
              Can not find what you are looking for? Our support team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link 
                to="/contact"
                className="inline-flex items-center justify-center px-6 py-3 bg-hack-black text-white rounded-full font-bold hover:bg-hack-black/80 transition-colors"
              >
                Contact Support
              </Link>
              <Link 
                to="/support"
                className="inline-flex items-center justify-center px-6 py-3 bg-white/20 text-hack-black rounded-full font-bold hover:bg-white/30 transition-colors"
              >
                Help Center
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
