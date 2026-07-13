import { captureAttribution } from "./attribution.js";
import { mountAurora } from "./aurora.js";
import { trackFirstInteraction } from "./pixel.js";
import { initVideoScrollShield } from "./videoScrollShield.js";
import { renderTestimonials } from "./testimonials.js";

function renderVideo() {
  const el = document.getElementById("thank-you-player");
  if (!el) return;

  const id = el.dataset.loomId;
  trackFirstInteraction(el, "ThankYouVideoEngaged", { video_id: id });

  const src = `https://www.loom.com/embed/${id}?autoplay=1&hide_owner=true&hideEmbedTopBar=true`;
  el.innerHTML = `<iframe
    id="thank-you-iframe"
    src="${src}"
    title="Watch before your call"
    allow="autoplay; fullscreen; picture-in-picture"
    allowfullscreen></iframe>`;

  // Browsers block autoplay WITH sound until the visitor has interacted with
  // the page, and Loom's embed exposes no unmute API. So the embed autoplays
  // (muted, per browser policy) on load, and we reload it on the first
  // interaction anywhere on the page -- by then the document has "sticky" user
  // activation, so the fresh embed is allowed to start over with audio.
  const iframe = document.getElementById("thank-you-iframe");
  const events = ["pointerdown", "touchstart", "keydown", "wheel"];
  let unlocked = false;
  const unlockSound = () => {
    if (unlocked) return;
    unlocked = true;
    events.forEach((e) => window.removeEventListener(e, unlockSound, true));
    iframe.src = src; // fresh load under user activation -> plays with sound
  };
  events.forEach((e) =>
    window.addEventListener(e, unlockSound, { capture: true, passive: true })
  );

  // No player promise: Loom has no YouTube-style JS API here, so the shield
  // just forwards scroll gestures and lets a tap fall through to the iframe.
  initVideoScrollShield(el);
}

function initAurora() {
  const el = document.getElementById("aurora-bg");
  if (!el) return;

  // A distinct amber/purple pulse (vs. the site's blue/purple) so this
  // page reads as a different, higher-stakes moment than the rest of
  // the funnel.
  mountAurora(el, {
    colorStops: ["#f59e0b", "#7c3aed", "#f59e0b"],
    amplitude: 1.1,
    blend: 0.6,
    speed: 0.6,
  });
}

document.addEventListener("DOMContentLoaded", () => {
  captureAttribution();
  renderVideo();
  renderTestimonials();
  initAurora();
});
