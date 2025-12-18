# Privacy Notes

## Minimal data collection
- The project README explicitly states that “video streams are generally designed to be private” and encourages controlling who receives invite links (lines 109‑116). VDO Ninja keeps cookies only for technical functionality and avoids unnecessary data harvesting, so FLW should keep the same philosophy when collecting analytics or session metadata.
- `main.js` does not echo back sensitive user data; it only stores UI preferences (`session.sticky`, `session.language`) via `localStorage`/`sessionStorage` for convenience. Passwords are sanitized before storage in the `publishWebcam()` flow (lines 20557‑20585), limiting exposure when a director chooses to remember them.

## WebRTC privacy posture
- Peer-to-peer media flows are established without routing media through the backend (except optional TURN relays), keeping viewers’ video/audio confined to browser-to-browser channels. The `turnserver.md` guide (lines 1‑118) is only needed when NAT traversal fails; it does not encourage turning on logging, so FLW should treat that server as a transient relay rather than long-term storage.

## Transparency and opt-in
- The README acknowledges the use of cookies exempt under EU law and points to the hosted privacy policy (lines 109‑117). Any FLW fork should keep that level of transparency and, ideally, surface a user-friendly privacy notice within the new UI so guests understand what is stored and why.

### Key Files Referenced
- `README.md`
- `main.js`
- `lib.js`
- `turnserver.md`

### Open Questions
- Does FLW need to publish its own privacy statement, or can it continue linking to the existing VDO Ninja policy referenced in the README?

### Next Steps
- Coordinate with the fork roadmap to ensure any additional tracking/integration hooks introduced by FLW are reflected in this privacy summary.


