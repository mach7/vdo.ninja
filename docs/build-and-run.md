# Build & Run

## Build-free delivery
- VDO Ninja is “static first”: there is no transpilation or bundler to run before deployment. Simply host the repository contents from an HTTPS-critical server (Apache, NGINX, GitHub Pages, etc.) and the experience will work out of the box, as emphasized in `install.md`—the quickest install path uses GitHub Pages (lines 28‑37), while an advanced setup can use NGINX with `index.html` served from `/var/www/html`.

## Runtime prerequisites
- Browsers must load `index.html` over HTTPS because the WebRTC engine (`webrtc.js`) relies on secure origins, and the same doc warns that only HTTPS (or properly trusted self-signed certificates for private deployments) will keep the experience working (see `install.md` lines 40‑84). Cloudflare or Certbot are mentioned as favoured SSL providers.
- The static front end also expects to find TURN/STUN/handshake configuration within `index.html` (in the `main.js` / `lib.js` scripts) and offers query parameters that allow customizing `session.wss`, `session.turn`, and `session.whipOutput` without touching the files.

## Recommended run flow
1. Clone/copy the repo to a directory on the web server (`/var/www/html/vdo.ninja` in the example) and serve the files via HTTPS, as shown in `install.md` lines 52‑84.
2. Optionally configure Cloudflare caching/SSL or a different TLS solution to keep the traffic secure.
3. If TURN is required, follow `turnserver.md` to deploy coturn and edit the TURN entries near the bottom of `index.html`.
4. Point directors and guests to the hosted `index.html` URL, optionally appending query parameters for default rooms, translations, or custom handshake endpoints.

### Key Files Referenced
- `install.md`
- `turnserver.md`
- `index.html`
- `main.js`
- `lib.js`

### Open Questions
- Should we offer an official Docker or npm-based “build” script for FLW deployments that bundles the static assets with preconfigured defaults?

### Next Steps
- Link this “build-and-run” doc from `docs/deployment/hosting.md` to keep the operational story linear for FLW implementers.


