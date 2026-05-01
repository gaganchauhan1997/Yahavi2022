
export interface Subcategory {
  slug: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  title: string;
  slug: string;
  itemCount: number;
  image: string;
  subcategories: Subcategory[];
}

// Categories synced from shop.hackknow.com WooCommerce (WC category IDs match)
export const categories: Category[] = [
  {
    id: 'excel-sheets',
    name: 'Excel Sheets',
    title: 'Excel & Sheets',
    slug: 'excel-sheets',
    itemCount: 8,
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80',
    subcategories: [
      { slug: 'trackers', name: 'Trackers' },
      { slug: 'calculators', name: 'Calculators' },
      { slug: 'reports', name: 'Reports' },
      { slug: 'invoices', name: 'Invoices' },
    ],
  },
  {
    id: 'excel-templates',
    name: 'Excel Templates',
    title: 'Excel Templates',
    slug: 'excel-templates',
    itemCount: 2,
    image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80',
    subcategories: [
      { slug: 'finance', name: 'Finance' },
      { slug: 'project', name: 'Project Management' },
    ],
  },
  {
    id: 'hr-finance',
    name: 'HR & Finance',
    title: 'HR & Finance',
    slug: 'hr-finance',
    itemCount: 4,
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80',
    subcategories: [
      { slug: 'hr-templates', name: 'HR Templates' },
      { slug: 'finance-sheets', name: 'Finance Sheets' },
      { slug: 'budgets', name: 'Budget Planners' },
      { slug: 'payroll', name: 'Payroll' },
    ],
  },
  {
    id: 'powerpoint-decks',
    name: 'PowerPoint Decks',
    title: 'PowerPoint Decks',
    slug: 'powerpoint-decks',
    itemCount: 3,
    image: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=600&q=80',
    subcategories: [
      { slug: 'business', name: 'Business' },
      { slug: 'creative', name: 'Creative' },
      { slug: 'minimal', name: 'Minimal' },
      { slug: 'pitch-deck', name: 'Pitch Deck' },
    ],
  },
  {
    id: 'digital-marketing',
    name: 'Digital Marketing',
    title: 'Digital Marketing',
    slug: 'digital-marketing',
    itemCount: 3,
    image: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=600&q=80',
    subcategories: [
      { slug: 'seo-tools', name: 'SEO Tools' },
      { slug: 'ads-templates', name: 'Ads Templates' },
      { slug: 'email-marketing', name: 'Email Marketing' },
      { slug: 'content-calendar', name: 'Content Calendar' },
    ],
  },
  {
    id: 'social-media',
    name: 'Social Media',
    title: 'Social Media Kits',
    slug: 'social-media',
    itemCount: 2,
    image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&q=80',
    subcategories: [
      { slug: 'instagram', name: 'Instagram' },
      { slug: 'youtube', name: 'YouTube' },
      { slug: 'linkedin', name: 'LinkedIn' },
      { slug: 'twitter', name: 'Twitter / X' },
    ],
  },
  {
    id: 'business-templates',
    name: 'Business Templates',
    title: 'Business Templates',
    slug: 'business-templates',
    itemCount: 2,
    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&q=80',
    subcategories: [
      { slug: 'proposals', name: 'Proposals' },
      { slug: 'contracts', name: 'Contracts' },
      { slug: 'reports', name: 'Reports' },
      { slug: 'letterheads', name: 'Letterheads' },
    ],
  },
  {
    id: 'html-templates',
    name: 'HTML Templates',
    title: 'HTML Templates',
    slug: 'html-templates',
    itemCount: 26,
    image: 'https://images.unsplash.com/photo-1551033406-611cf9a28f67?w=600&q=80',
    subcategories: [
      { slug: 'landing-page', name: 'Landing Pages' },
      { slug: 'portfolio', name: 'Portfolio' },
      { slug: 'business', name: 'Business' },
      { slug: 'admin-dashboard', name: 'Admin Dashboards' },
    ],
  },
  {
    id: 'dashboards',
    name: 'Dashboards',
    title: 'Dashboards',
    slug: 'dashboards',
    itemCount: 1,
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80',
    subcategories: [
      { slug: 'analytics', name: 'Analytics' },
      { slug: 'sales', name: 'Sales' },
      { slug: 'finance', name: 'Finance' },
    ],
  },
  {
    id: 'data-analysis-tools',
    name: 'Data Analysis Tools',
    title: 'Data Analysis Tools',
    slug: 'data-analysis-tools',
    itemCount: 1,
    image: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=600&q=80',
    subcategories: [
      { slug: 'spreadsheets', name: 'Spreadsheets' },
      { slug: 'visualization', name: 'Visualization' },
      { slug: 'automation', name: 'Automation' },
    ],
  },
  {
    id: 'free-resources',
    name: 'Free Resources',
    title: 'Free Resources',
    slug: 'free-resources',
    itemCount: 2,
    image: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=600&q=80',
    subcategories: [
      { slug: 'free-templates', name: 'Free Templates' },
      { slug: 'free-icons', name: 'Free Icons' },
    ],
  },
  {
    id: 'bundles',
    name: 'Bundles',
    title: 'Product Bundles',
    slug: 'bundles',
    itemCount: 1,
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=80',
    subcategories: [
      { slug: 'starter-pack', name: 'Starter Packs' },
      { slug: 'business-kit', name: 'Business Kits' },
    ],
  },
];
