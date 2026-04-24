
import React, { createContext, useContext, useReducer, useEffect, useMemo } from "react";
import type { Product } from "@/data/products";
import { fetchGraphQL, GET_PRODUCTS_QUERY } from "@/lib/graphql-client";
import { initializeRazorpayPayment } from "@/lib/razorpay";

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
  const [state, dispatch] = useReducer(storeReducer, initialState);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await fetchGraphQL(GET_PRODUCTS_QUERY);
        const mappedProducts: Product[] = data.products.nodes.map((node: any) => ({
          id: node.id,
          name: node.name,
          slug: node.slug,
          description: node.description,
          shortDescription: node.shortDescription,
          price: node.price,
          regularPrice: node.regularPrice,
          image: node.image,
          category: node.productCategories?.nodes[0]?.slug || 'uncategorized',
        }));
        dispatch({ type: 'SET_PRODUCTS', payload: mappedProducts });
      } catch (error) {
        console.error("Error loading products from WPGraphQL:", error);
        dispatch({ type: 'SET_LOADING', payload: false });
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
