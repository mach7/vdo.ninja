# Testing & Debugging

## Existing test surfaces
- There are no automated unit tests in this repo, so the best way to verify behavior is through manual interaction. The `examples/testsdp.html` page provides a playground for exercising SDP negotiation, and the various `examples/` pages (iframe API, chat overlay, remote API) can be used to smoke-test specific features at a glance.

## Manual verification steps
1. Start the static server and navigate to `index.html`; use the “Create a Room” card to generate a room and open a second tab to join it via the provided invite link.
2. Toggle query parameters such as `?cleanoutput=true`, `?director=true`, `?view=<streamID>` and confirm the UI adjusts (this ensures the `main.js` initialization blocks are responding).
3. Open the developer console to watch `session` logs (`lib.js` contains numerous `log()` statements) and inspect `session.rpcs` or `session.pcs` objects to confirm peer connections are registered.
4. For WHIP/WHEP flows, use `session.whipOutput` and `session.whipServerURL` (set via query string or `index.html` defaults) and watch `whipOut()`/`processWHEPout()` succeed without errors.

## Debugging tips
- The script includes helper logging wrappers (`log`, `warnlog`, `errorlog`) at the top of `lib.js` (the commented-out debug block shows how to attach timestamps for deeper tracing). Use `warnUser()` to surface user-facing alerts when SSE/WHIP errors occur (e.g., `whipOut` network errors post to the console and call `warnUser`).
- Inspect the chat/OBS command channels by listening to `session.sendMessage()` invocations (lines 9885‑10735) to ensure drawing/wipe commands are distributed as expected.

### Key Files Referenced
- `examples/testsdp.html`
- `examples/`
- `main.js`
- `lib.js`

### Open Questions
- Should we introduce automated end-to-end tests for critical flows (room creation, WHIP publishing) before the FLW fork ships?

### Next Steps
- Record the manual verification steps in the PM handoff and consider capturing them in a lightweight checklist for FLW QA runs.


