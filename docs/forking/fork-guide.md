# Forking Guide

## Step 1: preserve the static client
- The client is primarily delivered via `index.html`, `main.css`, `main.js`, `lib.js`, and `webrtc.js`. For FLW branding, swap the logos in `media/` (e.g., `media/vdoNinja_logo_full.png`) and adjust the header text/CSS in `main.css` while keeping the script hooks that launch `main()`.
- Update references in `index.html` that mention VDO Ninja or OBS (the `<title>`, `<meta>` tags, and footer links) but leave the script loading order (“adapter → main → lib → webrtc”) intact to avoid runtime regressions.

## Step 2: customize session defaults
- `main.js` parses query parameters and shows/hides UI elements based on `session` flags (director mode, preview mode, clean output). Decide which defaults FLW wants (e.g., forcing `session.cleanOutput` or hiding the “Create Room” card) and adjust the initialization block near the top of `main.js`.
- If FLW needs to default to its own handshake server, edit the commented lines near `index.html` lines 3067‑3113 or add a CMS-driven configuration option that sets `session.wss`, `session.customWSS`, and `session.whipServerURL` before `main()` runs.

## Step 3: adapt configuration helpers
- `lib.js` contains helpers such as `publishWebcam()`, `joinRoom()`, and `session.watchStream()` that manage stream lifecycle. You can adjust `createRoom()` (lines 23354‑23399) to insert FLW-specific metadata, or add CMS hooks that call into `session.sendMessage()` (lines 9885‑10735) to broadcast layout changes.
- Any new FLW features should also be documented via the docs you are creating (e.g., `docs/flw-video-abstraction/*`), so downstream engineers know where the abstraction boundaries exist.

## Step 4: respect licensing & documentation
- Both `AGPLv3.md` and `LICENCE.md` govern redistribution. Keep those files up to date and include licensing acknowledgements inside the FLW fork’s README (the root `README.md` links to VDO Ninja’s policy). When making branding changes, document them in the `/docs` folder so the PM can track deviations from stock VDO Ninja behavior.

### Key Files Referenced
- `index.html`
- `main.js`
- `lib.js`
- `media/`
- `AGPLv3.md`
- `LICENCE.md`

### Open Questions
- Which parts of the UI should FLW hide or rebrand before shipping (e.g., the chat footer links or the translation buttons)?

### Next Steps
- Use the fork roadmap (next doc) to sequence these tasks into release stages so the PM understands the timeline and dependencies.


