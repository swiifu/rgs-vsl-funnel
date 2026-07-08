/* =========================================================
   VIDEO SCROLL SHIELD
   A cross-origin YouTube iframe swallows any scroll gesture (wheel
   or touch drag) that starts over it -- the iframe's own document
   handles the event, and it never reaches the outer page at all.
   For an above-the-fold video, that's often exactly where a
   visitor's cursor/finger is when they first try to scroll. This
   overlay forwards scroll gestures to the page.

   A plain tap is meant to fall through to the iframe (so tapping to
   play/unmute still works), but on touch devices the browser often
   locks the resulting synthetic "click" to whatever received the
   original touchstart -- which is this shield, not the iframe --
   even after we make the shield pointer-events:none. That's why it
   could take two taps to register. So instead of only relying on
   the fall-through, a tap also drives play/unmute directly through
   the YouTube IFrame Player API (see youtubePlayer.js), which works
   on the very first tap.
========================================================= */
export function initVideoScrollShield(wrapper, playerPromise) {
  const shield = document.createElement("div");
  shield.className = "video-scroll-shield";
  wrapper.appendChild(shield);

  let player = null;
  if (playerPromise) {
    playerPromise.then((p) => { player = p; }).catch(() => {});
  }

  function activateVideo() {
    if (!player) return;
    try {
      if (typeof player.unMute === "function") player.unMute();
      if (typeof player.playVideo === "function") player.playVideo();
    } catch (err) {
      // Player may not be fully initialized yet -- safe to ignore.
    }
  }

  function letClickThrough() {
    activateVideo();
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
