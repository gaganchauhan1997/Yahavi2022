/**
 * Client-side HD placeholder generator for products without an uploaded image.
 *
 * Produces a beautiful Envato-style card (gradient + category icon + title +
 * brand strip) as a returned theme object that <ProductCard /> renders as JSX.
 * No network round-trip, no PHP dependency. Owner-uploaded images always win.
 */

export interface PlaceholderTheme {
  /** background gradient (top-left → bottom-right) */
  from: string;
  to: string;
  /** large category icon (emoji) shown centred */
  icon: string;
  /** small label shown on the brand strip */
  label: string;
  /** text colour over the gradient */
  fg: string;
}

const TAILWIND_GRADIENTS: Record<string, PlaceholderTheme> = {
  excel:        { from: '#065F46', to: '#10B981', icon: '📊', label: 'Excel Template',    fg: '#FFFFFF' },
  budget:       { from: '#047857', to: '#34D399', icon: '💰', label: 'Budget',            fg: '#FFFFFF' },
  accounting:   { from: '#065F46', to: '#10B981', icon: '🧾', label: 'Accounting',        fg: '#FFFFFF' },
  calculator:   { from: '#0E7490', to: '#22D3EE', icon: '🧮', label: 'Calculator',        fg: '#FFFFFF' },
  calendar:     { from: '#0369A1', to: '#38BDF8', icon: '📅', label: 'Calendar',          fg: '#FFFFFF' },
  chart:        { from: '#0F766E', to: '#5EEAD4', icon: '📈', label: 'Chart',             fg: '#FFFFFF' },
  financial:    { from: '#064E3B', to: '#10B981', icon: '💼', label: 'Financial',         fg: '#FFFFFF' },
  inventory:    { from: '#92400E', to: '#F59E0B', icon: '📦', label: 'Inventory',         fg: '#FFFFFF' },
  invoice:      { from: '#7C2D12', to: '#F97316', icon: '🧾', label: 'Invoice',           fg: '#FFFFFF' },
  planner:      { from: '#581C87', to: '#A855F7', icon: '🗂️', label: 'Planner',           fg: '#FFFFFF' },
  schedule:     { from: '#1E40AF', to: '#3B82F6', icon: '🗓️', label: 'Schedule',          fg: '#FFFFFF' },
  student:      { from: '#9333EA', to: '#C084FC', icon: '🎓', label: 'Student',           fg: '#FFFFFF' },
  timeline:     { from: '#0E7490', to: '#06B6D4', icon: '⏱️', label: 'Timeline',          fg: '#FFFFFF' },
  timesheet:    { from: '#155E75', to: '#22D3EE', icon: '🕒', label: 'Timesheet',         fg: '#FFFFFF' },
  powerpoint:   { from: '#9A3412', to: '#F97316', icon: '🎯', label: 'PowerPoint',        fg: '#FFFFFF' },
  website:      { from: '#1E3A8A', to: '#6366F1', icon: '🌐', label: 'Website Template',  fg: '#FFFFFF' },
  html:         { from: '#1F2937', to: '#60A5FA', icon: '⟨/⟩', label: 'HTML Template',    fg: '#FFFFFF' },
  theme:        { from: '#312E81', to: '#A78BFA', icon: '🎨', label: 'Theme',             fg: '#FFFFFF' },
  dashboard:    { from: '#0C4A6E', to: '#0EA5E9', icon: '📡', label: 'Dashboard',         fg: '#FFFFFF' },
  marketing:    { from: '#831843', to: '#EC4899', icon: '📣', label: 'Marketing',         fg: '#FFFFFF' },
  social:       { from: '#86198F', to: '#D946EF', icon: '📱', label: 'Social Media',      fg: '#FFFFFF' },
  premium:      { from: '#422006', to: '#FFD60A', icon: '★',  label: 'Premium',           fg: '#0A0A0A' },
  business:     { from: '#1F2937', to: '#F59E0B', icon: '💼', label: 'Business',          fg: '#FFFFFF' },
  course:       { from: '#7E22CE', to: '#C084FC', icon: '🎓', label: 'Course',            fg: '#FFFFFF' },
  python:       { from: '#0F4C81', to: '#FFD43B', icon: '🐍', label: 'Python',            fg: '#0A0A0A' },
  hr:           { from: '#134E4A', to: '#14B8A6', icon: '🧑‍💼', label: 'HR & Finance',    fg: '#FFFFFF' },
  free:         { from: '#14532D', to: '#22C55E', icon: '🎁', label: 'Free Resource',     fg: '#FFFFFF' },
  default:      { from: '#0A0A0A', to: '#3B3B3B', icon: '✦', label: 'Digital Product',   fg: '#FFD60A' },
};

/** Pick a theme from a free-form string of category/subcategory/name keywords. */
export function pickPlaceholderTheme(...hints: Array<string | undefined | null>): PlaceholderTheme {
  const blob = hints.filter(Boolean).join(' ').toLowerCase();
  // most specific first
  const order: Array<[RegExp, keyof typeof TAILWIND_GRADIENTS]> = [
    [/python/, 'python'],
    [/course|learning|tutorial/, 'course'],
    [/premium/, 'premium'],
    [/free/, 'free'],
    [/dashboard/, 'dashboard'],
    [/budget/, 'budget'],
    [/account/, 'accounting'],
    [/invoice|billing/, 'invoice'],
    [/inventory|stock/, 'inventory'],
    [/calendar/, 'calendar'],
    [/calculator/, 'calculator'],
    [/timesheet/, 'timesheet'],
    [/timeline/, 'timeline'],
    [/schedul/, 'schedule'],
    [/planner|tracker/, 'planner'],
    [/student|teacher|tutor/, 'student'],
    [/financial|finance/, 'financial'],
    [/chart|graph/, 'chart'],
    [/excel|spreadsheet|sheet/, 'excel'],
    [/powerpoint|deck|slide|presentation/, 'powerpoint'],
    [/html|theme|landing|page/, 'html'],
    [/website|web template/, 'website'],
    [/marketing|seo|ad/, 'marketing'],
    [/social|instagram|facebook/, 'social'],
    [/hr |human resource|payroll/, 'hr'],
    [/business|company|corporate/, 'business'],
  ];
  for (const [re, key] of order) {
    if (re.test(blob)) return TAILWIND_GRADIENTS[key];
  }
  return TAILWIND_GRADIENTS.default;
}
