# Configuration Surfaces

## Static defaults
- `index.html` sets the baseline for TURN/STUN/handshake endpoints with commented options near the bottom (`session.wss`, `session.security`, `session.apiserver`, `session.whipServerURL`). Those comments show how to point the client to `wss://wss.vdo.ninja`, another websocket-server instance, or a custom WHIP websocket (lines 3067‑3113).
- The same file also includes translation markers and CSS hooks that the `main.js` translator uses, so swapping in a new `data-translation` payload or CSS file (via the `<link>` tags near the top) is the first customization for a white-label fork.

## Query parameters & runtime flags
- `main.js` consumes the query string before the UI renders. Parameters supported there include `cleanoutput` (hides control chrome), `mutestatus`/`unmutestatus`, `cleanviewer`, `hidehome`, `director`, `feedbackbutton`, `controls`/`videocontrols`, `forcecontrols`, `nocontrols`, `sticky`, `previewmode`, `safemode`, `auth`, and language overrides (`ln`/`language`). The code sets flags such as `session.cleanOutput`, `session.director`, `session.showControls`, `session.sticky`, and `session.safemode` to reflect those parameters.
- `main.js` also toggles features depending on the hosting domain (e.g., `rtc.ninja` hides logos and menu items) and ensures OBS/Electron clients get appropriate drag regions, so these semantics should be reviewed when re-skinning front-end layouts.

## Director session controls
- `lib.js` maintains the `session` object, which exposes configurable properties such as `session.roomid`, `session.streamID`, `session.password`, `session.queueType`, and `session.codecGroupFlag`. The `createRoom()` helper (lines 23354‑23421) persists director choices, toggles the “broadcast only director area”, and funnels the sanitized room name to `joinRoom()`.
- `publishWebcam()` (lines 20557‑20730) uses `session.mobile`, `session.permaid`, and password fields to remember stream IDs, join rooms, and display the proper control buttons. Adjusting these helper functions is a natural place to surface FLW-specific defaults (e.g., a custom room name generator or forced control visibility).

## Advanced network surface
- Query parameters can also override handshake/relay URLs via `session.customWSS`, `session.whipOutput`, and `session.apiserver`. The `soloLinkGenerator()` function (lines 20897‑20944) demonstrates how `&wss`/`&wss2` parameters are appended to invite links, allowing FLW to switch between handshake servers without editing code.
- The WHIP/WHEP helpers in `lib.js` (e.g., `whipOut()` at lines 50599‑50761 and `processWHEPout()` at lines 53026‑53152) rely on these fields to decide where to POST SDP offers and where to listen for incoming streams.

### Key Files Referenced
- `index.html`
- `main.js`
- `lib.js`

### Open Questions
- Which configuration knobs should be surfaced to the FLW CMS dashboard versus hard-coded defaults inside `lib.js`/`main.js`?

### Next Steps
- Feed these configuration details into `docs/ui/pages-and-modes.md` so the PM understands how each UI control can override the underlying session flags.


