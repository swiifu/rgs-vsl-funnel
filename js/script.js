import { mountAurora } from "./aurora.js";
import { initApplyForm } from "./applyForm.js";

/* =========================================================
   RGS VSL TEMPLATE - CONFIG
   This is the only place you should need to edit to relaunch
   this template for a new offer / video / testimonial set.
========================================================= */
const RGS_CONFIG = {
  // Main VSL video. provider: "youtube" | "wistia" | "loom"
  video: {
    provider: "youtube",
    id: "7iUeDIn3s8w", // YouTube video ID, Wistia media ID, or Loom share ID
  },

  // GoHighLevel inbound webhook. Create a Workflow in GHL with an
  // "Inbound Webhook" trigger and paste its URL here — the apply
  // form POSTs { full_name, phone, instagram, email } to it.
  ghl: {
    webhookUrl: "https://services.leadconnectorhq.com/hooks/q9PTNNtybqthHssYR77H/webhook-trigger/5f1df9e6-dc12-49ce-8b68-f6d9896b798d",
  },

  // YouTube testimonials. Each uses the video's default thumbnail
  // and swaps to a live embed on click (click-to-play for performance).
  testimonials: [
    { youtubeId: "5PRFp_ywZp4", name: "Student testimonial" },
    { youtubeId: "sVLkxe1_eyw", name: "Student testimonial" },
    { youtubeId: "lmpwUnWWEoU", name: "Student testimonial" },
    { youtubeId: "iQl5EhKff48", name: "Student testimonial" },
  ],
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
      src="https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1"
      title="Main VSL"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen></iframe>`;
    initVideoScrollShield(el);
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
}

/* =========================================================
   VIDEO SCROLL SHIELD
   The main video is a cross-origin YouTube iframe, so any scroll
   gesture (wheel or touch drag) that starts over it never reaches
   the page -- the iframe's own document swallows it. That's a big,
   above-the-fold target, so it's often exactly where a visitor's
   cursor/finger is when they first try to scroll. This overlay
   forwards scroll gestures to the page while still letting a plain
   tap/click fall through to the iframe (so tapping to unmute still
   works).
========================================================= */
function initVideoScrollShield(wrapper) {
  const shield = document.createElement("div");
  shield.className = "video-scroll-shield";
  wrapper.appendChild(shield);

  function letClickThrough() {
    shield.style.pointerEvents = "none";
    setTimeout(() => {
      shield.style.pointerEvents = "";
    }, 350);
  }

  shield.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      window.scrollBy({ top: e.deltaY, left: e.deltaX, behavior: "auto" });
    },
    { passive: false }
  );

  shield.addEventListener("mousedown", letClickThrough);

  let touchStartY = 0;
  let isDragging = false;

  shield.addEventListener(
    "touchstart",
    (e) => {
      touchStartY = e.touches[0].clientY;
      isDragging = false;
    },
    { passive: true }
  );

  shield.addEventListener(
    "touchmove",
    (e) => {
      const currentY = e.touches[0].clientY;
      const delta = touchStartY - currentY;
      if (isDragging || Math.abs(delta) > 8) {
        isDragging = true;
        e.preventDefault();
        window.scrollBy({ top: delta, behavior: "auto" });
        touchStartY = currentY;
      }
    },
    { passive: false }
  );

  shield.addEventListener("touchend", () => {
    if (!isDragging) letClickThrough();
  });
}

/* =========================================================
   TESTIMONIAL GRID (click-to-play YouTube embeds)
========================================================= */
function renderTestimonials() {
  const grid = document.getElementById("testimonial-grid");
  if (!grid) return;

  grid.innerHTML = RGS_CONFIG.testimonials
    .map(
      (t, i) => `
    <div class="testimonial-item">
      <div class="testimonial-video" data-youtube-id="${t.youtubeId}" data-index="${i}">
        <img src="https://img.youtube.com/vi/${t.youtubeId}/hqdefault.jpg" alt="${t.name} testimonial thumbnail" loading="lazy">
        <div class="testimonial-play" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="12" fill="rgba(0,0,0,0.55)"/>
            <path d="M9.5 7.5v9l7-4.5-7-4.5z" fill="#fff"/>
          </svg>
        </div>
      </div>
    </div>`
    )
    .join("");

  grid.querySelectorAll(".testimonial-video").forEach((card) => {
    card.addEventListener("click", () => {
      const youtubeId = card.getAttribute("data-youtube-id");
      card.innerHTML = `<iframe
        src="https://www.youtube.com/embed/${youtubeId}?autoplay=1"
        title="Testimonial video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen></iframe>`;
    });
  });
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
   FAQ ACCORDION
========================================================= */
function initFaq() {
  document.querySelectorAll(".faq-question").forEach((btn) => {
    btn.addEventListener("click", () => {
      const answer = btn.nextElementSibling;
      const isOpen = btn.getAttribute("aria-expanded") === "true";

      document.querySelectorAll(".faq-question").forEach((other) => {
        other.setAttribute("aria-expanded", "false");
        other.nextElementSibling.style.maxHeight = null;
      });

      if (!isOpen) {
        btn.setAttribute("aria-expanded", "true");
        answer.style.maxHeight = answer.scrollHeight + "px";
      }
    });
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
  renderMainVideo();
  renderTestimonials();
  initFaq();
  initAurora();
  initApplyForm({ webhookUrl: RGS_CONFIG.ghl.webhookUrl });
  fixHashScroll();
});
