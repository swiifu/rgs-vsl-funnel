/* =========================================================
   META PIXEL HELPERS
   Thin wrappers around the global fbq() injected by the base
   pixel snippet in each page's <head>. Every function is a
   safe no-op when the pixel is absent or blocked by an ad
   blocker, so tracking never breaks the funnel itself.
========================================================= */

/** Standard Meta event (Lead, InitiateCheckout, ViewContent, ...). */
export function track(event, params) {
  if (typeof window.fbq === "function") window.fbq("track", event, params);
}

/** Custom event — shows up in Events Manager under its own name. */
export function trackCustom(event, params) {
  if (typeof window.fbq === "function") window.fbq("trackCustom", event, params);
}

/**
 * Fires a standard event at most once per browser session, keyed by
 * `key` — guards conversion events (e.g. Lead on the thank-you page)
 * against refresh double-counting.
 */
export function trackOncePerSession(key, event, params) {
  const storageKey = `rgs_px_${key}`;
  try {
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, "1");
  } catch (_) {
    /* storage unavailable (private mode etc.) — still fire the event */
  }
  track(event, params);
}

/**
 * Fires a custom event the first time the user interacts with `el`
 * (pointerdown bubbles up from the scroll shield / iframe wrapper).
 */
export function trackFirstInteraction(el, event, params) {
  if (!el) return;
  el.addEventListener("pointerdown", () => trackCustom(event, params), { once: true });
}
