# PDF audit: keep direct search and recommendations on one official place

- Scope: PDF page 7, direct place search and official facility identity.
- Human: authorized bounded fixes in separate PRs; no merge/deployment or Naru/model checks.
- Independent QA reproduced a live duplicate museum visit. Codex diagnosed the public responses and implemented regressions; independent patch review is coordinated separately.

## Live evidence and cause

Read-only GETs on 2026-09-21 to the deployed `/api/location-search?q=경남도립미술관&scope=gyeongnam&official=1&profiles=restroom` and `/api/wave?action=places&ids=1622590&profiles=restroom` returned:

- Kakao `23821302`: `경남 창원시 의창구 용지로 296`, coordinates `128.69085550149`, `35.2394650280721`.
- Official `1622590`: `경상남도 창원시 의창구 용지로 296 (퇴촌동)`, coordinates `128.6908827248`, `35.2395039295`, confirmed restroom evidence.
- Direct search returned `officialState: available` and `officialPlaces: []`. Exact names and approximately 5m distance agreed, but the optional trailing neighborhood made address comparison fail. The direct card could add the Kakao ID alongside the already saved official ID.

## Change

Address comparison accepts a single trailing Korean dong/ri reference only after a complete road and building number. Both sides' references must agree when supplied. It retains exact normalized name checks, the existing 150m coordinate bound and unique official-candidate requirement. Road numbers, floors, apartment blocks, annex labels and arbitrary parenthetical text remain significant. No fuzzy name-only join or facility inference is added.

## Validation

- Actual-shaped museum unit regression failed before the fix (`undefined` instead of the official museum) and passed afterward.
- `node --test tests/place-identity.test.mjs tests/location-official-identity.test.mjs tests/location-results.test.mjs`: 11 passed. Includes reversed suffix placement, different road/building numbers, floors, numeric/letter blocks, annexes, contradictory neighborhoods, nearby library name, distant coordinates and duplicate-candidate ambiguity. Adapter test verifies only official `1622590` is fetched and retains confirmed source evidence.
- `node node_modules/eslint/bin/eslint.js lib/place-identity.ts tests/place-identity.test.mjs tests/location-official-identity.test.mjs e2e/place-identity-continuity.spec.ts`: passed.
- `node node_modules/typescript/bin/tsc --noEmit`: passed.
- `E2E_BASE_URL=http://127.0.0.1:4181 node node_modules/@playwright/test/cli.js test e2e/place-identity-continuity.spec.ts e2e/place-search-identity.spec.ts --workers=1`: 6 passed (21.1s), desktop/mobile. Required restroom selection survives; direct museum shows confirmed official evidence and already-saved state, undo/re-add uses only the official ID; nearby differently named library stays unknown. Existing official lookup failure remains usable without fabricated facilities.
- Browser override: `E2E_EXECUTABLE_PATH=C:/Users/user/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe`; isolated feature worktree server on port 4181.

## Limits

Only the two diagnostic public GETs were live; adapter/browser tests use sanitized public-response shapes with synthetic transport and facility text. Production was not changed or retested with the patch. Complex building/address variants remain unmatched deliberately. This change does not rewrite previously saved duplicate visits. Full CI and deployment were not run.
