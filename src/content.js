'use strict';

(function () {
  let isAdActive = false;
  let isEnabled = true;
  let pollTimerId = null;
  let observer = null;
  let waitTimerId = null;
  let adGraceUntil = 0;

  function isElementVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      parseFloat(style.opacity) > 0 &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function findSkipButtons() {
    return [...document.querySelectorAll(SELECTORS.skipButton)].filter(
      isSkipButtonVisible
    );
  }

  function detectAdPod() {
    const podIndex = document.querySelector(SELECTORS.adPodIndex);
    if (!podIndex || !isElementVisible(podIndex)) return false;
    const text = podIndex.textContent?.trim() ?? '';
    return /\d+\s+(?:of|de)\s+\d+/i.test(text);
  }

  function detectOverlayAd() {
    const overlays = document.querySelectorAll(SELECTORS.overlayAd);
    for (const overlay of overlays) {
      if (isElementVisible(overlay)) return true;
    }

    const adModule = document.querySelector(SELECTORS.adModule);
    if (isElementVisible(adModule) && findSkipButtons().length > 0) {
      return true;
    }

    return false;
  }

  function detectAd() {
    const player = document.querySelector(SELECTORS.player);
    const moviePlayer = document.querySelector(SELECTORS.moviePlayer);
    const adState = moviePlayer?.getAdState?.();

    if (player?.classList.contains('ad-showing')) return true;
    if (player?.classList.contains('ad-interrupting')) return true;
    if (adState === 1) return true;
    if (detectAdPod()) return true;
    if (detectOverlayAd()) return true;
    if (findSkipButtons().length > 0) return true;

    return false;
  }

  function isSkipButtonVisible(button) {
    return isElementVisible(button);
  }

  function cancelAdPlayback() {
    const player = document.querySelector(SELECTORS.moviePlayer);
    if (!player || typeof player.cancelPlayback !== 'function') return;
    try {
      player.cancelPlayback();
    } catch (_) {
      /* ignore */
    }
  }

  function invokeSkipAdApi() {
    const player = document.querySelector(SELECTORS.moviePlayer);
    if (!player || typeof player.skipAd !== 'function') return;
    try {
      player.skipAd();
    } catch (_) {
      /* ignore */
    }
  }

  function isSeparateAdVideo(video) {
    const duration = video?.duration;
    if (!duration || !isFinite(duration) || duration <= 0) return false;
    return duration <= MAX_AD_VIDEO_DURATION_SEC;
  }

  function seekToAdEnd(video, player) {
    if (!isSeparateAdVideo(video)) return;

    const duration = video.duration;
    if (typeof player?.seekTo === 'function') {
      player.seekTo(duration, true);
    } else {
      video.currentTime = duration - 0.1;
    }
  }

  function clickSkipButtons() {
    const buttons = findSkipButtons();
    if (buttons.length === 0) return false;

    for (const button of buttons) {
      button.click();
    }
    return true;
  }

  function skipAd() {
    // Layer every skip path — overlay/static ads often ignore cancelPlayback alone.
    cancelAdPlayback();
    invokeSkipAdApi();
    clickSkipButtons();

    const video = document.querySelector(SELECTORS.video);
    if (!video) return;

    const player = document.querySelector(SELECTORS.moviePlayer);

    // Overlay/static ads reuse the main video — only seek when a short ad clip is playing.
    if (!isSeparateAdVideo(video)) return;

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

    if (adNow) {
      adGraceUntil = Date.now() + AD_POD_GRACE_MS;
    }

    const inAdSequence = adNow || Date.now() < adGraceUntil;

    if (inAdSequence && !isAdActive) {
      isAdActive = true;
    }

    if (inAdSequence) {
      skipAd();
    }

    if (!inAdSequence && isAdActive) {
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

  function shutdown() {
    if (isAdActive) {
      restorePlaybackRate();
      isAdActive = false;
    }
    adGraceUntil = 0;

    stopWaitingForPlayer();
    teardownObserver();
    stopPolling();
  }

  function init() {
    if (!isEnabled) return;

    shutdown();

    if (!setupObserver()) {
      waitForPlayer();
    }

    startPolling();
    tick();
  }

  function onNavigate() {
    if (isEnabled) init();
  }

  function setEnabled(enabled) {
    isEnabled = enabled;
    if (enabled) {
      init();
    } else {
      shutdown();
    }
  }

  function boot() {
    chrome.storage.local.get({ [STORAGE_KEY_ENABLED]: true }, (result) => {
      setEnabled(result[STORAGE_KEY_ENABLED]);
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes[STORAGE_KEY_ENABLED]) return;
      setEnabled(changes[STORAGE_KEY_ENABLED].newValue);
    });

    document.addEventListener('yt-navigate-finish', onNavigate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
