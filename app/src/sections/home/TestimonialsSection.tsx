import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "UX Designer",
    avatar: "SC",
    content:
      "Hackknow has completely transformed how I source design assets. The quality is consistently outstanding, and the prices are incredibly fair. I've saved countless hours on projects.",
    rating: 5,
  },
  {
    name: "Marcus Johnson",
    role: "Startup Founder",
    avatar: "MJ",
    content:
      "The PowerPoint templates and pitch decks from Hackknow helped us secure our Series A funding. Professional, polished, and easy to customize. Highly recommended!",
    rating: 5,
  },
  {
    name: "Priya Sharma",
    role: "Marketing Manager",
    avatar: "PS",
    content:
      "Our social media engagement increased by 40% after using templates from Hackknow. The social media kits are comprehensive and beautifully designed. Worth every penny.",
    rating: 5,
  },
  {
    name: "David Kim",
    role: "Financial Analyst",
    avatar: "DK",
    content:
      "The Excel templates and financial dashboards are game-changers. Clean, well-structured, and professional. I use them for all my client presentations now.",
    rating: 5,
  },
];

export default function TestimonialsSection() {
  return (
    <section className="w-full px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12 lg:mb-16">
          <span className="inline-block text-xs font-mono uppercase tracking-widest text-hack-orange mb-3">
            Testimonials
          </span>
          <h2 className="font-display font-bold text-3xl lg:text-5xl tracking-tight">
            Loved by{" "}
            <span className="text-gradient">50,000+ Creators</span>
          </h2>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="p-6 lg:p-8 rounded-2xl lg:rounded-3xl bg-white border border-hack-black/5 hover:border-hack-yellow/50 transition-all duration-300"
            >
              {/* Quote Icon */}
              <Quote className="w-8 h-8 text-hack-yellow mb-4" />

              {/* Content */}
              <p className="text-hack-black/70 text-sm lg:text-base leading-relaxed mb-6">
                &ldquo;{testimonial.content}&rdquo;
              </p>

              {/* Rating */}
              <div className="flex gap-1 mb-5">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-hack-yellow text-hack-yellow"
                  />
                ))}
              </div>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center text-white text-sm font-bold">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {testimonial.name}
                  </p>
                  <p className="text-xs text-hack-black/50">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
