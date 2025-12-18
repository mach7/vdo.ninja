# VDO Adapter Notes

This document captures the VDO engine entry points we expect to reach for the FLW adapter and what remains unknown.

## Known surfaces
- `core/index.js` appears to expose the core engine bootstrapping logic (session connect, media handling).
- `core/events/` publishes lifecycle events (`JoinEvent`, `LeaveEvent`, etc.) we can hook for UI updates.
- `main.js` wires together the VDO UI; the adapter can reuse its runtime/transport stack without depending on the DOM.
- Host operations (kick/mute/lock) are already represented under `core/events/` and `core/audio/`; we can route through `setHostControl`.

## Unknowns
- Which object currently emits raw `publish(kind)` requests—does it live inside `core/index.js` or an auxiliary helper?
- How are tokens negotiated for `joinSession`? The sandbox needs to stub a credential flow.
- What are the exact callback signatures for `requestScreenShare` when FLW grants permission? (Look for references in `main.js`.)
- Where does `endSession()` tear down transports—does it live in `core/index.js` or `core/legacy` paths?

Keeping notes here should help future engineers plan a proper FLW adapter implementation.
