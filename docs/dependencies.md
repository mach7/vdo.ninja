# Dependency Audit

## In-tree dependencies
- `thirdparty/adapter.js` normalizes WebRTC vendor differences, and `thirdparty/CodecsHandler.js` provides codec preference helpers that `lib.js` uses before emitting offers (see the codec-manipulation blocks in `lib.js` around lines 50400‑50540).
- The `core/` directory (events, legacy bridges, recording, audio meters, uploads) acts as a shared utility layer exported via `core/index.js`. Those modules are referenced by both the UI helpers and any feature-specific scripts that rely on event buses or recorder integration.
- `webrtc.js` is the inline WebRTC runtime (minified/obfuscated) that defines `WebRTC.Media` and powers `session.connect()`, `session.joinRoom()`, and the underlying peer connection helpers.

## Optional/external services
- A handshake server is optional but documented via `install.md` (calls out https://github.com/steveseguin/websocket_server). This service provides the WebSocket/HSTS handshake endpoints and can be swapped out via query parameters (e.g., `session.customWSS`).
- TURN/STUN relays are documented in `turnserver.md`. FLW deployments should choose whether to host their own coturn relay or continue relying on the community servers referenced in the instructions.

## Bundled assets
- UI assets under `media/`, `filters/`, and `notifications/` are part of the dependency graph because the CSS/HTML references them directly—if FLW swaps in new imagery this is where those files live.
- `auth-client.js` and `auth-styles.css` constitute the optional authentication flow if `window.vdoAuth` is present; the code toggles menus based on whether `session.authMode` or `auth` query parameters are set.

### Key Files Referenced
- `thirdparty/adapter.js`
- `thirdparty/CodecsHandler.js`
- `core/index.js`
- `webrtc.js`
- `install.md`
- `turnserver.md`

### Open Questions
- Are there additional third-party SDKs that FLW wants to inject (e.g., analytics, chat bots) that we should document before the fork?

### Next Steps
- Pair this dependency callout with `docs/licensing.md` so the legal/compliance team can evaluate whether any new additions require notices when the FLW fork ships.


