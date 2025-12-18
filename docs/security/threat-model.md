# Threat Model

## Attack surfaces
- Room names and passwords originate from user input, so `main.js` references `sanitizeRoomName()`/`sanitizePassword()` helpers in `lib.js` (lines 2978‑3021). That sanitization clobbers non-alphanumeric characters and truncated lengths before directors use those values to create rooms or share invite links.
- Users reach the WebRTC session through `session.joinRoom()` and the handshake server referenced by `soloLinkGenerator()` (lines 20897‑20944). Because query parameters like `&wss` can change handshake endpoints, downstream deployments must verify they only point at trusted websocket servers or CMS-controlled URLs.
- WebRTC data channels (`session.sendMessage()` sections around 9885‑10735) and WHIP/WHEP flows (`whipOut()` and `processWHEPout()`) rely on encrypted SDP exchanges; the threat surface is limited to the secure origins that the `install.md` docs insist on (lines 40‑84).

## Network controls
- TLS is mandatory: `install.md` stresses HTTPS (lines 40‑84) and even suggests adding self-signed certs to the trust store for offline deployments (lines 115‑144). TURN servers share credentials via `turnserver.md`, which also recommends firewall rules and cert handling (lines 1‑118).
- Query parameters such as `session.customWSS` allow customizing handshake endpoints, so FLW must control which handshake URLs are distributed externally (the `soloLinkGenerator()` block shows how these parameters propagate into links).

## Operational mitigations
- `session.cleanOutput` hides director controls for embedded viewers, lowering the chance that privileged buttons leak in shared views (`main.js` lines 191‑220). The UI also caches settings via `localStorage`/`sessionStorage` when `session.sticky` is set, but sensitive values like passwords remain sanitized before storage.
- The code outside this repo (e.g., handshake server or TURN server deployments) is referenced in `install.md` (`websocket_server` at lines 148‑153) and `turnserver.md` (lines 1‑118), so FLW should audit those external services as part of any fork.

### Key Files Referenced
- `main.js`
- `lib.js`
- `install.md`
- `turnserver.md`
- `README.md`

### Open Questions
- Should the FLW fork introduce a hardened default handshake endpoint and document its security posture in this doc?

### Next Steps
- Use this threat model to feed into the FLW fork roadmap so the PM can plan security reviews before launching the white-label experience.


