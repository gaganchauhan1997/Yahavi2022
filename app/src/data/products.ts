
export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  price?: string;
  regularPrice?: string;
  image?: {
    sourceUrl: string;
  };
  category?: string;
  categories?: string[];
  subcategory?: string;
  // Local UI-only optional fields
  rating?: number;
  reviews?: number;
  sales?: number;
  isBestseller?: boolean;
  isNew?: boolean;
  isFree?: boolean;
  tags?: string[];
  author?: string;
}

// Fallback products when WPGraphQL is unavailable
export const fallbackProducts: Product[] = [
  {
    id: '1',
    name: 'Premium PowerPoint Templates Bundle',
    slug: 'premium-powerpoint-templates',
    description: '50+ professional PowerPoint templates for business presentations. Fully editable and customizable.',
    shortDescription: 'Professional business presentation templates',
    price: '₹1,299',
    regularPrice: '₹2,499',
    image: { sourceUrl: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=400' },
    category: 'powerpoint-decks',
    rating: 4.8,
    reviews: 124,
    sales: 1500,
    isBestseller: true,
    isNew: false,
    tags: ['business', 'presentation', 'powerpoint'],
    author: 'DesignPro'
  },
  {
    id: '2',
    name: 'Excel Financial Dashboard',
    slug: 'excel-financial-dashboard',
    description: 'Complete financial tracking dashboard with charts, graphs, and automated calculations.',
    shortDescription: 'Track your finances with automated dashboards',
    price: '₹899',
    regularPrice: '₹1,499',
    image: { sourceUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400' },
    category: 'excel-sheets',
    rating: 4.9,
    reviews: 89,
    sales: 800,
    isBestseller: true,
    tags: ['finance', 'excel', 'dashboard'],
    author: 'ExcelMastery'
  },
  {
    id: '3',
    name: 'Social Media Content Calendar 2024',
    slug: 'social-media-calendar',
    description: 'Complete 2024 content calendar with post ideas, templates, and scheduling guide.',
    shortDescription: 'Plan your entire year of social media content',
    price: '₹599',
    regularPrice: '₹999',
    image: { sourceUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400' },
    category: 'social-media',
    rating: 4.7,
    reviews: 56,
    sales: 600,
    isNew: true,
    tags: ['social-media', 'marketing', 'calendar'],
    author: 'SocialGrowth'
  },
  {
    id: '4',
    name: 'Digital Marketing Strategy Guide',
    slug: 'digital-marketing-guide',
    description: 'Comprehensive guide covering SEO, SEM, social media marketing, and growth hacking.',
    shortDescription: 'Master digital marketing with proven strategies',
    price: '₹1,499',
    regularPrice: '₹2,999',
    image: { sourceUrl: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=400' },
    category: 'digital-marketing',
    rating: 4.6,
    reviews: 234,
    sales: 2100,
    isBestseller: true,
    isNew: false,
    tags: ['marketing', 'digital', 'strategy'],
    author: 'MarketingGuru'
  },
  {
    id: '5',
    name: 'Website UI Kit - Figma & XD',
    slug: 'website-ui-kit',
    description: '200+ UI components, 50+ page templates, design system included.',
    shortDescription: 'Complete UI kit for modern web design',
    price: '₹2,499',
    regularPrice: '₹4,999',
    image: { sourceUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400' },
    category: 'themes-templates',
    rating: 4.9,
    reviews: 178,
    sales: 3200,
    isBestseller: true,
    isNew: true,
    tags: ['ui', 'design', 'figma', 'templates'],
    author: 'DesignStudio'
  },
  {
    id: '6',
    name: 'Free Business Card Templates',
    slug: 'free-business-card-templates',
    description: '20 professional business card designs, fully editable, print-ready.',
    shortDescription: 'Professional business card designs free',
    price: '₹0',
    regularPrice: '₹499',
    image: { sourceUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400' },
    category: 'themes-templates',
    rating: 4.5,
    reviews: 45,
    sales: 5000,
    isBestseller: false,
    isNew: false,
    isFree: true,
    tags: ['free', 'business-card', 'design'],
    author: 'FreeDesigns'
  }
];

// Default to fallback products, StoreContext will override with WPGraphQL data
export const products: Product[] = fallbackProducts;

export { categories } from './categories';

export const getBestsellers = (items: Product[]) => items.filter(p => p.isBestseller);
export const getNewArrivals = (items: Product[]) => items.filter(p => p.isNew);
export const getFreeProducts = (items: Product[]) => items.filter(p => p.isFree);

export const getProductBySlug = (items: Product[], slug: string) =>
  items.find(p => p.slug === slug);

export const getRelatedProducts = (items: Product[], product: Product, limit = 4): Product[] =>
  items
    .filter(p => p.id !== product.id && p.category === product.category)
    .slice(0, limit);
