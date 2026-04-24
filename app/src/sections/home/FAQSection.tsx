import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How do I download my purchased products?",
    answer:
      "After completing your purchase, you'll receive an email with download links. You can also access all your purchases anytime from your account dashboard under the 'Downloads' section. All files are available for instant download.",
  },
  {
    question: "What license comes with the products?",
    answer:
      "All products on Hackknow come with a standard commercial license, allowing you to use them in both personal and commercial projects. Some products may have extended licenses available for specific use cases like resale or large-scale distribution.",
  },
  {
    question: "Can I get a refund if I'm not satisfied?",
    answer:
      "Yes! We offer a 30-day money-back guarantee on all purchases. If you're not completely satisfied with your purchase, simply contact our support team and we'll process your refund within 3-5 business days.",
  },
  {
    question: "Are the templates compatible with my software?",
    answer:
      "Our products are compatible with the most popular software. Each product listing includes detailed compatibility information. We support Microsoft Office, Google Workspace, Adobe Creative Suite, Figma, Sketch, Canva, and more.",
  },
  {
    question: "How often are new products added?",
    answer:
      "We add new products every week! Subscribe to our newsletter to get notified about the latest additions, exclusive deals, and free resources.",
  },
  {
    question: "Do you offer custom template services?",
    answer:
      "Yes! If you need a custom template or have specific requirements, you can submit a request through our community forum or contact our support team. Many of our sellers also offer customization services.",
  },
];

export default function FAQSection() {
  return (
    <section className="w-full px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
      <div className="max-w-3xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12 lg:mb-16">
          <span className="inline-block text-xs font-mono uppercase tracking-widest text-hack-magenta mb-3">
            Got Questions?
          </span>
          <h2 className="font-display font-bold text-3xl lg:text-5xl tracking-tight">
            Frequently Asked{" "}
            <span className="text-gradient">Questions</span>
          </h2>
        </div>

        {/* FAQ Accordion */}
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`faq-${index}`}
              className="border border-hack-black/10 rounded-2xl px-5 lg:px-6 data-[state=open]:border-hack-yellow/50 transition-colors"
            >
              <AccordionTrigger className="text-left text-sm lg:text-base font-medium py-5 hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-hack-black/60 leading-relaxed pb-5">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
