# High-Level Overview

## Entrypoint and UI load order
- The `index.html` landing page hosts the director/guest experience, includes `main.css`, and loads the runtime scripts at the bottom of the `<body>` (`main.js`, `lib.js`, and `webrtc.js`) so that the DOM and localization markers are ready before the code executes.

## Runtime bootstrap
- `main.js` defines the `main()` function triggered on the page `onload`. The snippet at the top of `main.js` is responsible for parsing query parameters (language overrides, director flags, room names, control toggles), managing the visibility of headers/menus, and ensuring authentication flows finish before showing the UI. It also wires global shortcuts (keyboard events) and lifecycle handlers (beforeunload/unload) needed by the live director experience.
- `lib.js` picks up once `main.js` has prepared the DOM. The script exposes helpers such as `joinDataMode()` (which calls `session.connect()` and either loads a room or plays a saved permalink) and `publishWebcam()` (which sanitizes password inputs, remembers persistent stream IDs, and decides whether to join a director room or remain in a “fake room” view before showing broadcaster controls). These helper flows also enable chat or OBS controls to appear once a publish action succeeds.

## WebRTC session object
- The WebRTC engine lives in `webrtc.js`. `lib.js` expects this file to populate the `WebRTC.Media` object before it runs; the guard near the top of `lib.js` (`if (typeof session === "undefined") { var session = WebRTC.Media; ... }`) proves that `session` is sourced from that module. From that point on, `lib.js` reacts to UI events by calling `session.connect()`, `session.watchStream()`, or `session.publishFile()`, and the WebRTC stack handles peer connections, SDP exchange, and ICE candidate handling.

### Key Files Referenced
- `index.html`
- `main.js`
- `lib.js`
- `webrtc.js`

### Open Questions
- Should overview coverage include alternate entrypoints (`room.html`, `director-messenger.html`, `cloud.html`) or keep the focus on the canonical `index.html` experience?

### Next Steps
- Use this overview to orient `docs/architecture/system-architecture.md` and the data-flow narrative so the runtime flow has a place in the broader system description.


