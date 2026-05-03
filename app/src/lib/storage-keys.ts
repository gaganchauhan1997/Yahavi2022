/**
 * Central registry for ALL localStorage / sessionStorage keys used by the storefront.
 * Add new keys here — never inline a string literal again.
 */
export const STORAGE_KEYS = {
  // Legal / compliance
  COOKIE_CONSENT:    'hackknow-cookie-consent',   // localStorage: "accepted" | "declined"

  // Conversion overlays
  EXIT_MODAL_SEEN:   'hk_exit_modal_seen_v1',     // sessionStorage: "1" once shown
  ANN_BAR_DISMISSED: 'hk_ann_bar_dismissed_v2',   // sessionStorage: "1" once dismissed
  LEAD_FALLBACK:     'hk_local_leads_v1',         // localStorage: array<{email,source,ts}>
} as const;

/** True only if the user has explicitly accepted or declined cookies. */
export function hasCookieConsent(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEYS.COOKIE_CONSENT);
    return v === 'accepted' || v === 'declined';
  } catch { return false; }
}
