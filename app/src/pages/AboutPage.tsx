import { TrendingUp, Users, Globe, Award } from "lucide-react";

const stats = [
  { icon: Users, value: "50K+", label: "Happy Customers", color: "bg-hack-yellow/20" },
  { icon: TrendingUp, value: "10K+", label: "Premium Assets", color: "bg-hack-magenta/20" },
  { icon: Globe, value: "120+", label: "Countries Served", color: "bg-hack-orange/20" },
  { icon: Award, value: "99%", label: "Satisfaction Rate", color: "bg-green-100" },
];

const values = [
  {
    title: "Quality First",
    description:
      "Every product on our platform is handpicked and quality-verified. We never compromise on the standard of digital assets we offer.",
  },
  {
    title: "Creator-First",
    description:
      "We put creators at the center of everything we do. Fair pricing, transparent policies, and tools that help you succeed.",
  },
  {
    title: "Community Driven",
    description:
      "Our vibrant community of 50,000+ creators drives innovation. We listen, adapt, and grow together.",
  },
  {
    title: "Always Accessible",
    description:
      "Premium digital products shouldn't cost a fortune. We make professional-grade assets affordable for everyone.",
  },
];

export default function AboutPage() {
  return (
    <div className="pt-28 pb-20">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-mono uppercase tracking-widest text-hack-magenta mb-4">
              About Hackknow
            </span>
            <h1 className="font-display font-bold text-4xl lg:text-6xl tracking-tight mb-6">
              Empowering Creators
              <br />
              <span className="text-gradient">Worldwide</span>
            </h1>
            <p className="text-lg text-hack-black/60 max-w-2xl mx-auto leading-relaxed">
              Hackknow is India&apos;s leading digital marketplace, connecting
              creators with premium templates, dashboards, and digital assets.
              We believe great tools should be accessible to everyone.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center p-6 rounded-2xl bg-white border border-hack-black/5"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center mx-auto mb-3`}
                >
                  <stat.icon className="w-6 h-6" />
                </div>
                <p className="font-display font-bold text-2xl lg:text-3xl">
                  {stat.value}
                </p>
                <p className="text-xs text-hack-black/50 font-mono mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* Mission */}
          <div className="bg-hack-black rounded-3xl p-8 lg:p-12 mb-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="font-display font-bold text-3xl text-hack-white mb-4">
                  Our Mission
                </h2>
                <p className="text-hack-white/70 leading-relaxed mb-4">
                  To democratize access to professional-grade digital tools and
                  templates. We believe that everyone — from startups to
                  enterprises, students to professionals — deserves access to
                  high-quality digital assets that help them work smarter, create
                  faster, and achieve more.
                </p>
                <p className="text-hack-white/70 leading-relaxed">
                  Built with passion in India, designed for the world. Hackknow
                  represents the new wave of Indian digital innovation —
                  world-class quality at accessible prices.
                </p>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-48 h-48 rounded-full bg-gradient-brand flex items-center justify-center">
                  <span className="font-display font-bold text-5xl text-white">
                    HK
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Values */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <h2 className="font-display font-bold text-3xl lg:text-4xl tracking-tight mb-3">
                Our Values
              </h2>
              <p className="text-hack-black/60">
                The principles that guide everything we do at Hackknow.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {values.map((value, index) => (
                <div
                  key={index}
                  className="p-6 rounded-2xl bg-white border border-hack-black/5 hover:border-hack-yellow/50 transition-all"
                >
                  <h3 className="font-display font-bold text-lg mb-2">
                    {value.title}
                  </h3>
                  <p className="text-sm text-hack-black/60 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <h2 className="font-display font-bold text-2xl lg:text-3xl mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-hack-black/60 mb-6">
              Browse our collection of 10,000+ premium digital assets.
            </p>
            <a
              href="/shop"
              className="inline-flex items-center gap-2 px-8 py-4 bg-hack-black text-hack-white rounded-full font-bold hover:bg-hack-black/80 transition-colors"
            >
              Explore Products
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
