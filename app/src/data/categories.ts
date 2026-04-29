
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

// Categories synced from shop.hackknow.com WooCommerce (WC category IDs match)
export const categories: Category[] = [
  {
    id: 'excel-sheets',
    name: 'Excel Sheets',
    title: 'Excel & Sheets',
    slug: 'excel-sheets',
    itemCount: 8,
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
    subcategories: [
      { slug: 'proposals', name: 'Proposals' },
      { slug: 'contracts', name: 'Contracts' },
      { slug: 'reports', name: 'Reports' },
      { slug: 'letterheads', name: 'Letterheads' },
    ],
  },
  {
    id: 'themes-templates',
    name: 'Themes & Templates',
    title: 'Themes & Templates',
    slug: 'themes-templates',
    itemCount: 1,
    subcategories: [
      { slug: 'web-templates', name: 'Web Templates' },
      { slug: 'landing-page', name: 'Landing Pages' },
      { slug: 'portfolio', name: 'Portfolio' },
    ],
  },
  {
    id: 'dashboards',
    name: 'Dashboards',
    title: 'Dashboards',
    slug: 'dashboards',
    itemCount: 1,
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
    subcategories: [
      { slug: 'starter-pack', name: 'Starter Packs' },
      { slug: 'business-kit', name: 'Business Kits' },
    ],
  },
];
