/**
 * YAVI Wallet API client — talks to /wp-json/hk/v1/wallet/* endpoints
 * (registered by zz-hk-wallet.php mu-plugin). Independent of the legacy
 * `wallet_coins` system in hk-badges.ts. Uses Bearer token from auth-token.
 */
import { API_BASE } from "./api-base";
import { getAuthToken } from "./auth-token";

const BASE = `${API_BASE}/wp-json/hk/v1/wallet`;
const TIMEOUT_MS = 12_000;

export interface WalletLedgerRow {
  id: number;
  type: string;
  delta_yavi: number;
  balance_after: number;
  ref_kind: string;
  ref_id: string;
  amount_paise: number;
  note: string;
  created_at: string;
}

export interface WalletMe {
  ok: boolean;
  balance_yavi: number;
  tiers: Record<string, number>;
  recent: WalletLedgerRow[];
  currency: "YAVI";
  topup_enabled: boolean;
}

export interface TopupOrder {
  ok: boolean;
  order_id: string;
  amount_paise: number;
  amount_inr: number;
  tokens_to_credit: number;
  currency: "INR";
  key_id: string;
  name: string;
  description: string;
  prefill_email?: string;
}

export interface TopupVerifyResult {
  ok: boolean;
  credited_yavi: number;
  balance_yavi: number;
  duplicate?: boolean;
  ledger_id: number;
}

function authHeaders(): HeadersInit {
  const t = getAuthToken();
  const h: Record<string, string> = { Accept: "application/json" };
  if (t) h["Authorization"] = `Bearer ${t}`;
  return h;
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        ...authHeaders(),
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers || {}),
      },
      signal: ctrl.signal,
    });
    const data = await r.json().catch(() => ({} as Record<string, unknown>));
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

export const yaviWallet = {
  me: () => req<WalletMe>("/me"),
  history: (limit = 50, offset = 0) =>
    req<{ ok: boolean; total: number; items: WalletLedgerRow[] }>(
      `/history?limit=${limit}&offset=${offset}`
    ),
  createOrder: (amount_inr: number) =>
    req<TopupOrder>("/topup/create-order", {
      method: "POST",
      body: JSON.stringify({ amount_inr }),
    }),
  verify: (p: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    amount_inr: number;
  }) =>
    req<TopupVerifyResult>("/topup/verify", {
      method: "POST",
      body: JSON.stringify(p),
    }),
};

/** Lazy-load Razorpay Checkout JS once (idempotent). */
const RZP_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
let rzpScriptPromise: Promise<void> | null = null;
export function loadRazorpay(): Promise<void> {
  type WindowWithRzp = Window & { Razorpay?: unknown };
  const w = window as WindowWithRzp;
  if (w.Razorpay) return Promise.resolve();
  if (rzpScriptPromise) return rzpScriptPromise;
  rzpScriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = RZP_SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { rzpScriptPromise = null; reject(new Error("Failed to load Razorpay")); };
    document.head.appendChild(s);
  });
  return rzpScriptPromise;
}
