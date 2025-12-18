# Signaling & Control Plane

## Room/handshake orchestration
- Directors trigger `createRoom()` from `lib.js` (lines 23354‑23401), which sanitizes room names, saves director settings, updates the URL, and defers the actual allocation to `joinRoom()`.
- `joinRoom()` (lines 23183‑23344) calls the WebRTC session API (`session.joinRoom(roomname)`), receives the current member list, and either plays each incoming `streamID` or enqueues them depending on queue mode. This method also honors auth mode tokens, emits invite URLs, and starts the `session.watchStream()` logic for any preselected inclusions.
- Client URLs include the configured handshake endpoints: `soloLinkGenerator()` (lines 20897‑20944) appends `&wss`/`&wss2` parameters when `session.wssSetViaUrl` is true so that viewers and directors can point at the desired websocket handshake server.

## WHIP/WHEP signaling
- Publishing to an external WHIP server uses the `whipOut()` function (lines 50599‑50761). It ensures `session.configuration` includes a TURN/STUN stack (`chooseBestTURN()`), constructs `session.whipOut = new RTCPeerConnection(...)`, creates the SDP, and POSTs it to `session.whipOutput` with the appropriate MIME type. `xhttp` errors are surfaced via `warnUser` when mixed HTTP/HTTPS or other restrictions block the request.
- Incoming WHIP/WHEP traffic is processed by `processWHEPout()` (lines 53026‑53152). For each remote publisher, the code instantiates `session.pcs[UUID] = new RTCPeerConnection(config)`, sets/remotes descriptions, attaches local audio/video tracks, gathers the answer SDP, and returns it to the caller. The function also handles ICE bundling and optionally filters SDPs for local-only or STUN-only scenarios.
- Once the SDP is ready, `session.connectPeer(msg)` and `session.setupIncoming(msg)` (lines 51796‑51843) wire the peer connection. Promises `session.whipCallback`/`whipCallback2` await ICE completion before returning the final answer, ensuring the signaling path completes before sending the response back to the WHIP client.

## Data channels and control messages
- `session.sendMessage()` is the preferred conduit for control-plane actions. When guests draw on the whiteboard, update OBS state, or circulate layout commands, `lib.js` calls `session.sendMessage()` (see the sections around lines 9885‑10735 and 12463‑15962) to instruct the remote peer through the same WebRTC session that carries the media.
- The `session.ws` and `session.apiSocket` handles (implicitly defined inside `webrtc.js` but referenced in `lib.js` for heartbeat displays at `checkConnection()` lines 3024‑3038 and for optional API integration at lines 53158‑53209) reflect the WebSocket handshake server that brokers the initial `session.joinRoom()` invitation, often hosted at `wss://call.vdo.ninja` unless overridden via query parameters.

### Key Files Referenced
- `lib.js`
- `webrtc.js`
- `index.html`
- `main.js`

### Open Questions
- Should we document the handshake server code (e.g., https://github.com/steveseguin/websocket_server) within this repo’s docs, or keep the focus on the client-side `lib.js`/`webrtc.js` interactions?

### Next Steps
- Link this signaling description to the broader configuration and fork docs so that FLW can understand which endpoints to customize before extending the client stack.


