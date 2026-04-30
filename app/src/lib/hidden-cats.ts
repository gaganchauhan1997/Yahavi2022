/** Slugs to hide from any frontend category list (sidebar, shop filter, mobile drawer). */
export const HIDDEN_CAT_SLUGS = new Set<string>([
  "uncategorized", "uncategorised", "wc-default",
  /* Duplicates / legacy: */
  "excel-templates",      /* dup of excel-sheets */
  "themes-templates",     /* dup of website-templates */
  "dashboards",           /* dup of mis-dashboards-templates */
  /* Empty placeholders: */
  "bundles",
  "product-bundles",
  "ai-pro-subscriptions",
  "data-analysis-tools",
]);

export const isHiddenCat = (slug?: string | null): boolean =>
  !!slug && HIDDEN_CAT_SLUGS.has(slug.toLowerCase());
