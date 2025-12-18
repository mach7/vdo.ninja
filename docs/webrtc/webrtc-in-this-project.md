# WebRTC in This Project

## Runtime dependencies
- `index.html` injects `thirdparty/adapter.js` before everything else to normalize WebRTC across browsers, and it also loads `webrtc.js` at the end of the `<body>`. That `webrtc.js` bundle is responsible for exposing `WebRTC.Media`, the session API that `lib.js` consumes (see the guard near the top of `lib.js` that initializes `session = WebRTC.Media` when the session object is missing).
- `main.js` is already listening for UI events when `main()` fires, but the actual WebRTC state resides in the `webrtc.js` runtime. All of the methods (`session.connect()`, `session.joinRoom()`, `session.watchStream()`, etc.) that `lib.js` calls are implemented inside the `webrtc.js` bundle.

## WHIP/WHEP & peer-manager helpers
- `lib.js` orchestrates WebRTC flows by combining a sanitized configuration (`session.configuration`) with helper functions built on top of `RTCPeerConnection`. `whipOut()` (lines 50599‑50789) creates `session.whipOut = new RTCPeerConnection(config)`, applies codec overrides via `CodecsHandler`, and publishes the local camera to an external WHIP endpoint using an XMLHttpRequest POST.
- For inbound WHEP sources, `processWHEPout()` (lines 53026‑53152) sets up a peer connection per remote publisher: it pulls TURN/STUN preferences from `session.configuration` (via `chooseBestTURN()`), creates `session.pcs[UUID] = new RTCPeerConnection(config)`, assigns `onicecandidate`, applies SDP filters (`filterSDPLAN`/`filterStunOnly`), attaches local audio/video tracks, and generates the answer SDP that can be sent back to the publisher.
- The `session.pcs` lookup table holds every peer connection that the client manages (watchers, WHEP streams, WHIP outputs). Each entry tracks the ICE state, senders/receivers, and any `session.whipout` flags used for keyframe scheduling or bitrate adjustments.

## Data channels and messaging
- Beyond media, the project relies on `session.sendMessage()` for control-plane events. `lib.js` calls this helper when broadcasting drawing commands, mini-info payloads, or OBS commands (see the sections around lines 9885‑10735 and 12463‑15962). Those control messages ride over the same WebRTC session object, letting scenes, chat, and overlay features stay synchronized with peer connections created in the previous sections.

### Key Files Referenced
- `index.html`
- `main.js`
- `lib.js`
- `thirdparty/adapter.js`
- `thirdparty/CodecsHandler.js`
- `webrtc.js`

### Open Questions
- Should a future version of this doc attempt to reverse-engineer the obfuscated `webrtc.js` bundle, or is describing the `lib.js` helpers sufficient for downstream integrators?

### Next Steps
- Use this WebRTC context to explain the signaling control messages in `docs/webrtc/signaling.md`, focusing on how the session API (joinRoom/watchStream/sendMessage) maps to the peer and queue flows described here.


