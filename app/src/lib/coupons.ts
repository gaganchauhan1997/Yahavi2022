import { getAuthToken } from "./auth-token";

const WP_BASE = "https://shop.hackknow.com/wp-json/hackknow/v1";

export type CouponContext = "checkout" | "wallet";

export interface CouponPreview {
  code: string;
  value_yavi: number;
  message: string;
}

export interface CouponRedemption {
  code: string;
  credited_yavi: number;
  balance_yavi: number;
}

interface WpError { message?: string; code?: string }

async function couponPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const tok = getAuthToken();
  if (!tok) throw new Error("Please sign in to use coupons.");
  const res = await fetch(`${WP_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${tok}`,
    },
    body: JSON.stringify(body),
  });
  let data: unknown = null;
  try { data = await res.json(); } catch { /* non-json */ }
  if (!res.ok) {
    const err = data as WpError | null;
    const msg =
      (err && typeof err.message === "string" && err.message) ||
      `Coupon request failed (HTTP ${res.status}).`;
    throw new Error(msg);
  }
  return data as T;
}

/** Validate a coupon WITHOUT consuming the per-user limit. Server returns
 * the YAVI value the user would receive, and a friendly message. */
export async function previewCoupon(code: string, context: CouponContext): Promise<CouponPreview> {
  return couponPost<CouponPreview>("/coupons/preview", { code, context });
}

/** Redeem a coupon. Idempotent server-side via reservation table + wallet
 * UNIQUE(rzp_payment_id) anchor with synthetic key `coupon_<cid>_<uid>_<seq>`. */
export async function redeemCoupon(code: string, context: CouponContext): Promise<CouponRedemption> {
  return couponPost<CouponRedemption>("/coupons/redeem", { code, context });
}
