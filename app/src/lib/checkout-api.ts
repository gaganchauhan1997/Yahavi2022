/**
 * Server-side checkout client. Calls the REST endpoints registered by
 * wp-content/mu-plugins/hackknow-checkout.php (paid path) and
 * wp-content/mu-plugins/zz-hk-free-orders.php (free path).
 *
 * Timeouts:
 *   createServerOrder   — 25s (acceptable wait to create a WC order)
 *   createFreeOrder     — 25s (creates + completes + grants downloads;
 *                              dispatches DLQ-backed email asynchronously
 *                              so the request itself stays snappy)
 *   verifyServerPayment — NO timeout. Payment already captured by Razorpay;
 *                         we must not abort the verification call or the
 *                         order will be in a limbo state. The UI handles
 *                         failure by redirecting to /order-pending with
 *                         the Razorpay ID.
 */
import { WP_REST_BASE } from "./api-base";
import { getAuthToken } from "./auth-token";

const CREATE_ORDER_TIMEOUT_MS = 25_000;
const FREE_ORDER_TIMEOUT_MS = 25_000;

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function postJsonWithTimeout<T>(
  path: string,
  body: unknown,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let r: Response;
  try {
    r = await fetch(`${WP_REST_BASE}${path}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("The server took too long to respond. Please try again.");
    }
    throw err instanceof Error
      ? new Error(`Network error: ${err.message}`)
      : new Error("Network error");
  } finally {
    clearTimeout(timer);
  }
  const data = await r.json().catch(() => ({} as Record<string, unknown>));
  if (!r.ok) {
    const msg =
      (data &&
        typeof data === "object" &&
        "message" in data &&
        typeof (data as { message?: unknown }).message === "string"
        ? (data as { message: string }).message
        : null) || `Request failed (${r.status})`;
    throw new Error(msg);
  }
  return data as T;
}

async function postJsonNoTimeout<T>(path: string, body: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`${WP_REST_BASE}${path}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw err instanceof Error
      ? new Error(`Network error: ${err.message}`)
      : new Error("Network error");
  }
  const data = await r.json().catch(() => ({} as Record<string, unknown>));
  if (!r.ok) {
    const msg =
      (data &&
        typeof data === "object" &&
        "message" in data &&
        typeof (data as { message?: unknown }).message === "string"
        ? (data as { message: string }).message
        : null) || `Request failed (${r.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export interface CreateOrderInput {
  items: { product_id: number; quantity: number }[];
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
}

export interface CreateOrderResult {
  wc_order_id: number;
  razorpay_order: string;
  amount: number;
  currency: "INR";
  key_id: string;
}

export interface VerifyPaymentInput {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  wc_order_id: number;
}

export const createServerOrder = (input: CreateOrderInput) =>
  postJsonWithTimeout<CreateOrderResult>("/order", input, CREATE_ORDER_TIMEOUT_MS);

export interface VerifyDownloadFile {
  product_id: number;
  product_name: string;
  download_name: string;
  download_url: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  wc_order_id: number;
  order_number?: string;
  email?: string;
  downloads?: VerifyDownloadFile[];
}

export const verifyServerPayment = (input: VerifyPaymentInput) =>
  postJsonNoTimeout<VerifyPaymentResult>("/verify", input);

/* ── Free-order checkout (T4) ─────────────────────────────────────────────
 * Bypasses Razorpay entirely. Server endpoint /order-free hard-asserts that
 * every line item has price = 0 AND is downloadable AND has a file attached;
 * any deviation returns 422 with the offending product names. On success,
 * the WC order is created with status=completed (which triggers WC's native
 * download permission grants) and the customer receives the download links
 * both in the response and via the DLQ-backed email pipeline.
 * ─────────────────────────────────────────────────────────────────────── */
export interface CreateFreeOrderInput {
  items: { product_id: number; quantity: number }[];
  email: string;
  first_name?: string;
  last_name?: string;
}

export interface CreateFreeOrderResult {
  ok: true;
  wc_order_id: number;
  order_number: string;
  email: string;
  downloads: VerifyDownloadFile[];
}

export const createFreeOrder = (input: CreateFreeOrderInput) =>
  postJsonWithTimeout<CreateFreeOrderResult>("/order-free", input, FREE_ORDER_TIMEOUT_MS);
