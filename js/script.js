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
    { youtubeId: "LgdC6Qi-aYI", name: "Student testimonial" },
    { youtubeId: "n1W73s-V-oM", name: "Student testimonial" },
    { youtubeId: "C2agOx3Fgsk", name: "Student testimonial" },
    { youtubeId: "sVLkxe1_eyw", name: "Student testimonial" },
    { youtubeId: "lmpwUnWWEoU", name: "Student testimonial" },
    { youtubeId: "2mdx_5Jp51o", name: "Student testimonial" },
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
      trackCustom("TestimonialPlay", { video_id: youtubeId });
      openTestimonialModal(youtubeId);
    });
  });
}

/* =========================================================
   TESTIMONIAL VIDEO MODAL
   Clicking a student win opens the video centered in a modal,
   followed by a nudge into the apply flow.
========================================================= */
function openTestimonialModal(youtubeId) {
  const overlay = document.createElement("div");
  overlay.className = "video-modal-overlay";

  const dialog = document.createElement("div");
  dialog.className = "video-modal-dialog";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "apply-modal-close";
  closeBtn.innerHTML = "&times;";
  closeBtn.setAttribute("aria-label", "Close");

  const player = document.createElement("div");
  player.className = "video-modal-player";
  player.innerHTML = `<iframe
    src="https://www.youtube.com/embed/${youtubeId}?autoplay=1"
    title="Testimonial video"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen></iframe>`;

  const question = document.createElement("p");
  question.className = "video-modal-question";
  question.textContent = "Does their story relate to you?";

  const cta = document.createElement("a");
  cta.href = "#apply";
  cta.className = "btn btn-primary btn-lg btn-shiny";
  cta.innerHTML = "<span>Request My Free Consultation</span>";

  dialog.append(closeBtn, player, question, cta);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  function close() {
    overlay.classList.remove("is-open");
    document.body.classList.remove("video-modal-open");
    document.removeEventListener("keydown", onKeydown);
    setTimeout(() => overlay.remove(), 200);
  }

  function onKeydown(e) {
    if (e.key === "Escape") close();
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  closeBtn.addEventListener("click", close);
  // The apply modal opens via applyForm.js's own delegated a[href="#apply"]
  // listener -- this just dismisses the video modal out of the way.
  cta.addEventListener("click", close);
  document.addEventListener("keydown", onKeydown);

  requestAnimationFrame(() => {
    overlay.classList.add("is-open");
    document.body.classList.add("video-modal-open");
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
  document.querySelectorAll(".faq-item").forEach((item) => {
    const btn = item.querySelector(".faq-question");
    const answer = item.querySelector(".faq-answer");

    btn.addEventListener("click", () => {
      const isOpen = btn.getAttribute("aria-expanded") === "true";

      document.querySelectorAll(".faq-item").forEach((otherItem) => {
        otherItem.querySelector(".faq-question").setAttribute("aria-expanded", "false");
        const otherAnswer = otherItem.querySelector(".faq-answer");
        otherAnswer.style.maxHeight = null;
        otherAnswer.querySelector(".faq-video")?.remove();
      });

      if (!isOpen) {
        btn.setAttribute("aria-expanded", "true");
        trackCustom("FAQOpen", { question: btn.textContent.replace(/\+\s*$/, "").trim() });

        const youtubeId = item.dataset.youtubeId;
        if (youtubeId) {
          const video = document.createElement("div");
          video.className = "faq-video";
          video.innerHTML = `<iframe
            src="https://www.youtube.com/embed/${youtubeId}?autoplay=1"
            title="FAQ answer video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen></iframe>`;
          answer.prepend(video);
        }

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
