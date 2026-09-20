# WAVE intro — final candidate

Owner-review candidate containing the latest standalone `wave-intro/` source.

- Source: local commit `d28c0ee`.
- Archive: `wave-intro-20260921.zip`, generated directly with `git archive`.
- SHA-256: `806192661CDBB3960D6C0B3F64EC58490B92C847B81356E1735E6D40770B6164`.
- Includes source, lockfile, build configuration, local QA scripts and graphic assets.
- Excludes dependencies, credentials, local execution state, screenshots and unrelated documents.

## Included behavior

- Live WebGL intro using 330,000 desktop / 144,000 mobile particles.
- Opening waves and a full-screen 3D particle field gather into Gyeongsangnam-do.
- The province caption reads “경상남도에서 시작되는, 모두를 위한 여행”.
- The map disperses into four figures: wheelchair, elderly/cane, mother holding a child's hand, and seated adult/baby.
- Each figure has its own caption and gathering motion.
- Particles gather into WAVE; “모두의 발걸음이 닿는 경상남도” appears after the intended delay.
- The completed WAVE and caption disperse to reveal the host service page.
- Total playback is approximately 12.73 seconds; Escape completes immediately.

## Validation before archiving

- Focused ESLint and diff checks passed.
- Browser QA passed for the revised opening order, map-caption timing, mobile bounds, completion callback, reduced motion and Escape.
- Observed completion was approximately 12.73 seconds and fired once.
- This standalone archive still requires owner review and integration into the host service before production release.

## Restore

Extract into an independent directory. Use Node >=22.13 and the included pnpm lockfile to install dependencies, then run `npm run dev`. QA scripts currently reference the original Windows runtime paths and need adjusting on another host.

The ZIP remains isolated because unpacked prototype TSX would otherwise be picked up by the main service's recursive TypeScript and lint configuration. This PR updates the review artifact; it does not deploy or merge it automatically.
