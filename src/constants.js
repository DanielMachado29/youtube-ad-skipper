'use strict';

/** CSS selectors for YouTube player DOM — update here when YouTube changes markup. */
const SELECTORS = {
  player: '.html5-video-player',
  moviePlayer: '#movie_player',
  skipButton:
    '.ytp-skip-ad-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button, .ytp-ad-skip-button-slot button, button.ytp-ad-skip-button',
  video: '.html5-main-video',
  /** Static / overlay ads shown after a normal pre-roll (often "2 of 2" in an ad pod). */
  overlayAd:
    '.ytp-ad-player-overlay-layout, .ytp-ad-action-interstitial, .ytp-ad-image-overlay, .ytp-ad-text-overlay',
  adModule: '.video-ads.ytp-ad-module',
  adPodIndex: '.ytp-ad-pod-index',
};

/** Max duration (s) for a separate ad `<video>` — longer streams are main content. */
const MAX_AD_VIDEO_DURATION_SEC = 120;

/** Playback rate applied during non-skippable ads. */
const PLAYBACK_RATE = 16;

/** Polling interval for ad detection fallback (ms). */
const POLL_INTERVAL_MS = 250;

/** Keep skipping briefly between ads in a multi-ad pod ("1 of 2" → "2 of 2"). */
const AD_POD_GRACE_MS = 3000;

/** `chrome.storage.local` key for the on/off toggle in the popup. */
const STORAGE_KEY_ENABLED = 'enabled';
