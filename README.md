# LiveNotifications

> **Warning**
>
> This plugin is experimental and was coded using [Claude Code](https://claude.ai).
> It is provided without any warranty regarding quality, stability, or performance.
> This is a community project and is not officially supported by Matomo.

## Description

Adds an audible chime to Matomo's **Visitors in real time** widget whenever a new visitor arrives.

The notification sound is generated entirely by the browser's built-in Web Audio API — no audio files are bundled, streamed, or loaded from any external source.

## Features

- **🔊 Automatic chime** when a new visitor row appears in the Live widget
- **🔇 Mute/unmute toggle** button injected directly into the widget header — one click to silence
- **Opt-in by default** — sounds are disabled until the user (or admin) enables them, so existing users are never surprised
- **Persistent preference** — the user's mute choice is saved in `localStorage` and survives page reloads
- **Admin default setting** — super-users can enable sound by default for all users under *Administration → General Settings → Plugins*
- **Zero external dependencies** — no audio files, no CDN requests, no third-party libraries
- **SPA-aware** — automatically re-activates when the user navigates back to the Live page in Matomo's single-page interface

## Requirements

- Matomo 5.0 or later
- PHP 8.1 or later
- A modern browser with Web Audio API support (Chrome 35+, Firefox 25+, Safari 14.1+, Edge 79+)

## Installation

### Via Marketplace (recommended)

1. Go to **Administration → Marketplace**
2. Search for **LiveNotifications**
3. Click **Install**

### Manual installation

1. Download the latest release
2. Extract to your Matomo `plugins/` directory as `LiveNotifications/`
3. Activate: `./console plugin:activate LiveNotifications`

## Configuration

After activation, go to **Administration → General Settings** and scroll to the *LiveNotifications* section.

| Setting | Default | Description |
|---------|---------|-------------|
| Enable sound notifications by default | Off | When enabled, the chime is active for all users the first time they open the Live widget |

Individual users can always override this by clicking the 🔇/🔊 button in the widget header.

## FAQ

**Q: I don't hear anything.**
A: Browsers block audio until the user has interacted with the page. Click the 🔊 button in the widget header once — this gesture unlocks audio and plays a preview chime. Future automatic notifications will then work.

**Q: Can I change the sound?**
A: Not through the UI in this version. The chime is synthesised in `javascripts/LiveNotifications.js` using `AudioContext`; you can edit the `tone()` calls to change frequency and duration.

**Q: Does this work on the dashboard widget too?**
A: Yes — wherever `#visitsLive` is rendered (Live page or dashboard widget), the observer attaches automatically.

**Q: Is any personal data sent anywhere?**
A: No. The plugin adds only client-side JavaScript and a single boolean setting. No data is collected or transmitted.

## License

GPL v3 or later

> **Community disclaimer:** This plugin was developed by the Matomo community. It is not an official Matomo plugin and comes with no warranty. Please test in a staging environment before deploying to production.
