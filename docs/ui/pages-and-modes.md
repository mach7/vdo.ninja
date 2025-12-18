# UI Pages & Modes

## Primary experience (`index.html`)
- The main entry page is built inside `index.html`: a header with the brand/logo, room join input, and helper controls; a hidden chat module; the `#controlButtons` container holding director actions (mute/unmute, screenshare/OBS, recording, pacing buttons); and the `#mainmenu` grid (container cards for creating rooms, joining links, a translator, and quick-help). Those sections show/hide using `main.js` depending on the URL state.
- The `mainmenu` includes containers such as `container-1` for “Create a Room”, `container-2/3/4` for quick links, and a floating `miniTaskBar` with the help/log buttons highlighted by `main.js` once translation and auth initialization finish.
- Chat inhabits `#chatModule`, with header actions for pop-out and close plus the `#chatBody` scrollable area. `main.js` toggles the chat button (`#chatbutton`) near the bottom once a user joins, matching the `session` understanding of when to show chat options.

## Modes & toggles
- Query parameters toggle modes: `director`/`dir` unlocks the director UI, `previewmode` switches between the director control room and scene preview, and `cleanoutput`/`cleanviewer` hides UI chrome for organic embed experiences. `main.js` also respects `mutestatus`, `controls`, `forcecontrols`, `sticky`, and `safemode` to tweak the experience (see the early block around lines 193‑364 in `main.js`).
- `session.cleanOutput` prevents buttons from appearing (muting, chat, share); `session.cleanViewer` disables the audio meter; and `session.switchMode` (toggled by `#togglePreviewMode`) drives the preview/director swap.
- Mobile and OBS clients are detected (`session.mobile`, `window.obsstudio`) so the UI can remove the “Save Room” button or disable drag/resize features, ensuring appropriate controls for constrained form factors (lines 220‑226 of `main.js`).

## Supporting pages
- Additional HTML surfaces exist for different personas: `room.html` (viewer-only rooms), `director-messenger.html` (mobile messaging), `cloud.html` (cloud recording), `mixer.html`, and dozens of demos under `examples/` (chat, iframe API, screen-share, OBS helper). These files often reuse the `lib.js` helpers but present different UI panels tuned for the specific use case.
- `filters/` and `examples/` host auxiliary HTML/CSS for interactive overlays and filters, while `thirdparty/` includes scripts (`adapter.js`, codec handlers) that the UI references through `<script>` tags.

### Key Files Referenced
- `index.html`
- `main.js`
- `room.html`
- `director-messenger.html`
- `examples`

### Open Questions
- Which of the alternate entry pages (room, cloud, messenger) should FLW keep, and which should be folded into a single CMS-driven experience?

### Next Steps
- Use this UI/modes map to guide the FLW configuration doc and ensure the PM sees how queries map to the director/guest behavior described earlier.


