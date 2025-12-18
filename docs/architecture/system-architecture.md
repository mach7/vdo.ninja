# System Architecture

## Presentation layer
- The SPA is rendered from `index.html`, which defines the director dashboard controls (room creation, password inputs, audio/video toggles, chat panel, OBS shortcuts) and conditionally shows menus based on query parameters before calling `main()`. Its bundling of `main.js`, `lib.js`, and `webrtc.js` at the bottom of the page keeps those scripts synchronous with the DOM they manage.
- `main.js` handles translation, authentication gating, UI modes such as preview/director toggles, and keyboard shortcuts. It wires event listeners that eventually call helper functions inside `lib.js`, so the presentation layer can defer most of the heavy logic to the session helper layer.

## Session/control layer
- `lib.js` manages the user session state (`session`, `session.rpcs`, `session.pcs`, etc.), director queues, and helper flows (publish/join, layout work, chat, and file sharing). This script also orchestrates visual updates, slot colors, modal handling, and integration with the `WebRTC.Media` object that it assumes is available. Functions such as `publishWebcam()` (lines 20557‑20700) and `joinDataMode()` (lines 20539‑20555) illustrate how director actions translate into session commands.
- The `core/` directory exports shared modules from `core/index.js`: event buses (`core/events/event-bus.js`, `core/events/level-bus.js`), the legacy session bridge, and helpers for recording and uploads. These modules supply the underlying data-flow primitives that `lib.js` and potentially other consumers use for delivering audio meters, storing recordings, and wiring upload endpoints.

## WebRTC layer
- The real-time peer handling lives inside `webrtc.js`, which constructs the `WebRTC.Media` object that `lib.js` consumes. Even though that file is minimized, the top of `lib.js` proves the dependency by falling back to `WebRTC.Media` when `session` is undefined, ensuring the control layer never runs without the WebRTC runtime.
- All direct peer connection manipulations (SDP, peer negotiation, candidate exchange) happen inside `webrtc.js` or whichever runtime is bundled there; `lib.js` communicates through the `session` API (connect/watch/publish) and focuses on orchestration rather than low-level WebRTC.

## Third-party and assets
- `thirdparty/adapter.js`, `thirdparty/CodecsHandler.js`, and the dynamically loaded `StreamSaver` polyfills (inserted near the bottom of `main.js`) provide cross-browser shim layers and codec tweaking utilities used by both the control and WebRTC layers.
- Asset directories such as `media/`, `filters/`, and `notifications/` supply icons, backgrounds, filters, and audio cues that the UI references instead of embedding them inline.

### Key Files Referenced
- `index.html`
- `main.js`
- `lib.js`
- `core/index.js`
- `core/events/event-bus.js`
- `webrtc.js`
- `thirdparty/adapter.js`
- `thirdparty/CodecsHandler.js`
- `media/`
- `filters/`

### Open Questions
- Are there additional architectural diagrams or server-side components (handshake server, TURN servers) that should live in this section, or should they move to deployment docs?

### Next Steps
- Use this component map to anchor the data-flow narrative in `docs/architecture/data-flow.md` and to guide the configuration documentation.


