/* =========================================================
   YOUTUBE IFRAME PLAYER API
   Thin wrapper for loading the YT IFrame API once and binding a
   YT.Player to an existing iframe (must include enablejsapi=1 in
   its src). This lets us drive play/mute programmatically instead
   of relying on a native click reaching the iframe -- which touch
   devices can make unreliable when something else (like a scroll
   shield) sits on top of it.
========================================================= */
let apiPromise = null;

function loadYouTubeIframeAPI() {
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }

    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousCallback === "function") previousCallback();
      resolve(window.YT);
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  });

  return apiPromise;
}

/**
 * @param {string} iframeId id of an existing <iframe> with enablejsapi=1
 * @returns {Promise<object>} resolves to the ready YT.Player instance
 */
export function createYouTubePlayer(iframeId) {
  return loadYouTubeIframeAPI().then(
    (YT) =>
      new Promise((resolve) => {
        new YT.Player(iframeId, {
          events: {
            onReady: (e) => resolve(e.target),
          },
        });
      })
  );
}
