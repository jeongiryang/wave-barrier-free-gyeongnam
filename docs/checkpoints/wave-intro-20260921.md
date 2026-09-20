# WAVE particle intro — checkpoint only

User-requested save point before the Gyeongnam-boundary opening and particle exit changes. **Keep this PR open; do not merge or deploy.**

- Source: local commit `208aee1` (standalone `wave-intro/` project).
- Archive: `wave-intro-20260921.zip`, generated directly with `git archive`.
- SHA-256: `E19B6A6023BC1391D5ABDA6AA060341639EF4A7C27DDDA67997FCEE4C484A59C`.
- Includes source, lockfile, build configuration, local QA scripts and graphic assets.
- Excludes dependencies, credentials, local execution state, screenshots and unrelated documents.

## Preserved behavior

10-second live WebGL intro, 330,000 desktop / 144,000 mobile particles, four figures (wheelchair, elderly/cane, mother holding a child's hand, seated adult/baby), per-figure captions, and delayed WAVE subtitle. No solid icon overlay. Final WAVE remains visible; no mountain/water ending.

## Validation before archiving

- Standalone `npm run build` and focused ESLint: passed.
- Browser QA: actual draw counts, captions, no runtime errors, mobile 390px layout, final-frame stability checked.
- Timing observed: approximately 10,003ms; completion state once; Escape stays completed.
- This is not a claim of pixel-identical reference reproduction or production integration.

## Restore

Extract into an independent directory. Use Node >=22.13 and the included pnpm lockfile to install dependencies, then `npm run dev`. QA scripts currently reference the original Windows runtime paths and need adjusting on another host.

The ZIP is deliberately isolated: unpacked prototype TSX would otherwise be picked up by the main service's recursive TypeScript/lint configuration. No live service source or deployment configuration is changed. Opening/exit revisions are being developed separately and are not part of this checkpoint.
