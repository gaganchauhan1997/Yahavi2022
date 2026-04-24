import { Download, CheckCircle, DollarSign, Globe } from "lucide-react";

const features = [
  {
    icon: Download,
    title: "Instant Download",
    description:
      "Get immediate access to your purchased digital assets. No waiting, no shipping — just download and start using right away.",
    color: "bg-hack-yellow/20 text-hack-black",
  },
  {
    icon: CheckCircle,
    title: "Quality Checked",
    description:
      "Every product on Hackknow is handpicked and quality verified by our team. Only premium assets make it to our marketplace.",
    color: "bg-hack-magenta/20 text-hack-magenta",
  },
  {
    icon: DollarSign,
    title: "Affordable Pricing",
    description:
      "Premium digital products at prices that won't break the bank. Best value for creators, entrepreneurs, and businesses.",
    color: "bg-hack-orange/20 text-hack-orange",
  },
  {
    icon: Globe,
    title: "Global Use License",
    description:
      "Use our assets in personal and commercial projects worldwide. Simple licensing with no hidden restrictions or fees.",
    color: "bg-green-100 text-green-700",
  },
];

export default function WhySection() {
  return (
    <section className="w-full px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12 lg:mb-16">
          <span className="inline-block text-xs font-mono uppercase tracking-widest text-hack-magenta mb-3">
            Why Hackknow
          </span>
          <h2 className="font-display font-bold text-3xl lg:text-5xl tracking-tight mb-4">
            The Smart Choice for
            <br />
            <span className="text-gradient">Digital Creators</span>
          </h2>
          <p className="text-hack-black/60 max-w-xl mx-auto">
            Join thousands of satisfied customers who trust Hackknow for their
            digital product needs.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 lg:p-8 rounded-2xl lg:rounded-3xl bg-white border border-hack-black/5 hover:border-hack-yellow/50 transition-all duration-300 hover:shadow-glow"
            >
              <div
                className={`w-14 h-14 rounded-2xl ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}
              >
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="font-display font-bold text-lg mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-hack-black/60 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
