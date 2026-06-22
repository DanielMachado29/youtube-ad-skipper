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
    if (!button) return false;
    const style = window.getComputedStyle(button);
    const rect = button.getBoundingClientRect();
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      parseFloat(style.opacity) > 0 &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function cancelAdPlayback() {
    const player = document.querySelector(SELECTORS.moviePlayer);
    if (!player || typeof player.cancelPlayback !== 'function') return false;
    try {
      player.cancelPlayback();
      return true;
    } catch (_) {
      return false;
    }
  }

  function seekToAdEnd(video, player) {
    const duration = video.duration;
    if (!duration || !isFinite(duration) || duration <= 0) return;

    if (typeof player?.seekTo === 'function') {
      player.seekTo(duration, true);
    } else {
      video.currentTime = duration - 0.1;
    }
  }

  function skipAd() {
    // YouTube ignores programmatic .click() from extensions (isTrusted check).
    // cancelPlayback() on the internal player API is the reliable skip path.
    if (cancelAdPlayback()) return;

    const skipBtn = document.querySelector(SELECTORS.skipButton);
    if (isSkipButtonVisible(skipBtn)) {
      skipBtn.click();
      cancelAdPlayback();
      return;
    }

    const video = document.querySelector(SELECTORS.video);
    if (!video) return;

    const player = document.querySelector(SELECTORS.moviePlayer);
    video.playbackRate = PLAYBACK_RATE;
    seekToAdEnd(video, player);
    cancelAdPlayback();
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
