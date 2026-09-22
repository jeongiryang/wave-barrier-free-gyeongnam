# PDF audit: date and source for map crowd forecasts

- Scope: PDF page 28, API 13 tourist concentration forecast, in the direct itinerary map.
- Human: authorized a separate bounded fix and PR; no merge/deployment and no Naru/model interactions.
- Independent QA observed a live `76.7%` forecast without source or reference date. Codex reproduced the omission in a direct browser fixture and implemented the fix. Independent review is coordinated separately.

## Change

The map legend now names the Korea Tourism Organization forecast, displays the actual `baseYmd` as a calendar date, and explains that the percentage is not a live headcount or waiting time. The provider is established by the existing `TatsCnctrRateService` request in `server/tourism/concentration.ts`. The legend's rate and crowd level calculation are untouched.

Missing or impossible dates display `기준일 미확인` / `Reference date unavailable`; no current date is substituted. The metadata occupies a wrapping row that remains visible on narrow screens, independently of the optional prediction advice paragraph.

## Validation

- Pre-fix direct browser case failed: the legend contained `30일 혼잡 예측 · 경남도립미술관매우 붐빔…76.7%` but no provider or reference date.
- `node --test tests/map-status-language.test.mjs tests/crowd-calendar-provider.test.mjs`: 8 passed. Covers compact/ISO dates, leap days, missing and invalid dates, forecast copy/rate semantics, provider failure boundaries.
- `node node_modules/eslint/bin/eslint.js features/routing/map-status-copy.ts features/routing/components/MapStatusOverlays.tsx tests/map-status-language.test.mjs e2e/map-crowd-source-date.spec.ts`: passed.
- `node node_modules/typescript/bin/tsc --noEmit`: passed.
- `E2E_BASE_URL=http://127.0.0.1:4181 node node_modules/@playwright/test/cli.js test e2e/map-crowd-source-date.spec.ts --workers=1`: 6 passed (23.5s): actual/missing/impossible dates on desktop/mobile. The valid case checks 1440px, 960px and 390px layouts. Metadata screenshots at 960px and 390px inspected; source/date are readable without horizontal overflow.
- Initial post-fix matrix had 2 desktop test failures because resizing to 960px exposes the existing time/map switch with time selected. The test now explicitly reopens the map after each viewport change; no product behavior was altered for this test issue.
- Browser override: `E2E_EXECUTABLE_PATH=C:/Users/user/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe` against the isolated feature worktree on port 4181.

## Limits

Auth, tourism, crowd and map responses are synthetic browser fixtures; this does not revalidate the external provider's current forecast. No model or Naru control was invoked, and community/demo files are unchanged. Full CI, deployment and production verification of the patch were not run.

## 2026-09-22 PR CI responsive synchronization correction

- Current user authorization permits merge after required CI; root coordinates merge/deployment. This follow-up changes only the crowd evidence browser spec and this log.
- Run `35693516652`, desktop shard 3 job `106635312607`: the valid-date and invalid-date first attempts failed, while retries passed. Trace shows both resize from 1440px to 960px and call the shared helper before React handles the 1024px media-query change. Its immediate `isVisible()` returns false and skips the map button. The later compact layout correctly selects the default timetable and hides the map; evidence data remain in the hidden DOM. The valid-date case passes its early visibility/overflow checks before that update and then times out locating the hidden region for a screenshot. This is a test synchronization race, not slow screenshot encoding or lost crowd data.
- The spec now waits for the viewport-specific control count/visibility before calling the shared helper, then confirms the map button's pressed state and board map state. It keeps all percent, actual/unknown date, source, disclaimer, overflow and screenshot checks. Desktop traverses 1440 -> 960 -> 390 -> 1440; mobile remains 390. Product code, shared helpers, timeouts, retries, budgets and CI gates are unchanged.
- `E2E_BASE_URL=http://127.0.0.1:4191 node node_modules/@playwright/test/cli.js test e2e/map-crowd-source-date.spec.ts --workers=2 --retries=0 --repeat-each=2`: **12 passed (30.0s)** after confirming `/planner` HTTP 200 contains its region control and no Nitro error. Auth/tourism/crowd/map remain synthetic fixtures; no Naru controls were opened.
- Initial local run: 10 passed / 2 failed (1.3m). I started against the new worktree's cold Vite server too early; those two failures showed `Vite environment "nitro" is unavailable` before the region control or resize path. Restarted the ready server and reran the unchanged spec. This local setup failure is distinct from the investigated CI failure.
- Browser executable override remains `C:/Users/user/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe`. `node node_modules/eslint/bin/eslint.js e2e/map-crowd-source-date.spec.ts`, `node node_modules/typescript/bin/tsc --noEmit` and `git diff --check`: passed.
- Traces and the detailed timestamp report are preserved externally in `wave-audit-20260922/ci673-desktop3` and `pr673-resize-race-report.md`. Width screenshots are preserved in `pr673-crowd-resize-evidence`; at 390px the locator screenshot also captures the existing floating assistant launcher overlapping its left edge, so automated overflow checks are not evidence that every fixed overlay is absent.
