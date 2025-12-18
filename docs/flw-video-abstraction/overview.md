# FLW Video Abstraction Overview

## Goal
- FLW needs a vendor-agnostic layer that sits between the FLW CMS/messenger UI and a live-video engine (currently VDO Ninja). `lib.js` is already acting as the bridge between the UI (`main.js`/`index.html`) and the `session` object provided by `webrtc.js`, so the FLW abstraction should wrap `lib.js` (or a small subset of it) without modifying the underlying engine for each vendor we might swap in later.

## Responsibilities
- The abstraction should handle room creation/join logic (`createRoom()`, `joinRoom()`), onboarding configuration (`session.cleanOutput`, query parameters), control-plane messaging (`session.sendMessage()`), and any hooks for layout updates or queue management that FLW exposes via its CMS.
- It should also surface the WebSocket/TURN configuration values that `library` uses (typically via `index.html`’s `session` payload or query parameters) so FLW can point to their own handshake endpoints, not just the VDO Ninja defaults.

## Architecture placement
- Place the abstraction above `lib.js` and `webrtc.js` so the FLW UI or backend can target a consistent set of methods (see `docs/flw-video-abstraction/interface-contracts.md`). The abstraction should translate each call (publish, watch, send message, toggle queue) into the corresponding `lib.js` helper, allowing the FLW team to keep their own higher-level workflow language without depending on VDO Ninja’s minified runtime.

### Key Files Referenced
- `lib.js`
- `main.js`
- `webrtc.js`

### Open Questions
- Which specific FLW CMS/messenger features need to call into this abstraction (e.g., layout updates, recording controls, queue operations)?

### Next Steps
- Define the contract methods in `docs/flw-video-abstraction/interface-contracts.md` so implementation work has clear expectations.


