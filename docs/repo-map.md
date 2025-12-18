# Repository Map

## Entrypoint bundle
- `index.html` is the single-page experience served to guests and directors. The file wires up the DOM, loads `main.css`, injects localization strings, and drops in the three runtime scripts (`main.js`, `lib.js`, and `webrtc.js`) before the closing `<body>` tag so that SPA logic can control the UI once the page finishes loading.
- `main.js` boots the client by reading onboarding query parameters, showing or hiding director controls, managing translations, and binding UI buttons to the session helpers defined further down the stack.

## SPA support layer
- `lib.js` is the workhorse for session management. It defines helper utilities (DOM helpers, slot coloring, clipboard helpers) plus higher-level actions such as `publishWebcam`, `joinRoom`, `session.watchStream`, and the queue management code that sits behind the director control panel captured in `main.js`.
- `webrtc.js` (obfuscated but required) contains the WebRTC runtime payload that exposes the `WebRTC.Media` session object consumed by `lib.js` when the page loads.

## Core modules and re-exports
- The `core/` directory (e.g., `core/index.js`, `core/events/`, `core/recording/`) centralizes reusable utilities for events, recorders, and uploads that modern consumer flows reference when `lib.js` manipulates streams or pushes stats.

## Examples, assets, and filters
- `examples/` lists standalone demos (chat, iframe API samples, OBS helpers, etc.) that illustrate how to embed VDO Ninja in other experiences.
- `filters/`, `media/`, and `notifications/` hold stylistic assets (images, CSS, filter scripts, sound effects) used by the UI templates.
- `thirdparty/` stores external dependencies such as `adapter.js`, codec helpers, and the StreamSaver polyfills referenced in `index.html`.

## Deployment & docs
- `install.md`, `turnserver.md`, and the root `README.md` explain how to host the project, stand up TURN relays, and understand the product positioning.
- `AGPLv3.md` and `LICENCE.md` describe the licensing terms that govern contributions and downstream usage.
- A handful of helper pages (e.g., `docs.html`, `rawdoc.md`, `examples/readme.md`) provide user-facing documentation without touching this `/docs` folder.

## Other notable files
- `core/`, `auth-client.js`, `webrtc.js`, `main.js`, and `lib.js` form the runtime stack; `room.html`, `director-messenger.html`, and `cloud.html` are alternate entry points for different personas; `filters/` plus `thirdparty/` deliver enrichments such as animated masks and codec tuners.

### Key Files Referenced
- `index.html`
- `main.js`
- `lib.js`
- `webrtc.js`
- `core/index.js`
- `install.md`
- `turnserver.md`
- `README.md`
- `AGPLv3.md`
- `LICENCE.md`

### Open Questions
- Should references to the existing `docs.html`/`rawdoc.md` experience be mirrored anywhere inside the new `/docs` map, or do we leave them as legacy pointers?

### Next Steps
- Pull entrypoint details into `docs/overview.md` and `docs/architecture/system-architecture.md`.


