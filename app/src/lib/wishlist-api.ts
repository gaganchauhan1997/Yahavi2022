import { WP_REST_BASE } from "./api-base";
import { getAuthToken } from "./auth-token";

interface WishlistResponse {
  wishlist: string[];
}
interface ToggleResponse {
  action: "added" | "removed";
  wishlist: string[];
}

function authHeaders(): HeadersInit {
  const token = getAuthToken();
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

export async function fetchServerWishlist(): Promise<string[]> {
  try {
    const res = await fetch(`${WP_REST_BASE}/wishlist`, {
      headers: authHeaders(),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data: WishlistResponse = await res.json();
    return Array.isArray(data.wishlist) ? data.wishlist : [];
  } catch {
    return [];
  }
}

export async function toggleServerWishlist(productId: string): Promise<string[]> {
  try {
    const res = await fetch(`${WP_REST_BASE}/wishlist/toggle`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ product_id: productId }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data: ToggleResponse = await res.json();
    return Array.isArray(data.wishlist) ? data.wishlist : [];
  } catch {
    return [];
  }
}
