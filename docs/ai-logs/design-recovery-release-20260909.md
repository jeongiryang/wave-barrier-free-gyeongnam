# Design recovery and release candidate — 2026-09-09

Owner authorized merging and Production deployment after recovering the local design; further visual polish may follow deployment. The later explicit Owner decision removes the requirement for three approving reviews and permits Owner-approved administrative merge. This does not represent CI success.

## Preserved work

- Worktree: `D:/wave-production-validation-20260908`, branch `feat/fullscreen-story-353`.
- Recovery expected `d92c4bf`; actual HEAD `4e11ce7` contained two later design commits and seven modified files. All were retained, including the single-photo regional selector and updated photographs.
- No reset, clean, checkout overwrite, dependency installation, or lockfile change was used. Local Vite remains at `http://127.0.0.1:4173/`.

## Release preparation

- Migrate four stale unit contracts to the current fullscreen Intro, registered sections, lazy photographs, and explicitly preserved removed presentation sources. Actual Planner routes and functional tests remain intact.
- Keep archived Landing CSS source files but load only the active Community, Hero, media, closing and regional foundation rules. Preserve their declarations and cascade, including reduced-motion rules. Performance limits remain unchanged.
- Update AGENTS.md, CLAUDE.md, PR template and policy assertions for explicit Owner approval instead of three required reviews.
- GitHub ruleset `20970955` required approving review count changed from 3 to 0. Existing administrator bypass, PR/squash, strict `validate`, linear-history, deletion and force-push protections were retained and read back. Previous ruleset was saved outside the repository.

## Evidence and outstanding gates

- Initial lint: zero errors, ten existing warnings. Typecheck passed. Production build passed.
- Initial unit suite: 704/708; after current design and Owner-policy contract migration: **708 passed, zero failed/skipped**.
- Initial CSS: 76.25 KiB gzip / 70 KiB budget; removal of inactive scene imports brings CSS below the unchanged limit. Local Node 24 build still reports Planner initial JS **270.16 / 270 KiB**. Hosted CI uses Node 22; the performance gate is not marked passed.
- Full browser run encountered stale assertions for removed region-map disclosures and prior compact/journey sections. Stopped this known failing diagnostic run; logs, screenshots and traces remain under the local temporary `wave-release-browser-*` paths. No full-suite PASS is claimed.
- Current 60-case design subset is under verification. A CSS extraction initially omitted shared Hero foundation rules; these were restored before the next verification. Initial failure artifacts remain preserved.
- Deployment, final exact-head CI, full browser migration and Production verification remain pending. Owner approval is not reported as QA/CI success; #353/#385 remain open and #386/#387 are not implemented by this change.


## #391 browser release repair — 2026-09-09 evening

The Owner explicitly prioritized the existing release before new design work. New editorial work is preserved separately at `6051995` on `feat/design-completion-20260909`; it is not included in this release repair. The original PR head `d425433` failed hosted browser CI while quality and the frozen boundary passed. It had not merged or reached CD.

Coverage migration follows the current Owner-approved presentation rather than resurrecting retired screens:

| Previous expectation | Current verified contract |
| --- | --- |
| Landing map disclosure and 18 markers | Actual Planner SVG boundaries, all 18 named region buttons plus neutral All Gyeongnam, geometry, native keyboard selection, pointer selection, 44px size and axe |
| Seven compact diagrams and six collapsed tool links | Seven full-screen chapters, real photos/credits, facility and Community DOM demos, all seven native chapter links/mobile selector and actual Planner CTA |
| Optional Hero video and separate 20-second film | Static Hero artwork, finite three-phrase sequence, no retired film download, first-arrival video tested separately |
| Dated Landing recording controls | #386 remains deferred. Original six timeline assets retain literal dimensions, dates, place IDs/ranks and SHA-256; current recommendation screenshot remains uncropped. Actual Planner itinerary/date/map tests remain active |
| Retired session marker in general public-page tests | Current completed-arrival marker; first-entry suites still test fresh sessions, legacy marker incompatibility, canvas phases, dismissal, keyboard focus and replay |

No cases were removed from the full inventory: **918 browser cases** remain. Four shards per device contain 115/115/115/114 cases, and the union equals the complete inventory with no duplication or omission. The Owner authorized reducing Actions latency; the two-worker CI limit, assertions, retries, fail-on-flaky, timeouts, budgets, frozen boundary and protected aggregate gate are retained.

Actual product corrections found by the migrated checks:
- Recover failed Hero images even if the error occurs before hydration attaches its event handler.
- Associate Hero, facilities and closing section focus with their real headings.
- Keep native keyboard-focused Planner controls above its fixed mobile navigation.
- Disable the replay button until preferences hydrate, and keep small section labels readable on light scenes. Give closing a dark fallback surface behind its image.
- The contrast sampler ignores only elements whose computed absolute positioning, overflow and zero-area clip prove no pixels are painted; visible low-contrast text remains checked.

Verification evidence is kept in temporary `wave-release-repair*` reports and traces. An initial restart raced the first four browser navigations; a subsequent stable-server rerun of those suites passed. 48 targeted browser cases passed; the broader 166-case run found four additional failures (161 passed and one pre-existing project duplicate skip). Those failures were repaired; the final 56-case rerun passed with zero failure, skip or flaky. The final unit rerun again passed all 708 cases, and lint/typecheck passed. Unit suite: 708 passed; lint: zero errors, ten existing warnings; typecheck and build passed. Local Windows builds with both Node 24.14.0 and CI-matching Node 22.23.2 report Planner initial JS 270.18/270 KiB. The earlier hosted Linux build reported 269.26/270 KiB. Budgets were not increased; the new exact-SHA hosted performance gate remains required before merge.

Production remains on main `a355f38` with successful CD run `34297916669` until this PR clears CI and merges. The release is not reported as deployed prematurely. After each approved PR merge, notify the Owner in the current conversation, verify CD and the canonical Production URL, and repair deployment failure before starting the next release.
