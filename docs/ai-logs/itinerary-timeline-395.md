# Itinerary timeline and visible date/time editing — #395

The Owner authorized active design improvement using open-source libraries and reference sites, followed by tested merging and Production verification. This change addresses usability items 01 and 03 in #395. The separate daily departure-point policy in item 04 is unchanged.

## Problem and resulting behavior

On main #430, 960px and 1440px renders showed equal-height day cards with large empty columns, small place headings and a 112px start-time input. Dates and editing actions competed for attention. The editor now presents sequential date chapters with a stop rail, compact empty dates, larger place names and times, a visible Change visit date label, and grouped order/removal actions. A full-size Choose time button focuses the larger native input and opens its picker when supported. Keyboard text entry remains available if the browser cannot open a picker. The English heading uses the singular for one place.

The existing CSS owner block is rewritten and obsolete grid overrides removed. All dates, immutable place IDs, ordering, storage, route evidence, focus behavior and global reduced-motion handling retain their contracts. No source assets are copied, dependencies installed or provider requests added.

## Reference application

- [Hanwha Ocean](https://www.hanwhaocean.com/): the existing official tab was revisited; the full-height ocean opener and inset expanding photograph were observed at a narrow viewport. The desktop viewport attempt timed out, so it is not claimed verified. The hierarchy of a strong chapter heading and a focused composition informs the date chapters.
- [Radix Select](https://www.radix-ui.com/themes/docs/components/select) and its official MIT license: clear field boundaries and labelled groups inform the date/time controls. Implementation uses existing native controls and Deep Ocean tokens.
- [Motion accessibility](https://motion.dev/docs/react-accessibility): state remains understandable with reduced motion. Existing focus border transitions follow the global reduction policy.

## Verification and limits

Initial new English test setup incorrectly used a Korean-only helper, then switched language before saving and correctly encountered stale-result protection. Final setup saves the place before changing language through the existing preferences UI. The expanded run also exposed a real 320px English control-width failure: fractional layout left insufficient room for the label. Order buttons now have a sufficient minimum width and wrap. No existing assertion, timeout, retry, axe check or performance budget was weakened.

On actual main #430, the final related 16 browser cases passed in 43 seconds, and the final singular-copy candidate passed all 4 new cases in 8.4 seconds. All 756 unit/contract tests, lint, typecheck, Vercel build and performance budgets passed (Planner 269.22/270 KiB; CSS 69.89/70 KiB). Actual 960px Korean light and 1440px English dark captures were inspected. The original baseline captures were viewed, but a later helper overwrote their temporary filenames with candidate images; those files must not be presented as untouched baseline artifacts.

Integration with PR #431 candidate 50c5f67, including actual main #433, is recorded at 35a997755d4f1e5fb2a3f8d62ec647db176ef322. All 60 browser cases passed in 2.3 minutes: date/time editing, itinerary language, seven-day boundaries, board behavior, restored exports and touch targets. This verifies candidate compatibility, not Production. Actual main #431 integration, fresh full checks and this PR's hosted CI/CD/canonical Production verification remain required before completion. Neither all of #395/#386 nor full Release GO is claimed.
## Actual main #431

Normal merge 6eef5afe2733d77da69873c59fcbe4883626dcd0 includes actual 0c71bf8954a3578a0128ff5352c9ab70b62c936e. The diff from main contains only this editor composition, its focused browser tests and this log. Fresh lint, typecheck, all 762 unit/contract tests, Vercel build and performance budgets passed (Planner 269.34/270 KiB; CSS 69.89/70 KiB). All 60 related browser cases passed again in 2.3 minutes. No failures, skips or weakened checks. Hosted CI and the PR's own Production verification follow; predecessor #431's Production verification must finish before this PR merges.