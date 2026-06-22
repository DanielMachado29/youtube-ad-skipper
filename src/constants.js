'use strict';

/** CSS selectors for YouTube player DOM — update here when YouTube changes markup. */
const SELECTORS = {
  player: '.html5-video-player',
  moviePlayer: '#movie_player',
  skipButton: '.ytp-skip-ad-button, .ytp-ad-skip-button-modern',
  video: '.html5-main-video',
};

/** Playback rate applied during non-skippable ads. */
const PLAYBACK_RATE = 16;

/** Polling interval for ad detection fallback (ms). */
const POLL_INTERVAL_MS = 250;

/** `chrome.storage.local` key for the on/off toggle in the popup. */
const STORAGE_KEY_ENABLED = 'enabled';
