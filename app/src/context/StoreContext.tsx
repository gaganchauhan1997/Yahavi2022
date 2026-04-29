import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import type { Product } from "@/data/products";
import { fallbackProducts } from "@/data/products";
import { fetchGraphQL, GET_PRODUCTS_QUERY } from "@/lib/graphql-client";
import { initializeRazorpayPayment } from "@/lib/razorpay";
import { parsePriceValue, rewriteWpUrl } from "@/lib/utils";
import type { RazorpayResponse } from "@/types/razorpay";
import { getCurrentUser } from "@/lib/auth";

interface ProductCategoryNode {
  slug?: string | null;
}

interface ProductNode {
  id: string;
  databaseId?: number | null;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  price?: string;
  regularPrice?: string;
  date?: string | null;
  image?: {
    sourceUrl: string;
  };
  productCategories?: {
    nodes?: ProductCategoryNode[];
  };
}

function extractCategorySlugs(categoryNodes?: ProductCategoryNode[]): string[] {
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
  | { type: "SET_PRODUCTS"; payload: Product[] }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "ADD_TO_CART"; product: Product }
  | { type: "REMOVE_FROM_CART"; productId: string }
  | { type: "UPDATE_QUANTITY"; productId: string; quantity: number }
  | { type: "CLEAR_CART" }
  | { type: "TOGGLE_CART" }
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "TOGGLE_WISHLIST"; productId: string }
  | { type: "SET_SEARCH"; query: string };

const initialState: StoreState = {
  cart: [],
  products: [],
  loading: true,
  isCartOpen: false,
  isSidebarOpen: false,
  wishlist: [],
  searchQuery: "",
};

interface StoreContextValue {
  state: StoreState;
  dispatch: React.Dispatch<StoreAction>;
  checkout: (
    amount: number,
    callbacks?: {
      onSuccess?: (resp: RazorpayResponse) => void;
      onFailure?: (message: string) => void;
      onDismiss?: () => void;
    }
  ) => void;
  cartCount: number;
  cartTotal: number;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

function storeReducer(state: StoreState, action: StoreAction): StoreState {
  switch (action.type) {
    case "SET_PRODUCTS":
      return { ...state, products: action.payload, loading: false };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "ADD_TO_CART": {
      const existing = state.cart.find((item) => item.product.id === action.product.id);
      if (existing) {
        return {
          ...state,
          cart: state.cart.map((item) =>
            item.product.id === action.product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
          isCartOpen: true,
        };
      }
      return {
        ...state,
        cart: [...state.cart, { product: action.product, quantity: 1 }],
        isCartOpen: true,
      };
    }
    case "REMOVE_FROM_CART":
      return { ...state, cart: state.cart.filter((item) => item.product.id !== action.productId) };
    case "UPDATE_QUANTITY":
      if (action.quantity <= 0) {
        return { ...state, cart: state.cart.filter((item) => item.product.id !== action.productId) };
      }
      return {
        ...state,
        cart: state.cart.map((item) =>
          item.product.id === action.productId ? { ...item, quantity: action.quantity } : item
        ),
      };
    case "CLEAR_CART":
      return { ...state, cart: [] };
    case "TOGGLE_CART":
      return { ...state, isCartOpen: !state.isCartOpen };
    case "TOGGLE_SIDEBAR":
      return { ...state, isSidebarOpen: !state.isSidebarOpen };
    case "TOGGLE_WISHLIST":
      return {
        ...state,
        wishlist: state.wishlist.includes(action.productId)
          ? state.wishlist.filter((id) => id !== action.productId)
          : [...state.wishlist, action.productId],
      };
    case "SET_SEARCH":
      return { ...state, searchQuery: action.query };
    default:
      return state;
  }
}

function cartKey(): string {
  const user = getCurrentUser();
  return user?.id ? `hackknow-cart-${user.id}` : 'hackknow-cart';
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const loadCartFromStorage = (): CartItem[] => {
    try {
      const saved = localStorage.getItem(cartKey());
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const [state, dispatch] = useReducer(storeReducer, {
    ...initialState,
    cart: loadCartFromStorage(),
  });

  useEffect(() => {
    try {
      localStorage.setItem(cartKey(), JSON.stringify(state.cart));
    } catch {
      // Cart persistence failed — silently ignore (non-critical)
    }
  }, [state.cart]);

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      try {
        const data = await fetchGraphQL(GET_PRODUCTS_QUERY);
        if (cancelled) return;
        if (data?.products?.nodes?.length > 0) {
          const mappedProducts: Product[] = data.products.nodes.map((node: ProductNode) => {
            const categories = extractCategorySlugs(node.productCategories?.nodes);
            const price = node.price;

            const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
            const isNew = node.date
              ? (Date.now() - new Date(node.date).getTime()) < sixtyDaysMs
              : false;

            return {
              id: node.databaseId?.toString() || node.id,
              name: node.name,
              slug: node.slug,
              description: node.description,
              shortDescription: node.shortDescription,
              price,
              regularPrice: node.regularPrice,
              image: node.image
                ? { sourceUrl: rewriteWpUrl(node.image.sourceUrl) ?? '', altText: undefined }
                : undefined,
              category: categories[0] || "uncategorized",
              categories,
              isFree: parsePriceValue(price) === 0 || categories.includes("free-resources"),
              isNew,
            };
          });

          dispatch({ type: "SET_PRODUCTS", payload: mappedProducts });
        } else {
          throw new Error("No products returned from API");
        }
      } catch {
        if (cancelled) return;
        // Silently fall back to static products — no disruptive toast
        dispatch({ type: "SET_PRODUCTS", payload: fallbackProducts });
      }
    };

    loadProducts();
    return () => { cancelled = true; };
  }, []);

  const cartCount = useMemo(
    () => state.cart.reduce((sum, item) => sum + item.quantity, 0),
    [state.cart]
  );

  const cartTotal = useMemo(
    () =>
      state.cart.reduce((sum, item) => sum + parsePriceValue(item.product.price) * item.quantity, 0),
    [state.cart]
  );

  const checkout = (
    amount: number,
    callbacks?: {
      onSuccess?: (resp: RazorpayResponse) => void;
      onFailure?: (message: string) => void;
      onDismiss?: () => void;
    }
  ) => {
    initializeRazorpayPayment({
      amount: Math.round(amount * 100),
      currency: "INR",
      name: "HackKnow Store",
      description: "Purchase from HackKnow",
      callbacks,
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
