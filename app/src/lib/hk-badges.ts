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
  sponsor_tier?: "none" | "bronze" | "silver" | "gold";
  verified_role?: string;
}

export interface WalletData {
  coins: number;
  log: Array<{ t: number; d: number; r: string }>;
}

export interface SponsorTier {
  tier: "bronze" | "silver" | "gold";
  name: string;
  monthly: number;
  perks: string[];
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

  /* Sponsor */
  sponsorTiers: () => getJson<SponsorTier[]>("/sponsor/tiers"),
  sponsorMe: () => getJson<{ tier: string; since: number }>("/sponsor/me"),
  sponsorIntent: (tier: "bronze" | "silver" | "gold") =>
    postJson<{ ok: boolean; status: string; tier: string; message: string }>(
      "/sponsor/intent",
      { tier }
    ),
};
