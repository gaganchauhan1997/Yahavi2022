import { lazy, Suspense } from "react";
import HeroSection from "@/sections/home/HeroSection";
import CategoriesSection from "@/sections/home/CategoriesSection";
import TrendingSection from "@/sections/home/TrendingSection";
import WhySection from "@/sections/home/WhySection";
import CommunitySection from "@/sections/home/CommunitySection";
import TestimonialsSection from "@/sections/home/TestimonialsSection";
import FAQSection from "@/sections/home/FAQSection";

// Lazy-load the AI credits block so it doesn't compete with the LCP hero
const AICreditsSection = lazy(() => import("@/sections/home/AICreditsSection"));

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <CategoriesSection />
      <TrendingSection />
      <WhySection />
      <Suspense fallback={<div className="h-32" aria-hidden />}>
        <AICreditsSection />
      </Suspense>
      <CommunitySection />
      <TestimonialsSection />
      <FAQSection />
    </>
  );
}
