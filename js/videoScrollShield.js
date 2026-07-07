/* =========================================================
   VIDEO SCROLL SHIELD
   A cross-origin YouTube iframe swallows any scroll gesture (wheel
   or touch drag) that starts over it -- the iframe's own document
   handles the event, and it never reaches the outer page at all.
   For an above-the-fold video, that's often exactly where a
   visitor's cursor/finger is when they first try to scroll. This
   overlay forwards scroll gestures to the page while still letting
   a plain tap/click fall through to the iframe (so tapping to
   unmute still works).
========================================================= */
export function initVideoScrollShield(wrapper) {
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
      // A physical mouse wheel typically reports deltaMode 1 (lines) or
      // 2 (pages), not 0 (pixels) -- treating that raw number as pixels
      // makes scrolling over the shield feel almost frozen on desktop.
      const factor = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      window.scrollBy({ top: e.deltaY * factor, left: e.deltaX * factor, behavior: "auto" });
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
