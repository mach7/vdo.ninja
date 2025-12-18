# Fork Roadmap

## Phase 0: Documentation intake (done)
- Produce this `/docs` set to capture the repo map, architecture, WebRTC + signaling flows, configuration surfaces, UI modes, and security/privacy posture. The FLW PM can now see the baseline behavior without touching the code.

## Phase 1: Branding & configuration
1. Replace logos/text in `media/`, update `<title>`/meta tags, and adjust `main.css`/`index.html` to reflect the FLW identity.
2. Harden configuration defaults in `main.js` (force `session.cleanOutput`, define the default `session.wss` endpoint, and pre-select director-only toggles as needed).
3. Update `soloLinkGenerator()` in `lib.js` if FLW wants to generate `&wss` links behind a CMS; also add any new query parameters for FLW-specific toggles before shipping.

## Phase 2: FLW platform integrations
1. Wire the FLW CMS or messenger into the `session.sendMessage()` paths so layout updates, chat, or overlay commands can be triggered from the new backend (see the `lib.js` sections around lines 9885‑10735).
2. Ensure the FLW video abstraction (see `docs/flw-video-abstraction/*`) sits atop `lib.js` so the messaging layer can switch video engines later.
3. Document any new handshake or TURN endpoints in `docs/deployment/hosting.md` and `docs/configuration.md` to keep operators in the loop.

## Phase 3: Security, testing, and launch
1. Lock down TLS/TURN deployment (per `install.md` and `turnserver.md`) and confirm the PM is satisfied with the threat model and privacy posture.
2. Run manual tests (recording, queue, WHIP/WHEP) and log results in `docs/testing-and-debugging.md`.
3. Publish the new docs to the FLW repo root and update `docs/README.md` to link the sections so the platform team can onboard quickly.

### Key Files Referenced
- `docs/README.md`
- `docs/configuration.md`
- `docs/deployment/hosting.md`
- `docs/flw-video-abstraction/*`
- `lib.js`

### Open Questions
- What target release date and QA checkpoints does FLW expect for the initial white-label launch?

### Next Steps
- Tie this roadmap to the PM handoff summary so the FLW leadership team can assign owners to each phase.


