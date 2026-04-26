
import React, { createContext, useContext, useReducer, useEffect, useMemo } from "react";
import type { Product } from "@/data/products";
import { fallbackProducts } from "@/data/products";
import { fetchGraphQL, GET_PRODUCTS_QUERY } from "@/lib/graphql-client";
import { initializeRazorpayPayment } from "@/lib/razorpay";

// Backend provides canonical slugs - no frontend normalization needed
function parsePriceValue(price?: string): number {
  if (!price) return 0;
  const numeric = price.replace(/[^0-9.]/g, "");
  return Number.parseFloat(numeric) || 0;
}

function extractCategorySlugs(categoryNodes?: Array<{ slug?: string | null }>): string[] {
  const slugs = new Set<string>();
  for (const node of categoryNodes ?? []) {
    const slug = node.slug?.trim();
    if (slug) slugs.add(slug);
  }
  return [...slugs];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

interface StoreState {
  cart: CartItem[];
  products: Product[];
  loading: boolean;
  isCartOpen: boolean;
  isSidebarOpen: boolean;
  wishlist: string[];
  searchQuery: string;
}

type StoreAction =
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_TO_CART'; product: Product }
  | { type: 'REMOVE_FROM_CART'; productId: string }
  | { type: 'UPDATE_QUANTITY'; productId: string; quantity: number }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_CART' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_WISHLIST'; productId: string }
  | { type: 'SET_SEARCH'; query: string };

const initialState: StoreState = {
  cart: [],
  products: [],
  loading: true,
  isCartOpen: false,
  isSidebarOpen: false,
  wishlist: [],
  searchQuery: '',
};

interface StoreContextValue {
  state: StoreState;
  dispatch: React.Dispatch<StoreAction>;
  checkout: (amount: number) => void;
  cartCount: number;
  cartTotal: number;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

function storeReducer(state: StoreState, action: StoreAction): StoreState {
  switch (action.type) {
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'ADD_TO_CART': {
      const existing = state.cart.find(i => i.product.id === action.product.id);
      if (existing) {
        return {
          ...state,
          cart: state.cart.map(i =>
            i.product.id === action.product.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
          isCartOpen: true,
        };
      }
      return { ...state, cart: [...state.cart, { product: action.product, quantity: 1 }], isCartOpen: true };
    }
    case 'REMOVE_FROM_CART':
      return { ...state, cart: state.cart.filter(i => i.product.id !== action.productId) };
    case 'UPDATE_QUANTITY':
      if (action.quantity <= 0) {
        return { ...state, cart: state.cart.filter(i => i.product.id !== action.productId) };
      }
      return {
        ...state,
        cart: state.cart.map(i =>
          i.product.id === action.productId ? { ...i, quantity: action.quantity } : i
        ),
      };
    case 'CLEAR_CART':
      return { ...state, cart: [] };
    case 'TOGGLE_CART':
      return { ...state, isCartOpen: !state.isCartOpen };
    case 'TOGGLE_SIDEBAR':
      return { ...state, isSidebarOpen: !state.isSidebarOpen };
    case 'TOGGLE_WISHLIST':
      return {
        ...state,
        wishlist: state.wishlist.includes(action.productId)
          ? state.wishlist.filter(id => id !== action.productId)
          : [...state.wishlist, action.productId],
      };
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.query };
    default:
      return state;
  }
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load cart from localStorage on init
  const loadCartFromStorage = (): CartItem[] => {
    try {
      const saved = localStorage.getItem('hackknow-cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const initialStateWithCart: StoreState = {
    ...initialState,
    cart: loadCartFromStorage()
  };

  const [state, dispatch] = useReducer(storeReducer, initialStateWithCart);

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('hackknow-cart', JSON.stringify(state.cart));
    } catch (error) {
      console.error('Failed to save cart:', error);
    }
  }, [state.cart]);

  // Load products from WPGraphQL with fallback
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await fetchGraphQL(GET_PRODUCTS_QUERY);
        if (data?.products?.nodes?.length > 0) {
          const mappedProducts: Product[] = data.products.nodes.map((node: any) => {
            const categories = extractCategorySlugs(node.productCategories?.nodes);
            const price = node.price;

            return {
              id: node.databaseId?.toString() || node.id,
              name: node.name,
              slug: node.slug,
              description: node.description,
              shortDescription: node.shortDescription,
              price,
              regularPrice: node.regularPrice,
              image: node.image,
              category: categories[0] || 'uncategorized',
              categories,
              isFree: parsePriceValue(price) === 0 || categories.includes('free-resources'),
            };
          });
          dispatch({ type: 'SET_PRODUCTS', payload: mappedProducts });
          console.log('✅ Products loaded from WordPress:', mappedProducts.length);
        } else {
          throw new Error('No products returned from API');
        }
      } catch (error) {
        console.warn('⚠️ WPGraphQL failed, using fallback products:', error);
        dispatch({ type: 'SET_PRODUCTS', payload: fallbackProducts });
        console.log('✅ Fallback products loaded:', fallbackProducts.length);
      }
    };
    loadProducts();
  }, []);

  const cartCount = useMemo(
    () => state.cart.reduce((sum, item) => sum + item.quantity, 0),
    [state.cart]
  );

  const cartTotal = useMemo(
    () =>
      state.cart.reduce((sum, item) => {
        const raw = item.product.price?.replace(/[^0-9.]/g, '') || '0';
        return sum + parseFloat(raw) * item.quantity;
      }, 0),
    [state.cart]
  );

  const checkout = (amount: number) => {
    initializeRazorpayPayment({
      amount: amount * 100,
      currency: "INR",
      name: "HackKnow Store",
      description: "Purchase from HackKnow",
    });
  };

  return (
    <StoreContext.Provider value={{ state, dispatch, checkout, cartCount, cartTotal }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};
