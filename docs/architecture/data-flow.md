# Data Flow Narrative

## 1. Bootstrap from `index.html` and `main.js`
- The page loads `main.js` after the DOM is ready. `main.js` immediately reads URL parameters (e.g., `cleanoutput`, `room`, `director`, `previewmode`, `controls`) and adjusts `session` flags (`session.cleanOutput`, `session.director`, `session.showControls`, `session.sticky`) before calling any heavyweight helpers. This ensures the director UI, translation strings, and keyboard listeners mirror the intent encoded in the query string before any session interactions begin.

## 2. Director/guest initiation
- When a director clicks “Create a Room,” `createRoom()` from `lib.js` sanitizes the entered name, persists director settings, updates the browser URL (lines 23354‑23401), and routes to `joinRoom()` for the actual handshake. `joinRoom()` further sanitizes, enforces auth tokens if necessary, and calls `session.joinRoom(roomname)` (lines 23183‑23344).
- The callback from `session.joinRoom()` returns the current roster. The code then iterates the response, normalizing `streamID`s via `session.desaltStreamID`, and either calls `play(streamID)` directly or enqueues streams (`session.queueList`) based on queue mode (lines 23253‑23330). Directors see the invited link after join (`session.roomhost` block).

## 3. Publishing and view toggles
- `publishWebcam()` (lines 20557‑20728) is the finite state machine behind the “start publishing” button: it sanitizes password inputs, optionally remembers the stream ID for mobile guests, switches UI elements (`head3`, `head3a`, control buttons), and decides if the client should `joinRoom(session.roomid)` (director in a real room) or remain in “clean output” preview mode while `session.postPublish()` completes.
- `joinDataMode()` (lines 20539‑20555) is the lightweight path for watchers who do not want to publish. It just calls `session.connect()` and either renders a watched room or plays the saved permalink layout without showing a director control panel.

## 4. WebRTC session interactions
- `lib.js` expects the `WebRTC.Media` object defined in `webrtc.js`; the fallback near the top (`if (typeof session === "undefined") { var session = WebRTC.Media; ... }`) proves it. That `session` object exposes `session.connect()`, `session.joinRoom()`, `session.publishFile()`, `session.seedStream()`, `session.watchStream()` and other helpers that `lib.js` orchestrates.
- Once `joinRoom()` receives the member list, it calls `play(streamID)`/`session.watchStream(sid)` and updates `session.rpcs` with decoded incoming streams (lines 23334‑23343). Each `play()` call relies on the WebRTC layer to negotiate a peer-to-peer link and report stats and stream IDs back to the director view.

## 5. Real-time extras and messaging
- Data-channel messages travel through `session.sendMessage()`, which is sprinkled across `lib.js` (e.g., drawing actions on lines 10606‑10735, mini-info updates on lines 12463‑15962). `sendMessage()` is invoked when the UI needs to push commands (drawing updates, OBS commands, buffer delays) across connected peers, making the session object the central conduit for both media and control data.

## 6. Shutdown and cleanup
- `main.js` binds a `beforeunload`/`unload` listener that closes `session.ws`, stops recordings, and calls `session.hangup()` to ensure the WebRTC layer dismantles all `session.rpcs` before the page closes (lines 9040‑9063).

### Key Files Referenced
- `index.html`
- `main.js`
- `lib.js`
- `webrtc.js`

### Open Questions
- Should the data-flow doc explain how external APIs (chat, file share, OBS commands) map onto `session.sendMessage()`, or is that better left to the WebRTC/signaling documentation?

### Next Steps
- Feed this data-flow narrative into the `docs/webrtc/` and configuration docs so the signaling paths align with the runtime story.


