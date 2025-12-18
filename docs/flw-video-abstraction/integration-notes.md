# Integration Notes for FLW

## Plugging into the current client
- Treat `lib.js` as the canonical session manager. The FLW abstraction should instantiate the contract methods (e.g., `createRoom`, `watchStream`, `sendControlMessage`) by calling the underlying functions and then reporting status back to the FLW dashboard.
- `main.js` drives the UI; if FLW deploys a CMS-driven overlay, it should dispatch to `main.js`’s event handlers (muting, screen share, raise hand) or use the hooks around `session.sendMessage()` to send OBS/drawing commands.

## Custom handshake & TURN
- Use the query parameters checked in `main.js` (cleanoutput, previewmode, director, wss, whipOutput) to inject FLW-specific defaults from the CMS. For example, FLW can expose a configuration panel that writes `?wss=https://flw-handshake.example` into shared links; `lib.js`’s `soloLinkGenerator()` (lines 20897‑20944) demonstrates how the parameters propagate to invite URLs.
- Maintain the TLS/TURN guidance in `install.md` and `turnserver.md` when deploying new handshake or relay services, ensuring they mirror the security posture described in `docs/security/threat-model.md`.

## Swapping out the engine
- If FLW ever replaces `webrtc.js` with another media engine, keep the `session` contract the same. Provide the new engine with methods such as `connect()`, `joinRoom()`, `watchStream()`, `sendMessage()`, and `connectPeer()` so that `lib.js` and the FLW abstraction can call them without additional modifications.
- Document any deviations in this `integration-notes` doc so downstream engineers understand which vendor-specific features are in play.

### Key Files Referenced
- `lib.js`
- `main.js`
- `install.md`
- `turnserver.md`

### Open Questions
- Is FLW planning to eventually decouple from `webrtc.js` entirely, or will it continue to re-use the same WebRTC runtime with branding tweaks?

### Next Steps
- Pair these notes with the roadmap to determine whether to tackle a new engine integration before or after the initial white-label release.


