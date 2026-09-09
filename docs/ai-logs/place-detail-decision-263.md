# Place detail decision hierarchy · #263 / #269

- Author: jeongiryang with Codex; Owner authorized implementation, merge after required CI, and Production verification. No additional review wait is required.
- Base: `cdcbe551092d27ce77339b6f8cfdbe8ccae6b2b8` (#399). Preserved existing worktrees and function WIP. No new Preview, dependency, API, DB, workflow or lockfile change.

## Reproduction and change

On canonical Production after #398, a real Changwon search and Daesan Flower Land detail showed mixed confirmed/unknown facility rows, with the itinerary action below visitor stories and three secondary links. Place name/address now precede the primary Add/Remove action; item-level evidence is grouped as reported available, unreported, and reported unavailable. Raw records, source/retrieval method disclosure, stories and correction form remain accessible. Counts use the actual items when present, retaining legacy summary fallback without inventing item-level evidence.

The primary action is independent of the optional participation module. Existing recommendation/stale-result saving restrictions, dialog-close-on-save, native focus containment and restoration are retained. Saved state is also exposed with aria-pressed. A smaller mobile photo leaves more room for the decision; existing desktop layout is retained. Actual render inspection found the close icon and city label inherited nearly white text in dark mode over their pale surface; their explicit dark foreground now remains readable in either theme. No safety certification is implied by official facility records.

## Verification

- Final `npm run lint`: 0 errors, 13 existing warnings; `npm run typecheck`, `npm test` (708), `npm run build:vercel`, `npm run check:performance`: PASS.
- Unchanged budgets: CSS gzip 69.82/70 KiB; Planner initial JS gzip 269.05/270 KiB; Landing initial JS 121.36/155 KiB.
- Final existing formal browser runner: place-detail-decision, recommendation-language, travel-choice-hierarchy, both hosted device projects, two workers: **34/34 PASS (1.0 min)**. Covers Korean/English, light/dark, 1440/960/mobile rendering, keyboard/focus, Add/Remove storage roundtrip and dialog closure, stale-result disabled action, item counts inconsistent with legacy metadata, original records/language, module failure, community failure/retry, feedback failure/retry and axe.
- Inspected rendered screenshots at 1440 and 960, Pixel 7, and English dark theme. Fixtures are layout/behavior evidence only; the coast image in the fixture is not a production photo mapping.
- Initial run: 24 PASS / 10 FAIL. Eight new tests incorrectly expected title → Add on the first Tab; the existing focus contract is title → Close → Add. Two new tests incorrectly expected saving to keep the dialog open; the established callback closes it. Test expectations now verify the real contracts including reopening/removing and storage state. No product focus or save policy was changed to satisfy those tests. Initial dark-theme screenshot separately identified and justified the foreground fix. The failed-run artifacts are retained locally.
- Logs/artifacts: OS temporary directory `wave-detail-first*` and final `wave-detail-ready*`. Source was frozen during each browser run. React review: no new effects, network waterfall, dependency or client state; lazy optional modules and controlled feedback remain intact.

## Boundaries and next step

This addresses the detail decision hierarchy within #263/#269, not every acceptance condition of those epics. Main CI, same-SHA Production CD and canonical manual verification will be recorded on the PR after merge. #372 provider hold and the functional defects in #347/#387/#388/#395 remain separate. Whole contest submission/Release GO is not claimed.
