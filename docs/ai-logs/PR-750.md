# Naru place result cards — 2026-09-28

- Owner request: replace the bare, full-width attraction rows in Naru with a finished compact interface; merge and deploy.
- Primary role: design. Related requirements: responsive-journey, naru-workspace, naru-grounded-request.
- Existing supplied tourism photo, city, name, address and facility evidence now form a responsive card. Missing/failed photos have an honest placeholder. No additional search API and no unrelated substitute photos.
- Existing details focus/scroll context, current-result/revision guard, add and saved state are preserved. Evidence still distinguishes confirmed, absent and unknown.
- Removed superseded global row styles. CSS gzip measured 108.62 KiB; Owner-authorized measured allowance rises narrowly from 108.5 to 109 KiB. JS budgets unchanged and pass.

## Verification

- npm test: 1867/1867 passed.
- lint: zero errors, 33 existing warnings; typecheck and build:vercel passed.
- check:performance passed (CSS 108.62 KiB, landing JS 152.07 KiB, planner JS 250.63 KiB).
- Playwright naru-evidence + simple-naru-conversation, desktop Chromium, workers=2: 21/21 passed. Includes 1440/dark, 960/light and 390/dark viewport cases; real image-load/404 fixtures, long names, missing address, 44px targets, hit testing, overflow, axe, details return and actual saved-place state.
- Earlier unconstrained local browser concurrency caused navigation timeouts; rerun with two workers passed without relaxing assertions or product behavior.
- Test fixtures are synthetic; they do not certify actual tourism provider or model availability. Actual Production UI is checked after Actions deployment.
- Independent read-only QA: /root/pr_review found no P0/P1 in final component, state guards, evidence or corrected test expectations.
- Root visually inspected all three saved viewport screenshots. Full submission/release audit is outside this bounded UI change.

## Delivery

- GitHub Actions CI/validate required before squash merge. Production deploy uses Actions CD only.
- No database, runtime/model or environment-variable change. Rollback: revert this PR through the same release path.
- AI: Codex. Human decision: user explicitly requested this visual change, merge and deployment.