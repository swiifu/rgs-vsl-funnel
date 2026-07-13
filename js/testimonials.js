import { trackCustom } from "./pixel.js";

/* =========================================================
   STUDENT WINS (TESTIMONIALS)
   YouTube testimonials rendered as click-to-play thumbnails.
   Each swaps to a live embed in a modal on click.
========================================================= */
export const TESTIMONIALS = [
  { youtubeId: "LgdC6Qi-aYI", name: "Student testimonial" },
  { youtubeId: "n1W73s-V-oM", name: "Student testimonial" },
  { youtubeId: "C2agOx3Fgsk", name: "Student testimonial" },
  { youtubeId: "sVLkxe1_eyw", name: "Student testimonial" },
  { youtubeId: "lmpwUnWWEoU", name: "Student testimonial" },
  { youtubeId: "2mdx_5Jp51o", name: "Student testimonial" },
];

/* =========================================================
   TESTIMONIAL GRID (click-to-play YouTube embeds)
   Pass { showApplyCta: true } to append the apply-flow nudge
   inside the video modal (landing page). On pages past the
   apply step (thank-you) leave it off so the modal is just
   the video.
========================================================= */
export function renderTestimonials({ showApplyCta = false } = {}) {
  const grid = document.getElementById("testimonial-grid");
  if (!grid) return;

  grid.innerHTML = TESTIMONIALS
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
      openTestimonialModal(youtubeId, { showApplyCta });
    });
  });
}

/* =========================================================
   TESTIMONIAL VIDEO MODAL
   Clicking a student win opens the video centered in a modal.
   On the landing page it's followed by a nudge into the apply
   flow; elsewhere it's just the video.
========================================================= */
function openTestimonialModal(youtubeId, { showApplyCta = false } = {}) {
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

  dialog.append(closeBtn, player);

  let cta;
  if (showApplyCta) {
    const question = document.createElement("p");
    question.className = "video-modal-question";
    question.textContent = "Does their story relate to you?";

    cta = document.createElement("a");
    cta.href = "#apply";
    cta.className = "btn btn-primary btn-lg btn-shiny";
    cta.innerHTML = "<span>Request My Free Consultation</span>";

    dialog.append(question, cta);
  }

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
  cta?.addEventListener("click", close);
  document.addEventListener("keydown", onKeydown);

  requestAnimationFrame(() => {
    overlay.classList.add("is-open");
    document.body.classList.add("video-modal-open");
  });
}
