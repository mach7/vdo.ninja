# Docs Directory Index

## Purpose
- This `/docs` tree captures the knowledge needed to white-label VDO Ninja for FLW, including architecture, WebRTC flows, configuration surfaces, security posture, forking guidance, and the FLW-specific video abstraction.

## Sections
- `docs/repo-map.md` and `docs/overview.md` summarize the repo layout and runtime idioms.
- `docs/architecture/` (system architecture + data flow) plus `docs/webrtc/` (in-project WebRTC + signaling) outline the engine’s internals.
- `docs/configuration.md` and `docs/ui/pages-and-modes.md` explain the command-line and UI toggles available to directors and guests.
- `docs/security/` covers threat models and privacy; `docs/deployment/hosting.md`, `docs/build-and-run.md`, and `docs/dependencies.md` cover operational readiness.
- `docs/forking/` provides the white-label guide/roadmap; `docs/licensing.md` and `docs/testing-and-debugging.md` capture compliance and QA notes.
- The `docs/flw-video-abstraction/` files define the vendor-agnostic layer FLW can build against.

## Contribution
- Keep this README updated whenever a new doc is added, because PMs and engineers will use this gateway to locate the right file.

### Key Files Referenced
- `docs/repo-map.md`
- `docs/overview.md`
- `docs/architecture/system-architecture.md`
- `docs/webrtc/webrtc-in-this-project.md`
- `docs/forking/roadmap.md`

### Open Questions
- Should we include a printable cheat-sheet or extracted PDF version of these docs for partners who need offline copies?

### Next Steps
- Reference this README inside the final PM handoff so the FLW team knows where to find each topic after the fork is handed off.


