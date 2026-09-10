# Plan response integrity — #282

- Owner: requested functional completion, authorized implementation, tested merges and deployment verification.
- Codex: reproduced failures, implemented the response boundary, inspected rendered screens and ran the checks below.
- Scope: reject malformed successful plan responses before replacing usable results. No complete #282 or Release GO claim.

## Behavior

Validate the response's required plan fields, core records and nested arrays before resetting route/audio or assigning the new plan. A malformed response keeps previous results, saved places and the localized retry path. Previously displayed results remain unavailable for new additions until a valid retry succeeds. Preserve valid empty/partial results and original records/retrieval timestamps exactly; do not manufacture fallback records. Abort still prevents assignment.

Validation loads with the page. Only result-card photos are deferred until cards exist; facility evidence, titles, add/remove and visitor-information controls remain immediately available. A failed photo module displays an unavailable state inside the picture area and leaves those actions usable. The facility summary was extracted unchanged into a static component. No provider API, retry count, timeout, cache, saved-data format or performance budget was changed.

## Reproduction and validation

Baseline9ae128e reproduced two desktop failures after HTTP200 with invalid JSON or missing fields: the previous plan was overwritten and the entire Planner entered recovery with “plan.statuses is not iterable”. A first deferred-validator implementation exposed an unrecoverable module-fetch retry in two browser cases; that additional request boundary was removed.

Normal integration of main #4243a5df2776b0102ebfab8edddd720b57759bc084e preserved its cause-specific errors. Three conflicts were resolved by retaining both response validation and the real API classifier. Source scans include the extracted facility component.

The legacy focus/region hook fixtures now execute the real validator with valid plan envelopes. Two older browser fixtures omitted baseYm/course/audio; they now supply the actual required envelope with TypeScript satisfies PlanData. The malformed-response fixtures remain intentionally invalid. No assertion or timeout was relaxed.

Earlier isolated validation:11 targeted contracts PASS; the first four malformed-response browser cases PASS. On main #423,70 browsers PASS2.2min. Static validation first exceeded the initial JavaScript budget (270.18KiB; combined main #424270.08KiB after summary extraction). Deferring only the photo component brought the final measured initial Planner JavaScript to269.07/270KiB and CSS69.90/70KiB.

Final main #424 full lint/typecheck,753 unit/contract tests and Vercel build/performance PASS (13 existing lint warnings, no errors). All108 expanded browser cases PASS3.0min (integrity16, failure12, core18, focus40, recommendation-language16, navigation-language6). Fresh960px Korean/light and1440px English/dark captures were visually reviewed: localized recovery guidance and prior cards are readable; the English photo is still in its normal loading placeholder in this capture. The photo-module failure test independently verifies facility evidence, add/remove, visitor details, saved1001 and axe. The static-validator test verifies no extra module request during search. The previous expanded run was stopped after its incomplete legacy fixtures caused repeated setup failures; it is not counted as a pass.

Additional integration caught a third legacy fixture: multi-region addition supplied Place[] as stops, whereas the server emits RouteStop[] with title/note/source. The original hosted CI34419124468 failed that same case on desktop and mobile; no unrelated hosted failure was observed. The fixture now builds typed RouteStop records from its places. Assertions, retries and timeouts are unchanged. Fresh integrity16 plus region-change14 browser cases all PASS (30 total,1.4min), and the complete753-test lint/typecheck/build/performance suite PASS again (Planner269.07KiB/CSS69.90KiB). Existing detail, facility and quota fixtures retain valid required envelopes.

## Remaining work

Local verification is complete. Run exact-head hosted CI, verify latest main, merge and verify its own Production. #424 Production was verified through CD34419004706 and its canonical smoke before this update. Existing #372 provider hold remains external; no held provider probe, account operation or paid activation was performed.

