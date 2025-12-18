# FLW Video Contract

## Goals for v1
- Establish a predictable FLW-first session lifecycle (init, session creation/join, publish, teardown).
- Bubble host control intents through a minimal adapter API so UIs can stay declarative.

## Contract Surface
1. **Initialization**: `init(config)` accepts credentials, branding hints, and logging hooks.
2. **Sessions**: `createSession(session_id, caps)` reserves the room; `joinSession(session_id, token, caps)` connects a participant.
3. **Publishing**: `publish(kind)` handles `camera`, `mic`, or other media kinds.
4. **Screen share**: `requestScreenShare()` mediates additional permissions.
5. **Host controls**: `setHostControl(action, target)` drives mute/kick/lock/unlock and screen-share permissions.
6. **Cleanup**: `endSession()` gracefully tears down the FLW session.

## Required Host Controls
- **Mute Participant** – mute audio remotely and reflect state back to UI.
- **Kick Participant** – remove a participant from the session.
- **Lock Room** – prevent new joins while keeping the session active.
- **Allow Screen Share** – grant or revoke screen share permissions dynamically.
- **End Call** – tear everything down for all participants.
