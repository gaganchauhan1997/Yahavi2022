/**
 * HackKnow Wallet / Community / Sponsor API helpers
 * All endpoints under /wp-json/hackknow/v1/ on shop.hackknow.com
 */
import { WP_REST_BASE } from "./api-base";
import { getAuthToken } from "./auth-token";

export interface HkBadges {
  logged_in: boolean;
  wallet_coins?: number;
  community?: boolean;
  sponsor_tier?: "none" | "bronze" | "silver" | "gold" | "platinum" | "godfather";
  sponsor_total_rs?: number;
  verified_role?: string;
}

export interface WalletData {
  coins: number;
  log: Array<{ t: number; d: number; r: string }>;
}

export interface SponsorTier {
  tier: string;          // 'bronze' | 'silver' | 'gold' | 'platinum' | 'godfather'
  name: string;
  monthly: number;       // legacy alias — same as `min`, "starts at ₹X"
  min: number;
  max: number | null;
  color: string;
  perks: string[];
}

export interface SponsorMe {
  tier: string;
  since: number;
  total_paise: number;
  total_rs: number;
}

export interface SponsorOrderResponse {
  ok: boolean;
  order_id: string;
  amount: number;        // paise
  currency: string;
  key_id: string;
  receipt: string;
  template_id?: number;
}

export interface SponsorVerifyResponse {
  ok: boolean;
  tier: string;
  total_rs: number;
  amount_paid_rs: number;
  sponsorship_id?: number;
  template?: { id: number; title: string };
}

export interface SponsorshipTemplate {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  min_rs: number;
  suggested_rs: number;
  thumbnail: string | null;
  created_at: number;
}

export interface SponsorshipWall {
  tiers: Array<{
    tier: string;
    name: string;
    color: string;
    sponsors: Array<{ name: string; amount_rs: number; paid_at: number }>;
  }>;
  stats: { total_rs: number; total_count: number; anon_count: number };
}

export interface CommunityStatus {
  joined: boolean;
  joined_at: number;
  member_count: number;
}

const TIMEOUT_MS = 10_000;

function authHeaders(): HeadersInit {
  const t = getAuthToken();
  const h: Record<string, string> = { Accept: "application/json" };
  if (t) h["Authorization"] = `Bearer ${t}`;
  return h;
}

async function getJson<T>(path: string): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${WP_REST_BASE}${path}`, {
      headers: authHeaders(),
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function postJson<T>(path: string, body: unknown = {}): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${WP_REST_BASE}${path}`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg =
        (data && typeof data === "object" && "message" in data && typeof (data as { message?: unknown }).message === "string"
          ? (data as { message: string }).message
          : null) || `Request failed (${r.status})`;
      throw new Error(msg);
    }
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

export const hkBadges = {
  /** Combined badges for header — safe to call when logged out */
  me: () => getJson<HkBadges>("/me/badges"),

  /* Wallet */
  walletMe: () => getJson<WalletData>("/wallet/me"),
  walletRedeem: (coins: number) =>
    postJson<{ ok: boolean; coupon_code: string; rupees_off: number; remaining_coins: number }>(
      "/wallet/redeem",
      { coins }
    ),

  /* Community */
  communityMe: () => getJson<CommunityStatus>("/community/me"),
  communityJoin: () => postJson<{ ok: boolean; joined_at: number }>("/community/join"),

  /* Sponsor — tiers + status */
  sponsorTiers: () => getJson<SponsorTier[]>("/sponsor/tiers"),
  sponsorMe: () => getJson<SponsorMe>("/sponsor/me"),

  /* Sponsor — REAL Razorpay flow (replaces intent) */
  sponsorOrder: (body: { amount_rs: number; sponsor_name?: string; anonymous?: boolean; message?: string }) =>
    postJson<SponsorOrderResponse>("/sponsor/order", body),
  sponsorVerify: (body: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    sponsor_name?: string;
    anonymous?: boolean;
    message?: string;
  }) => postJson<SponsorVerifyResponse>("/sponsor/verify", body),

  /* Sponsor — legacy intent (kept for backward compatibility) */
  sponsorIntent: (tier: string) =>
    postJson<{ ok: boolean; status: string; tier: string; message: string }>(
      "/sponsor/intent",
      { tier }
    ),

  /* Pay-what-you-want community templates */
  sponsorshipTemplates: () => getJson<SponsorshipTemplate[]>("/sponsorship/templates"),
  sponsorshipTemplateOrder: (body: {
    template_id: number;
    amount_rs: number;
    sponsor_name?: string;
    anonymous?: boolean;
    message?: string;
  }) => postJson<SponsorOrderResponse>("/sponsorship/template/order", body),
  sponsorshipTemplateVerify: (body: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    template_id: number;
    sponsor_name?: string;
    anonymous?: boolean;
    message?: string;
  }) => postJson<SponsorVerifyResponse>("/sponsorship/template/verify", body),

  /* Public sponsor wall */
  sponsorshipWall: () => getJson<SponsorshipWall>("/sponsorship/wall"),
};
