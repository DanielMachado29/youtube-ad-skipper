'use strict';

(function () {
  let isAdActive = false;
  let pollTimerId = null;
  let observer = null;
  let waitTimerId = null;

  function detectAd() {
    const player = document.querySelector(SELECTORS.player);
    const moviePlayer = document.querySelector(SELECTORS.moviePlayer);
    const adState = moviePlayer?.getAdState?.();
    return player?.classList.contains('ad-showing') || adState === 1;
  }

  function isSkipButtonVisible(button) {
    return button && button.offsetParent !== null;
  }

  function skipAd() {
    const skipBtn = document.querySelector(SELECTORS.skipButton);
    if (isSkipButtonVisible(skipBtn)) {
      skipBtn.click();
      return;
    }

    const video = document.querySelector(SELECTORS.video);
    if (!video) return;

    video.playbackRate = PLAYBACK_RATE;
    if (video.duration && isFinite(video.duration) && video.duration > 0) {
      video.currentTime = video.duration - 0.1;
    }
  }

  function restorePlaybackRate() {
    const video = document.querySelector(SELECTORS.video);
    if (video) {
      video.playbackRate = 1;
    }
  }

  function tick() {
    const adNow = detectAd();

    if (adNow && !isAdActive) {
      isAdActive = true;
    }

    if (adNow) {
      skipAd();
    }

    if (!adNow && isAdActive) {
      isAdActive = false;
      restorePlaybackRate();
    }
  }

  function stopPolling() {
    if (pollTimerId !== null) {
      clearInterval(pollTimerId);
      pollTimerId = null;
    }
  }

  function startPolling() {
    if (pollTimerId !== null) return;
    pollTimerId = setInterval(tick, POLL_INTERVAL_MS);
  }

  function teardownObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  function findPlayerContainer() {
    return (
      document.querySelector(SELECTORS.moviePlayer) ||
      document.querySelector(SELECTORS.player)
    );
  }

  function setupObserver() {
    teardownObserver();

    const container = findPlayerContainer();
    if (!container) return false;

    observer = new MutationObserver(tick);
    observer.observe(container, {
      attributes: true,
      attributeFilter: ['class'],
      subtree: true,
      childList: true,
    });
    return true;
  }

  function stopWaitingForPlayer() {
    if (waitTimerId !== null) {
      clearInterval(waitTimerId);
      waitTimerId = null;
    }
  }

  function waitForPlayer() {
    stopWaitingForPlayer();

    waitTimerId = setInterval(() => {
      if (setupObserver()) {
        stopWaitingForPlayer();
        tick();
      }
    }, POLL_INTERVAL_MS);
  }

  function init() {
    if (isAdActive) {
      restorePlaybackRate();
      isAdActive = false;
    }

    stopWaitingForPlayer();
    teardownObserver();
    stopPolling();

    if (!setupObserver()) {
      waitForPlayer();
    }

    startPolling();
    tick();
  }

  function boot() {
    init();
    document.addEventListener('yt-navigate-finish', init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
