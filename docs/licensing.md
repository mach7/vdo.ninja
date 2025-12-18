# Licensing

## Primary licenses
- The repository ships under the terms of `AGPLv3.md` and the complementary `LICENCE.md` at the root. Those documents explain the copyleft commitment (source availability on network access) and any additional terms required by the project.
- The `lineawesome/` font assets include their own `LICENSE.txt`, so designers should respect that licensing if those fonts remain part of the FLW skin.

## Third-party notices
- `thirdparty/adapter.js`, the codec helpers, and any polyfills (e.g., StreamSaver, TensorFlow JS maps) may have separate attributions; most are bundled without modifications, so continuing to ship them in this fork is fine as long as the upstream license terms are preserved. FLW should retain any headers or license texts that accompany those files.

## Fork compliance
- When forming the FLW fork, keep these files easily accessible and mirror the license notice inside the new documentation (e.g., referencing `AGPLv3.md` in the new README) so downstream users know exactly which rights/obligations apply.

### Key Files Referenced
- `AGPLv3.md`
- `LICENCE.md`
- `lineawesome/LICENSE.txt`
- `thirdparty/adapter.js`

### Open Questions
- Does FLW plan to supplement this license matrix with any proprietary modules, and if so, how should those be declared?

### Next Steps
- Coordinate with the dependency doc to ensure any new vendors FLW wants to integrate are covered by appropriate licensing statements before merging the fork.


