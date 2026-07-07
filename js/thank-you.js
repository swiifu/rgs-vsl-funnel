import { mountAurora } from "./aurora.js";
import { initVideoScrollShield } from "./videoScrollShield.js";

function renderVideo() {
  const el = document.getElementById("thank-you-player");
  if (!el) return;

  const id = el.dataset.mediaId;
  el.innerHTML = `<iframe
    src="https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1"
    title="Watch before your call"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen></iframe>`;
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
  renderVideo();
  initAurora();
});
