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
