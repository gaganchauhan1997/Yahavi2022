import { Link } from 'react-router-dom';
import { Code2, Compass, Heart, Mail, MapPin, Palette } from 'lucide-react';
import { useDocumentMeta } from '@/lib/useDocumentMeta';

export default function AboutPage() {
  useDocumentMeta({
    title: 'About HackKnow — Gagan Chauhan, Founder | Delhi',
    description: 'Meet Gagan Chauhan, founder of HackKnow from Nangli Razapur, Delhi, and co-founder Vinay Rajouria. Remembering our late beloved founder, Manish Kumar Singh.',
  });
  return (
    <div className="pt-28 pb-20 lg:pt-36 bg-hack-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="text-center max-w-3xl mx-auto mb-14">
          <p className="text-xs font-mono uppercase tracking-widest text-hack-magenta mb-4">Our people. Our purpose.</p>
          <h1 className="font-display font-black text-4xl lg:text-6xl tracking-tight mb-6">Built with purpose.<br /><span className="text-gradient">Carried forward with love.</span></h1>
          <p className="text-lg text-hack-black/75 leading-relaxed">HackKnow brings useful digital tools within reach of creators, students and businesses. Behind every template, every page and every small improvement are people who care about making knowledge useful.</p>
          <p className="mt-6 inline-flex items-center gap-2 text-sm text-hack-black/70"><MapPin className="w-4 h-4 text-hack-magenta" /> Delhi, India</p>
        </header>

        <section aria-labelledby="manish-heading" className="mb-16 rounded-3xl border-[3px] border-hack-black bg-white shadow-[8px_8px_0_0_#1A1A1A] overflow-hidden">
          <div className="grid lg:grid-cols-2">
            <div className="bg-gradient-to-br from-hack-yellow/25 via-white to-hack-magenta/10 p-5 sm:p-7">
              <picture>
                <source media="(max-width: 639px)" type="image/webp" srcSet="/manish-mentor-640.webp" />
                <img src="/manish-mentor.webp" alt="Remembering Manish Kumar Singh, HackKnow’s late beloved founder and mentor" width={1024} height={945} className="w-full h-auto rounded-2xl border-[3px] border-hack-black" decoding="async" fetchPriority="high" />
              </picture>
            </div>
            <div className="p-6 sm:p-8 lg:border-l-[3px] border-hack-black flex flex-col justify-center">
              <p className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-hack-magenta font-bold"><Heart className="w-4 h-4" /> In loving memory</p>
              <h2 id="manish-heading" className="font-display font-black text-3xl mt-4">Manish Kumar Singh</h2>
              <p className="text-sm font-bold text-hack-black mt-2">Late Beloved Founder &amp; Mentor</p>
              <p className="text-hack-black/75 leading-relaxed mt-5">Some people leave us with more than memories. They leave us a way of looking at the world—with curiosity, generosity and the belief that what we learn should help someone else.</p>
              <p className="text-hack-black/75 leading-relaxed mt-4">Manish brought that spirit to HackKnow. His love of technology, travel and sharing knowledge helped shape the purpose we carry today. His passing has left an absence that no words can fill, but his influence remains in the work and in the people who keep it moving forward.</p>
              <p className="mt-6 border-l-4 border-hack-yellow pl-4 font-semibold italic text-hack-black">Deeply missed. Always remembered. A part of HackKnow, always.</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="leadership-heading" className="mb-16">
          <h2 id="leadership-heading" className="font-display font-black text-3xl lg:text-4xl text-center mb-9">The people building what comes next</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <article className="bg-white rounded-3xl border-[3px] border-hack-black shadow-[6px_6px_0_0_#1A1A1A] overflow-hidden">
              <div className="bg-gradient-to-br from-hack-black via-hack-magenta to-hack-orange h-40 flex items-center justify-center" aria-hidden="true"><span className="text-6xl font-display font-black text-white">GC</span></div>
              <div className="p-6 sm:p-8">
                <p className="flex items-center gap-2 text-xs uppercase font-mono tracking-wider text-hack-magenta font-bold"><Code2 className="w-4 h-4" /> Founder of hackknow.com</p>
                <h3 className="font-display font-black text-3xl mt-3">Gagan Chauhan</h3>
                <p className="font-semibold mt-4">A Delhi boy. A quiet builder. A clear purpose.</p>
                <p className="text-hack-black/75 leading-relaxed mt-4">From Nangli Razapur, Delhi, Gagan brings a hands-on approach to building HackKnow: understand the problem, learn what it takes, and keep improving until the experience feels simple for the person using it.</p>
                <p className="text-hack-black/75 leading-relaxed mt-4">The work that once happened quietly behind the scenes now has a name. As HackKnow’s founder, he guides its engineering and direction—from the React storefront and Cloudflare infrastructure to WooCommerce checkout, Razorpay integration and Yahavi AI. His focus is practical: useful products, thoughtful technology and a platform people can rely on.</p>
                <p className="text-hack-black/75 leading-relaxed mt-4">Rooted in Delhi and shaped by a builder’s curiosity, Gagan carries the vision forward with care for the people who helped it begin.</p>
                <a href="mailto:founder@hackknow.com" className="inline-flex items-center gap-2 mt-6 font-semibold text-hack-magenta underline underline-offset-4"><Mail className="w-4 h-4" /> founder@hackknow.com</a>
              </div>
            </article>
            <article className="bg-white rounded-3xl border-[3px] border-hack-black shadow-[6px_6px_0_0_#1A1A1A] overflow-hidden">
              <div className="bg-gradient-to-br from-hack-orange via-hack-magenta to-hack-black h-40 flex items-center justify-center" aria-hidden="true"><span className="text-6xl font-display font-black text-white">VR</span></div>
              <div className="p-6 sm:p-8">
                <p className="flex items-center gap-2 text-xs uppercase font-mono tracking-wider text-hack-magenta font-bold"><Palette className="w-4 h-4" /> Co-Founder · Website Design</p>
                <h3 className="font-display font-black text-3xl mt-3">Vinay Rajouria</h3>
                <p className="font-semibold mt-4">Giving the vision a place people can use.</p>
                <p className="text-hack-black/75 leading-relaxed mt-4">Vinay is HackKnow’s co-founder and the designer behind its website. His contribution gives the platform its visual identity and helps turn its ideas into an experience people can explore.</p>
                <p className="text-hack-black/75 leading-relaxed mt-4">Working alongside Gagan, he brings the design perspective to a shared goal: make digital tools easier to discover, understand and use.</p>
                <a href="mailto:team@hackknow.com" className="inline-flex items-center gap-2 mt-6 font-semibold text-hack-magenta underline underline-offset-4"><Mail className="w-4 h-4" /> team@hackknow.com</a>
              </div>
            </article>
          </div>
        </section>
        <section className="bg-hack-black text-hack-white rounded-3xl p-7 sm:p-10 border-[3px] border-hack-black mb-14">
          <Compass className="w-8 h-8 text-hack-yellow mb-4" />
          <h2 className="font-display font-black text-3xl mb-5">Our roots are in Delhi. Our purpose travels further.</h2>
          <p className="text-hack-white/80 leading-relaxed max-w-3xl">HackKnow is based in Delhi, India. We build and curate digital resources that help people spend less time starting from scratch and more time doing meaningful work. We honour where the journey began by taking responsibility for what comes next.</p>
          <p className="mt-5 text-hack-white/80">Company location: Delhi, India</p>
        </section>
        <div className="text-center">
          <h2 className="font-display font-black text-2xl mb-5">Build something useful with us.</h2>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/shop" className="bg-hack-black text-white rounded-xl px-6 py-3 font-bold">Explore products</Link>
            <Link to="/contact" className="bg-hack-yellow text-hack-black rounded-xl px-6 py-3 font-bold border-2 border-hack-black">Contact the team</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
