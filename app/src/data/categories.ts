
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
  subcategories: Subcategory[];
}

// Categories from shop.hackknow.com — images handled via Google Cloud Storage
export const categories: Category[] = [
  {
    id: 'powerpoint-decks',
    name: 'PowerPoint Decks',
    title: 'PowerPoint Decks',
    slug: 'powerpoint-decks',
    itemCount: 234,
    subcategories: [
      { slug: 'business', name: 'Business' },
      { slug: 'creative', name: 'Creative' },
      { slug: 'minimal', name: 'Minimal' },
      { slug: 'pitch-deck', name: 'Pitch Deck' },
    ],
  },
  {
    id: 'hr-finance',
    name: 'HR & Finance',
    title: 'HR & Finance',
    slug: 'hr-finance',
    itemCount: 189,
    subcategories: [
      { slug: 'hr-templates', name: 'HR Templates' },
      { slug: 'finance-sheets', name: 'Finance Sheets' },
      { slug: 'budgets', name: 'Budget Planners' },
      { slug: 'payroll', name: 'Payroll' },
    ],
  },
  {
    id: 'themes-templates',
    name: 'Themes & Templates',
    title: 'Themes & Templates',
    slug: 'themes-templates',
    itemCount: 567,
    subcategories: [
      { slug: 'web-templates', name: 'Web Templates' },
      { slug: 'dashboard', name: 'Dashboards' },
      { slug: 'landing-page', name: 'Landing Pages' },
      { slug: 'portfolio', name: 'Portfolio' },
    ],
  },
  {
    id: 'digital-marketing',
    name: 'Digital Marketing',
    title: 'Digital Marketing',
    slug: 'digital-marketing',
    itemCount: 312,
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
    itemCount: 445,
    subcategories: [
      { slug: 'instagram', name: 'Instagram' },
      { slug: 'youtube', name: 'YouTube' },
      { slug: 'linkedin', name: 'LinkedIn' },
      { slug: 'twitter', name: 'Twitter / X' },
    ],
  },
  {
    id: 'excel-sheets',
    name: 'Excel Sheets',
    title: 'Excel & Sheets',
    slug: 'excel-sheets',
    itemCount: 278,
    subcategories: [
      { slug: 'trackers', name: 'Trackers' },
      { slug: 'calculators', name: 'Calculators' },
      { slug: 'reports', name: 'Reports' },
      { slug: 'invoices', name: 'Invoices' },
    ],
  },
  {
    id: 'free-resources',
    name: 'Free Resources',
    title: 'Free Resources',
    slug: 'free-resources',
    itemCount: 156,
    subcategories: [
      { slug: 'free-templates', name: 'Free Templates' },
      { slug: 'free-icons', name: 'Free Icons' },
      { slug: 'free-fonts', name: 'Free Fonts' },
    ],
  },
];
