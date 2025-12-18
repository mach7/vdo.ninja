# Interface Contracts

## Mandatory methods
1. `init(config)` – accepts the configuration blob that would normally be encoded via query parameters and sets `session.cleanOutput`, `session.director`, `session.wss`, `session.whipOutput`, and other `session` flags before `main()` loads (mirror the initialization logic in `main.js`).
2. `createRoom(roomName, options)` – wraps `lib.js`’s `createRoom()` so FLW can programmatically generate a room, apply passwords, toggle broadcast flags, and jump into the `joinRoom()` flow while keeping the UI in sync with `session.roomid`.
3. `joinRoom(roomName)` – calls `lib.js`’s `joinRoom()` helper (lines 23183‑23344), captures the returned member list, and exposes the data to FLW for queuing/playlist displays.
4. `publishStream(streamOptions)` – triggers `publishWebcam()` (lines 20557‑20730) with the desired audio/video devices, handles `session.streamID`, and opens the director controls.
5. `watchStream(streamID, callbacks)` – uses `play(streamID)`/`session.watchStream()` so the abstraction controls when a viewer attaches to a remote stream; the helper should also expose lifecycle callbacks for `session.rpcs` updates (the structures populated in `joinRoom()` provide the necessary metadata).
6. `sendControlMessage(message)` – forwards `message` to `session.sendMessage()` (lines 9885‑10735) so FLW can implement layouts, drawing updates, or mini-info flows without interacting with the media layer directly.
7. `setLayout(layoutConfig)` – wraps `issueLayout()` or `issueLayoutOBS()` inside `lib.js` to instruct the director view how to tile feeding scenes, matching the layout API in `main.js`.
8. `getLayoutState()` – reads from `session.layout` or `session.rpcs` to report which streams are currently visible/muted, letting FLW show status panels.

## Optional hooks
- `hookQueueUpdates(callback)` – FLW can subscribe to queue changes by listening to `session.queueList` updates that `joinRoom()` populates, enabling queue notifications in the CMS.
- `grabStats()` – read from `session.rpcs[uuid].stats` (populated in `lib.js`) to surface per-stream metrics like volume, bitrate, or effect status.

### Key Files Referenced
- `lib.js`
- `main.js`
- `webrtc.js`

### Open Questions
- Does FLW need to expose `session.encodeRemote()`/`session.sendRequest()` as part of the public contract, or can the abstraction handle those internally?

### Next Steps
- Document how each of these contract methods maps onto the FLW platform in `docs/flw-video-abstraction/integration-notes.md`.


