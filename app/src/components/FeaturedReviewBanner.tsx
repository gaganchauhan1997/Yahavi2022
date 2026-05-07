import { Star, ExternalLink, Linkedin, Quote } from "lucide-react";

const SAURABH_LINKEDIN_URL =
  "https://www.linkedin.com/posts/saurabhch27-451152164_hackknow-premium-excel-templates-dashboards-share-7458277435327868929-37Fj";

const SAURABH_QUOTE =
  "While traveling across Germany, I explored multiple AI tools, MIS dashboard systems, SEO workflow platforms, Excel automation resources, and operational learning ecosystems. One platform that genuinely stood out was HackKnow.com. The MIS Dashboards felt practical for analysts — KPI structures, workflow automation, and operational thinking, instead of just theory-based tutorials.";

export default function FeaturedReviewBanner() {
  return (
    <section className="w-full px-4 sm:px-6 lg:px-8 py-10 lg:py-14 bg-gradient-to-br from-hack-yellow/10 via-white to-hack-orange/5">
      <div className="max-w-5xl mx-auto">
        {/* Section label */}
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#0A66C2] bg-white border-2 border-hack-black rounded-full px-4 py-1.5 shadow-[3px_3px_0_0_#0A0A0A]">
            <Linkedin className="w-3.5 h-3.5" /> Featured on LinkedIn
          </span>
        </div>

        {/* Featured card — clickable, opens LinkedIn post */}
        <a
          href={SAURABH_LINKEDIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Read Saurabh Chauhan's full review on LinkedIn"
          className="group block bg-white rounded-2xl p-6 lg:p-10 border-2 border-hack-black shadow-[6px_6px_0_0_#0A0A0A] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_#0A0A0A] transition-all"
        >
          {/* Big quote icon + 5 stars row */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <Quote className="w-10 h-10 lg:w-12 lg:h-12 text-hack-yellow flex-shrink-0" />
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-hack-yellow text-hack-yellow" />
              ))}
            </div>
          </div>

          {/* Pull quote */}
          <p className="font-display text-hack-black text-lg lg:text-2xl leading-relaxed lg:leading-snug mb-7">
            &ldquo;{SAURABH_QUOTE}&rdquo;
          </p>

          {/* Author row */}
          <div className="flex items-center gap-4 pt-5 border-t-2 border-hack-black/10">
            {/* LinkedIn-blue avatar with initials */}
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-gradient-to-br from-[#0A66C2] to-[#004182] flex items-center justify-center text-white font-display font-bold text-xl lg:text-2xl border-2 border-hack-black shadow-[3px_3px_0_0_#0A0A0A]">
                SC
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border-2 border-hack-black flex items-center justify-center">
                <Linkedin className="w-3 h-3 text-[#0A66C2]" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-base lg:text-lg text-hack-black truncate">
                Saurabh Chauhan
              </p>
              <p className="text-xs lg:text-sm text-hack-black/60 truncate">
                Associate Consultant @ KPMG · Power BI · SQL · Microsoft Fabric
              </p>
              <p className="text-[11px] font-mono uppercase tracking-wider text-hack-magenta mt-1">
                Verified LinkedIn post
              </p>
            </div>

            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-hack-black/60 group-hover:text-hack-black bg-hack-yellow/30 group-hover:bg-hack-yellow rounded-full px-3 py-2 transition-colors flex-shrink-0">
              Read on LinkedIn <ExternalLink className="w-3.5 h-3.5" />
            </span>
          </div>
        </a>
      </div>
    </section>
  );
}
