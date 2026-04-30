
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

// Removed: hardcoded demo products previously seeded the home page when WPGraphQL
// was unavailable. They were leaking onto production and confusing customers.
// Real catalog comes from WPGraphQL via StoreContext; if that fails we now show
// an empty state instead of fake data.
export const fallbackProducts: Product[] = [];

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
