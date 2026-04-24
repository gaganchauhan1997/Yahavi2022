# Hackknow - Technical Specification

## Component Inventory

### shadcn/ui Components

| Component | Purpose |
|-----------|---------|
| Button | CTAs, add to cart, navigation actions |
| Card | Product cards, category cards, testimonial cards |
| Accordion | FAQ section |
| Badge | Price tags, category labels, "NEW" badges |
| Input | Search bar, newsletter signup, checkout form |
| Dialog | Quick product preview |
| Sheet | Cart drawer, mobile sidebar |
| Tabs | Product detail page (Description, Reviews) |
| Separator | Visual dividers |
| Skeleton | Loading states for product grid |
| Avatar | User avatars in testimonials |
| ScrollArea | Cart items, category sidebar |
| Tooltip | Info tooltips on product cards |

### Custom Components

| Component | Purpose |
|-----------|---------|
| PhoneMockup3D | CSS 3D phone for hero section |
| ScrollTicker | Scroll-velocity-driven marquee |
| FlipCardGrid | GSAP Flip category expand/collapse |
| TiltCard | Mouse-tracking 3D tilt effect on product cards |
| OrbitalBadge | Concentric rotating text rings |
| CustomCursor | Custom cursor with hover expansion |
| SplitHero | 50/50 split hero layout |
| AnimatedCounter | Number counter animation for stats |
| ProductCard | Enhanced product card with hover effects |
| CategorySidebar | Sidebar category navigation (Wero-style) |

## Animation Implementation Table

| Animation | Library | Approach | Complexity |
|-----------|---------|----------|------------|
| Smooth scrolling (global) | Lenis + GSAP | Initialize Lenis, sync with GSAP ticker | Medium |
| 3D Floating Phone | Pure CSS | preserve-3d, rotateY/X, translateZ layers | High |
| Scroll Ticker (marquee) | GSAP | ScrollTrigger velocity-driven translateX | Medium |
| Scroll-down bouncer | CSS @keyframes | Infinite translateY animation | Low |
| Header scroll state | CSS + JS | Scroll listener toggles classes | Low |
| GSAP Flip category expand | GSAP Flip | getState → toggle classes → Flip.from | High |
| Inertial Perspective Grid | GSAP ScrollTrigger | perspectiveOrigin based on mouse + scroll | Medium |
| Tilt card effect | Vanilla JS | Mouse position → rotateX/Y transforms | Medium |
| Card hover scale/glow | CSS transitions | scale(1.05) + box-shadow | Low |
| Orbital Typography Badge | CSS + JS | JS splits text, CSS rotates spans | Medium |
| FAQ accordion open/close | shadcn Accordion | Built-in with custom styling | Low |
| Animated counters | GSAP | ScrollTrigger-driven number tween | Low |
| Custom cursor | Vanilla JS | Mousemove listener, scale on hover targets | Medium |
| Page transitions | CSS transitions | Fade/slide on route change | Low |
| Cart drawer | shadcn Sheet | Slide-in panel | Low |
| Sticky sidebar | CSS | position: sticky | Low |

## State & Logic Plan

### E-commerce State Management

React Context + useReducer for:
- **Cart state**: items array, total count, total price
- **Product catalog**: categories, products, filters, sort
- **Auth state**: user session, wishlist
- **UI state**: sidebar open, search open, toast notifications

### Shopping Flow

1. Browse categories → filter products → click product → product detail
2. Add to cart → cart sidebar opens → adjust quantity → proceed to checkout
3. Checkout form → order summary → order confirmation

### URL State Management

React Router with:
- `/` — Home page
- `/shop` — Product listing with query params for filters
- `/product/:slug` — Product detail page
- `/cart` — Cart page
- `/checkout` — Checkout page
- `/about` — About page
- `/support` — Support/FAQ page

## Dependencies

```json
{
  "gsap": "^3.12",
  "lenis": "^1.1",
  "lucide-react": "^0.400",
  "react-router-dom": "^6.26",
  "imagesloaded": "^5.0"
}
```

## Tailwind Configuration

### Custom Colors
- hack-black: #1A1A1A
- hack-white: #F9F9F9
- hack-yellow: #FFF055
- hack-magenta: #FF56F0
- hack-orange: #FF7A56

### Custom Fonts
- Space Grotesk (Google Fonts) — Headings
- Inter (Google Fonts) — Body
- JetBrains Mono (Google Fonts) — Mono/Accent

### Custom Animations
- spin-slow: 20s linear infinite
- spin-reverse: 15s linear infinite
- bounce-subtle: gentle bounce for scroll indicator
