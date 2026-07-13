import { captureAttribution } from "./attribution.js";
import { mountAurora } from "./aurora.js";
import { initApplyForm } from "./applyForm.js";
import { trackCustom, trackFirstInteraction } from "./pixel.js";
import { initVideoScrollShield } from "./videoScrollShield.js";
import { createYouTubePlayer } from "./youtubePlayer.js";

/* =========================================================
   RGS VSL TEMPLATE - CONFIG
   This is the only place you should need to edit to relaunch
   this template for a new offer / video / testimonial set.
========================================================= */
const RGS_CONFIG = {
  // Main VSL video. provider: "youtube" | "wistia" | "loom"
  video: {
    provider: "loom",
    id: "9ae34a4596fd486897ab0a2e4a486f2a", // YouTube video ID, Wistia media ID, or Loom share ID
  },

  // GoHighLevel inbound webhook. Create a Workflow in GHL with an
  // "Inbound Webhook" trigger and paste its URL here — the apply
  // form POSTs { full_name, phone, instagram, email } to it.
  ghl: {
    webhookUrl: "https://services.leadconnectorhq.com/hooks/q9PTNNtybqthHssYR77H/webhook-trigger/5f1df9e6-dc12-49ce-8b68-f6d9896b798d",
  },
};

/* =========================================================
   MAIN VSL EMBED
========================================================= */
function renderMainVideo() {
  const el = document.getElementById("vsl-player");
  if (!el) return;

  const { provider, id } = RGS_CONFIG.video;

  if (provider === "youtube") {
    el.innerHTML = `<iframe
      id="vsl-iframe"
      src="https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}"
      title="Main VSL"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen></iframe>`;
    initVideoScrollShield(el, createYouTubePlayer("vsl-iframe"));
  } else if (provider === "wistia") {
    el.innerHTML = `<wistia-player media-id="${id}"></wistia-player>`;
    if (!document.querySelector('script[src="https://fast.wistia.com/player.js"]')) {
      const s = document.createElement("script");
      s.src = "https://fast.wistia.com/player.js";
      s.async = true;
      document.head.appendChild(s);
    }
  } else if (provider === "loom") {
    el.innerHTML = `<iframe
      src="https://www.loom.com/embed/${id}"
      title="Main VSL"
      allowfullscreen
      loading="lazy"></iframe>`;
  }

  trackFirstInteraction(el, "VSLEngaged", { video_id: id });
}

/* =========================================================
   AURORA BACKGROUND (hero section)
========================================================= */
function initAurora() {
  const el = document.getElementById("aurora-bg");
  if (!el) return;

  mountAurora(el, {
    colorStops: ["#7c3aed", "#3b82f6", "#7c3aed"],
    amplitude: 1.0,
    blend: 0.6,
    speed: 0.6,
  });
}

/* =========================================================
   HASH SCROLL CORRECTION
   Dynamically injected content (video, testimonials) changes
   page height after the browser's initial scroll-to-hash, so a
   direct link to e.g. #apply can land short. Re-scroll once
   everything has settled.
========================================================= */
function fixHashScroll() {
  if (!location.hash) return;
  const target = document.querySelector(location.hash);
  if (!target) return;

  requestAnimationFrame(() => target.scrollIntoView());
  window.addEventListener("load", () => target.scrollIntoView(), { once: true });
}

document.addEventListener("DOMContentLoaded", () => {
  captureAttribution();
  renderMainVideo();
  initAurora();
  initApplyForm({ webhookUrl: RGS_CONFIG.ghl.webhookUrl });
  fixHashScroll();
});
