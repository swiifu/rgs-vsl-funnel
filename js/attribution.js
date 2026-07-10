/* =========================================================
   ATTRIBUTION CAPTURE
   Reads ad-attribution params (utm_*, fbclid) off the landing
   URL and persists them in localStorage, so they survive
   navigation between pages and even a return visit days later
   (last-touch: a new ad click overwrites the stored set).
   applyForm.js merges these into the GHL webhook payload so
   every lead record carries which ad / source produced it —
   without this, the UTMs just sit in the address bar and are
   lost the moment the visitor converts.
========================================================= */

const PARAM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
];

const STORAGE_KEY = "rgs_attribution";

/** Call once per page load — stores any attribution params present on the URL. */
export function captureAttribution() {
  let found = null;
  try {
    const params = new URLSearchParams(window.location.search);
    for (const key of PARAM_KEYS) {
      const value = params.get(key);
      if (value) (found ||= {})[key] = value;
    }
    if (found) {
      found.landing_page = window.location.pathname + window.location.search;
      found.captured_at = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
    }
  } catch (_) {
    /* storage unavailable — attribution becomes best-effort for this visit */
  }
}

/** The stored attribution set, or {} if the visitor arrived with none. */
export function getAttribution() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (_) {
    return {};
  }
}

/**
 * Query string (no leading "?") of the stored utm_ and fbclid params, for
 * carrying attribution across internal redirects (e.g. onto thank-you.html)
 * so URL-based custom conversions in Events Manager can still match on it.
 */
export function attributionQueryString() {
  const stored = getAttribution();
  const params = new URLSearchParams();
  for (const key of PARAM_KEYS) {
    if (stored[key]) params.set(key, stored[key]);
  }
  return params.toString();
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

/**
 * Meta's browser identifiers (_fbp / _fbc cookies, set by the pixel).
 * Forwarded to GHL so a server-side Conversions API integration can
 * match events back to the same person Meta saw in the browser.
 */
export function getMetaBrowserIds() {
  return { fbp: getCookie("_fbp"), fbc: getCookie("_fbc") };
}
