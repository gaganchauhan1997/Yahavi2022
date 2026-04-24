import { useState } from "react";
import { Search, Mail, FileText, HelpCircle, RotateCcw, Shield, CreditCard } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const faqCategories = [
  {
    id: "general",
    label: "General",
    icon: HelpCircle,
    faqs: [
      {
        q: "What is Hackknow?",
        a: "Hackknow is a digital marketplace where creators can buy and sell premium digital products including templates, dashboards, spreadsheets, presentation decks, and more.",
      },
      {
        q: "How do I create an account?",
        a: "Click on the 'Sign In' button in the top right corner and follow the registration process. You can sign up using your email address or social accounts.",
      },
      {
        q: "Is Hackknow available worldwide?",
        a: "Yes! Hackknow serves customers in over 120 countries. All our products are digital downloads, so you can access them from anywhere in the world.",
      },
    ],
  },
  {
    id: "downloads",
    label: "Downloads",
    icon: FileText,
    faqs: [
      {
        q: "How do I download my purchased products?",
        a: "After purchase, you can download your products from the 'Downloads' section in your account dashboard. You'll also receive download links via email.",
      },
      {
        q: "How many times can I download a product?",
        a: "You can download each purchased product up to 10 times. If you need more downloads, contact our support team.",
      },
      {
        q: "What file formats are available?",
        a: "File formats vary by product. Common formats include PDF, XLSX, PPTX, FIG, SKETCH, PSD, AI, and SVG. Each product listing specifies available formats.",
      },
    ],
  },
  {
    id: "payment",
    label: "Payment",
    icon: CreditCard,
    faqs: [
      {
        q: "What payment methods do you accept?",
        a: "We accept all major credit/debit cards (Visa, Mastercard, American Express), PayPal, UPI, and select digital wallets.",
      },
      {
        q: "Is my payment information secure?",
        a: "Absolutely. We use industry-standard SSL encryption and PCI-compliant payment processors. Your payment information is never stored on our servers.",
      },
      {
        q: "Will I be charged automatically for subscriptions?",
        a: "Hackknow does not use subscription billing. All purchases are one-time payments unless explicitly stated otherwise.",
      },
    ],
  },
  {
    id: "refund",
    label: "Refunds",
    icon: RotateCcw,
    faqs: [
      {
        q: "What is your refund policy?",
        a: "We offer a 30-day money-back guarantee on all purchases. If you're not satisfied, contact our support team for a full refund.",
      },
      {
        q: "How long do refunds take to process?",
        a: "Refunds are typically processed within 3-5 business days. The time it takes to reflect in your account depends on your payment method.",
      },
      {
        q: "Can I exchange a product for another?",
        a: "Yes, within 14 days of purchase, you can exchange a product for another of equal or lesser value. Contact support to arrange an exchange.",
      },
    ],
  },
  {
    id: "license",
    label: "License",
    icon: Shield,
    faqs: [
      {
        q: "What license comes with products?",
        a: "All products include a standard commercial license allowing use in personal and commercial projects. Extended licenses are available for specific products.",
      },
      {
        q: "Can I resell products I buy?",
        a: "No, purchased products cannot be resold as-is. However, you can use them in your own projects, including client work and commercial products.",
      },
      {
        q: "Do I need to credit the author?",
        a: "Credit is appreciated but not required for most products. Check individual product listings for specific attribution requirements.",
      },
    ],
  },
];

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaqs = searchQuery
    ? faqCategories
        .map((cat) => ({
          ...cat,
          faqs: cat.faqs.filter(
            (f) =>
              f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
              f.a.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((cat) => cat.faqs.length > 0)
    : faqCategories;

  return (
    <div className="pt-28 pb-20">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-mono uppercase tracking-widest text-hack-magenta mb-4">
              Help Center
            </span>
            <h1 className="font-display font-bold text-4xl lg:text-5xl tracking-tight mb-4">
              How Can We Help?
            </h1>
            <p className="text-hack-black/60 max-w-lg mx-auto">
              Find answers to common questions about purchasing, downloading,
              and using products from Hackknow.
            </p>
          </div>

          {/* Search */}
          <div className="relative max-w-xl mx-auto mb-12">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-hack-black/40" />
            <input
              type="text"
              placeholder="Search for answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-hack-black/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-hack-yellow focus:border-transparent"
            />
          </div>

          {/* FAQ Tabs */}
          {!searchQuery && (
            <Tabs defaultValue="general" className="mb-12">
              <TabsList className="bg-hack-black/5 rounded-full p-1 flex flex-wrap h-auto gap-1">
                {faqCategories.map((cat) => (
                  <TabsTrigger
                    key={cat.id}
                    value={cat.id}
                    className="rounded-full px-4 py-2 data-[state=active]:bg-hack-black data-[state=active]:text-hack-white text-sm"
                  >
                    <cat.icon className="w-4 h-4 mr-1.5" />
                    {cat.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {faqCategories.map((cat) => (
                <TabsContent key={cat.id} value={cat.id} className="mt-6">
                  <Accordion type="single" collapsible className="space-y-3">
                    {cat.faqs.map((faq, index) => (
                      <AccordionItem
                        key={index}
                        value={`${cat.id}-${index}`}
                        className="border border-hack-black/10 rounded-2xl px-5 data-[state=open]:border-hack-yellow/50 transition-colors"
                      >
                        <AccordionTrigger className="text-left text-sm font-medium py-4 hover:no-underline">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-hack-black/60 leading-relaxed pb-4">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </TabsContent>
              ))}
            </Tabs>
          )}

          {/* Search Results */}
          {searchQuery && (
            <div className="mb-12 space-y-6">
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((cat) => (
                  <div key={cat.id}>
                    <h3 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
                      <cat.icon className="w-5 h-5" />
                      {cat.label}
                    </h3>
                    <Accordion
                      type="single"
                      collapsible
                      className="space-y-3"
                    >
                      {cat.faqs.map((faq, index) => (
                        <AccordionItem
                          key={index}
                          value={`${cat.id}-${index}`}
                          className="border border-hack-black/10 rounded-2xl px-5 data-[state=open]:border-hack-yellow/50 transition-colors"
                        >
                          <AccordionTrigger className="text-left text-sm font-medium py-4 hover:no-underline">
                            {faq.q}
                          </AccordionTrigger>
                          <AccordionContent className="text-sm text-hack-black/60 leading-relaxed pb-4">
                            {faq.a}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <p className="text-hack-black/60">
                    No results found for &ldquo;{searchQuery}&rdquo;
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Contact CTA */}
          <div className="bg-hack-black rounded-3xl p-8 lg:p-12 text-center">
            <Mail className="w-10 h-10 text-hack-yellow mx-auto mb-4" />
            <h2 className="font-display font-bold text-2xl text-hack-white mb-3">
              Still Need Help?
            </h2>
            <p className="text-hack-white/60 mb-6 max-w-md mx-auto">
              Our support team is available 24/7 to assist you with any
              questions or concerns.
            </p>
            <a
              href="mailto:support@hackknow.com"
              className="inline-flex items-center gap-2 px-8 py-4 bg-hack-yellow text-hack-black rounded-full font-bold hover:bg-hack-yellow/90 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
