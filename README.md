# YouTube Ad Skipper

A Chrome extension that automatically skips YouTube video ads (pre-roll and mid-roll) by detecting when an ad is playing and applying layered skip strategies.

## Installation

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the project folder (the directory that contains `manifest.json`).
5. Open [YouTube](https://www.youtube.com) and play a video. The extension runs automatically — there is no popup or settings screen.

To update after pulling changes, go to `chrome://extensions` and click the refresh icon on the extension card.

## How it works

The extension is **content-script only** — no background service worker. A script injected on every `youtube.com` page watches the video player and reacts when an ad starts.

### Detection

Two redundant signals are used because YouTube changes its DOM frequently:

1. **CSS class** — the player element gets the `ad-showing` class during ads.
2. **Player API** — `#movie_player.getAdState()` returns `1` when an ad is active.

A `MutationObserver` on the player container reacts to DOM changes immediately, with a 250 ms polling loop as a fallback. On YouTube SPA navigation (`yt-navigate-finish`), the observer is reinitialized so skipping keeps working when you move between videos without a full page reload.

### Skip strategies

When an ad is detected, the extension tries these actions in order:

| Priority | Action | When |
| --- | --- | --- |
| 1 | Click the skip button (`.ytp-skip-ad-button` or `.ytp-ad-skip-button-modern`) | Button is visible |
| 2 | Set `video.playbackRate = 16` | Skip button not available (e.g. mandatory 5 s wait) |
| 3 | Set `video.currentTime = duration - 0.1` | Video duration is finite and greater than 0 |

When the ad ends, playback rate is restored to `1` on the main video.

CSS selectors and timing constants live in [`src/constants.js`](src/constants.js) for easy updates when YouTube changes its markup.

## Limitations

- **Unstable DOM** — YouTube updates player markup and class names over time. If skipping stops working, check whether the selectors in `src/constants.js` still match the live page.
- **In-player ads only** — Pre-roll and mid-roll ads inside the video player are handled. Sidebar banners, overlay ads, and sponsored items in the feed are out of scope.
- **YouTube Premium** — If your account has no ads, detection never triggers and the script does nothing (expected behavior).
- **Non-deterministic testing** — Whether a given video shows an ad depends on account, region, and targeting. Manual verification with a non-Premium account is the most reliable check.

## Terms of use

Automating ad skipping may conflict with [YouTube's Terms of Service](https://www.youtube.com/t/terms). This project is for personal and educational use. Use at your own discretion.

## Project structure

```
youtube-ad-skipper/
├── manifest.json       # Extension manifest (Manifest V3)
├── src/
│   ├── constants.js    # Selectors and configuration
│   └── content.js      # Detection and skip logic
└── icons/              # Extension icons (16, 48, 128 px)
```

No build step is required — load the folder directly as an unpacked extension.
