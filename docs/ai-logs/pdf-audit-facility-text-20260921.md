# PDF audit: readable facility evidence text

- Scope: PDF page 8, official facility details in the direct place pane.
- Human: requested defect fixes in separate PRs, excluding Naru and model interactions. No merge or deployment.
- Independent QA observed literal `<br />` in the live Gyeongnam Art Museum restroom description. Codex implemented the bounded server change and regressions; independent review is coordinated separately.

## Defect and change

Only the approach-route field used the existing provider text cleaner. Other facility descriptions kept HTML formatting and entities, which React correctly escaped but displayed literally. Apply the same plain-text cleanup to every facility description. Evidence classification still uses the original provider value; confirmed, unavailable and unknown states, counts and scores are unchanged. There is no HTML rendering or new provider call.

The preexisting `buildAccessibilityItems` limit was 300 characters for non-route details. The change retains that limit after cleanup and retains the existing 600-character route allowance; markup no longer consumes the visible-text allowance.

## Validation

- `node --test tests/facility-evidence-text.test.mjs`: 3 new cases failed before the fix and passed after it. Covers `<br>`, `<br/>`, `<br />`, uppercase variants, formatting tags, nonbreaking spaces, ampersands, original input immutability, evidence states/counts and length bounds.
- `node --test tests/facility-evidence-text.test.mjs tests/slope-info.test.mjs tests/accessibility-score.test.mjs tests/dining-accessibility.test.mjs tests/guide-dog-facility.test.mjs tests/tactile-paving.test.mjs`: 44 passed, including failed provider lookup retaining unknown state.
- `node node_modules/eslint/bin/eslint.js server/tourism/accessibility-model.ts tests/facility-evidence-text.test.mjs e2e/facility-evidence-text.spec.ts`: passed.
- `node node_modules/typescript/bin/tsc --noEmit`: passed.
- `E2E_BASE_URL=http://127.0.0.1:4181 node node_modules/@playwright/test/cli.js test e2e/facility-evidence-text.spec.ts --workers=1`: 2 passed, desktop/mobile. The fixture calls the real `placeFrom` server normalizer, then verifies the rendered facility pane text and distinct absence/unknown groups. Mobile screenshot inspected; text is readable with no literal markup or horizontal overflow.
- Browser override: `E2E_EXECUTABLE_PATH=C:/Users/user/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe` (existing installed Chromium). Server is the isolated feature worktree on port 4181.

## Limits

Browser verification uses synthetic provider responses; independent QA's original observation was on the live service. Full CI, deployment and live authenticated account operations are outside this bounded fix. Naru controls, model calls, community and demo features were not modified or exercised by these checks.
