/**
 * Product availability map — fetched once per session from the mu-plugin
 * endpoint /hackknow/v1/product-availability. Used to overlay a small
 * green / red dot on every product card so the operator can spot products
 * that have no downloadable file attached (and would deliver nothing on
 * purchase).
 *
 * The fetch is in-memory cached and de-duped: many cards on a page all
 * share the same single in-flight request.
 */
import { useEffect, useState } from "react";
import { WP_REST_BASE } from "./api-base";

export interface AvailabilityEntry {
  has_file: boolean;
  file_count: number;
}

type AvailabilityMap = Record<string, AvailabilityEntry>;

let cache: AvailabilityMap | null = null;
let inflight: Promise<AvailabilityMap> | null = null;
const subscribers = new Set<(m: AvailabilityMap) => void>();

async function loadAvailability(): Promise<AvailabilityMap> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const r = await fetch(`${WP_REST_BASE}/product-availability`, {
        headers: { Accept: "application/json" },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as { availability?: AvailabilityMap };
      cache = data.availability || {};
    } catch {
      cache = {};
    } finally {
      inflight = null;
    }
    subscribers.forEach((fn) => fn(cache!));
    return cache!;
  })();
  return inflight;
}

export function useProductAvailability(productId: string | number | undefined): AvailabilityEntry | null {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    subscribers.add(fn);
    if (!cache) void loadAvailability();
    return () => { subscribers.delete(fn); };
  }, []);
  if (!productId || !cache) return null;
  return cache[String(productId)] ?? null;
}

/**
 * Whole-map hook used by storefront listing pages (ShopPage, HomePage) so they
 * can completely HIDE products whose has_file === false instead of merely
 * showing a red dot. Returns null until the first fetch lands; treat null as
 * "still loading — do not filter yet".
 */
export function useAvailabilityMap(): AvailabilityMap | null {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    subscribers.add(fn);
    if (!cache) void loadAvailability();
    return () => { subscribers.delete(fn); };
  }, []);
  void tick;
  return cache;
}

/**
 * Predicate used by listing-page filters. While availability is still loading
 * we OPTIMISTICALLY return true so cards aren't blanked out on first paint;
 * the moment the map loads, NO-FILE products get filtered out on next render.
 */
export function isProductDeliverable(
  productId: string | number | undefined,
  map: AvailabilityMap | null,
): boolean {
  if (!productId) return true;
  if (!map) return true;
  const entry = map[String(productId)];
  if (!entry) return true;
  return entry.has_file === true;
}
