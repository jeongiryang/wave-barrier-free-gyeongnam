# PDF audit: preserve required facilities when adding a festival

- Scope: PDF pages 6 and 16; direct festival-to-planner flow. No merge or deployment.
- Human: requested feature audit and risk-based verification, excluding Naru and model interactions.
- Implementation: Codex; independent QA review coordinated separately.

## Defect and change

`addFestivalToTrip` inherited the empty trip's explicit `[]` facilities value. Adding a festival therefore cleared both a current trip's required facilities and the legacy tab selection on planner hydration. Preserve the stored value, including `null`, so existing planner recovery can distinguish an unset legacy field from an explicitly empty selection. Dates, fixed appointments, transport and visit durations retain their existing behavior.

## Validation

- Four new unit cases failed before the change: selected facilities became `[]`, and unset facilities became `[]`. All four pass after the change.
- `node --test tests/festival-facility-continuity.test.mjs tests/festival-visit-confirmation.test.mjs tests/facility-selection.test.mjs`: 28 passed.
- `node node_modules/eslint/bin/eslint.js lib/festival-trip.js tests/festival-facility-continuity.test.mjs e2e/festival-facility-continuity.spec.ts`: passed.
- Direct browser regression uses synthetic festival/place/auth API responses and verifies selected checkboxes, actual search request parameters, tab/current-trip persistence, dates, fixed visits, transport and durations on desktop/mobile. No model requests or Naru controls are used.
- Initial browser startup could not find requested Chromium revision 1234. Subsequent runs use the existing `C:/Users/user/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe` through `E2E_EXECUTABLE_PATH`.
- First browser run reused independent QA's unpatched server on port 4173: all four cases reproduced unchecked required facilities. An early isolated-server retry received connection refused during initial Vite compilation; this is an environment startup failure, not a product assertion failure.
- Final patched-server run: `E2E_BASE_URL=http://127.0.0.1:4181 node node_modules/@playwright/test/cli.js test e2e/festival-facility-continuity.spec.ts --workers=1`: 4 passed (51.3 seconds).

## Audit scope transparency and limitations

Before implementation, a broader 160-test batch passed across trip input/commands/dates/time constraints, itinerary schedule/legs, festival confirmation, place identity/coordinates, facilities, account travel and live-share. `tests/trip-input-boundaries.test.mjs` was discovered afterward to contain mixed pure Naru journey cases; those were inadvertently executed, without UI or model interactions. That file is excluded from subsequent checks. No Naru code was changed.

The added browser tests are fixture-based, not proof of live festival provider or account database behavior. Full CI, deployment and live account persistence were not run for this bounded change.
