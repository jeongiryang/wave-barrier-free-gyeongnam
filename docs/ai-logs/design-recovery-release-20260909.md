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
