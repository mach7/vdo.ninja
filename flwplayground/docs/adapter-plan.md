# FLW Adapter Plan

> Docs only: no implementation exists yet. This file captures the conceptual contract for the FLW video engine adapter.

## Adapter Lifecycle
- `init(config)` – bootstrap FLW runtime with configuration (credentials, theme hints, logging hooks).
- `createSession(session_id, caps)` – reserve a room with capabilities (media, participants, custom roles).
- `joinSession(session_id, token, caps)` – authenticate and join an existing Session with the requested capabilities.
- `publish(kind)` – request publishing of a media kind (`camera`, `mic`, `screen`).
- `requestScreenShare()` – escalate to host flow for dedicated screen share handling.
- `setHostControl(action, target)` – send host directives (mute, kick, lock, allow screen-share, etc.).
- `endSession()` – tear down FLW session and clean up listeners.

## Notes
- The adapter keeps UI concerns separate while exposing clear hooks for routing FLW host controls.
- Each method should emit structured events back to the playground shell for telemetry and debugging.
