/** Checkout requests have bounded UI waits. A verification timeout does not
 * cancel a captured payment: CheckoutPage redirects to pending status. Never
 * retry a charge automatically after a network/verification failure. */
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
  try {
    const r = await fetch(`${WP_REST_BASE}${path}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await r.json();
    if (!r.ok) {
      const message = data && typeof data.message === "string"
        ? data.message : `Request failed (${r.status})`;
      throw new Error(message);
    }
    return data as T;
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error("Confirmation is taking longer than expected. Check your order status before trying again.");
    }
    throw err instanceof Error ? err : new Error("Request failed. Check your order status.");
  } finally {
    // Include response body consumption in the deadline, not just the headers.
    clearTimeout(timer);
  }
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
  postJsonWithTimeout<VerifyPaymentResult>("/verify", input, 45_000);

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
