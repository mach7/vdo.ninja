# Hosting & Deployment Notes

## Static hosting
- VDO Ninja is distributed as static assets, and `install.md` walks through the simplest deployment options: GitHub Pages for a rapid proof-of-concept (lines 28‑37) or an NGINX server serving `index.html` with HTTPS (lines 52‑84). The same section emphasizes the SSL requirement because WebRTC only runs on secure origins (lines 40‑84) and recommends Cloudflare or Certbot for certificate management.

## TURN relay servers
- When a private TURN relay is needed, `turnserver.md` provides the coturn install flow (lines 1‑118): enable the service, install Certbot, open UDP/TCP ports 3478 and 49152‑65535, edit `/etc/turnserver.conf` with credentials and TLS paths, and start/enable the coturn systemd unit. The doc also highlights TLS pitfalls (lines 24‑105), such as letting Certbot certificates be readable by the service.

## Handshake server considerations
- The install guide notes that FLW can host its own handshake server via `websocket_server` (lines 148‑153). Deploying that component lets FLW stay fully air-gapped or use private WSS endpoints; the static client just needs to point to the custom `wss` URL via query parameters or `session.wss` overrides (see `lib.js`’s `soloLinkGenerator()` for how `&wss` is appended).

## SSL, domains, and internet-free scenarios
- The doc also explains how to deal with local SSL (lines 115‑144): add the cert to system trust stores or disable security flags for testing. The “internet-free deployments” section (lines 115‑144) covers self-signed cert adoption and CLI flags for Chromium when FLW plans to operate without a public CA-signed cert.

### Key Files Referenced
- `install.md`
- `turnserver.md`
- `index.html`
- `lib.js`
- `README.md`

### Open Questions
- Does FLW plan to use a hosted handshake server under a new domain, or will it rely solely on the existing `websocket_server` repo recommended in `install.md`?

### Next Steps
- Cross-link this hosting doc from `docs/forking/roadmap.md` so the PM sees the infrastructure expectations when planning the white-label fork.


