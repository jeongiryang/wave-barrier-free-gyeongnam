# Departure facility evidence — #277 / #280-R06

This owner-authorized change is based on main#415 e2254c96d296a269f838473cd57972e762d1ec08. It completes the bounded facility-count follow-up to the separately merged route/mobility readiness change; source freshness and actual route accessibility remain open.

## Problem and behavior

Baseline2ee3c53: three tests fail because a positive score/knownFields/checkedAt confirms a place with unknown, negative or missing requested facility evidence. The first repair counted unique records but final review reproduced two further failures: a current search could renew an archived place absent from that search, and an omitted requested field could be treated as complete. The latter baseline is preserved in wave-facility-scope-before.log.

The API now exposes the requested facility keys using the same canonical profile-field helper that creates each place's normalized evidence. This adds response metadata, no provider requests or selection changes. Departure readiness combines that key set with current search membership and the current criteria signature. Only current-result places with source/retrieval metadata and item-level records qualify. Each requested field is counted once as confirmed, unknown or negative. Missing requested fields and conflicting duplicates remain unknown; unrequested records cannot inflate coverage. Legacy metadata and archived places outside current results need rechecking. Changed preferences and reload invalidate current confirmation without starting a search. Saved places, archives, sharing and calendar stay available.

## Validation

- Latest main integrated normally. Squash-history conflicts in two readiness files were resolved by preserving field arguments and the already merged route/mobility separation, with only the intended field diff remaining against main.
- Fresh full746 unit/contract tests, lint(13 existing warnings), typecheck, build and unchanged performance gates PASS: Planner269.96/270KiB; CSS69.90/70KiB. Includes actual server-helper coverage for canonical keys, deduplication and unknown fields.
- Related62 browser cases PASS1.9min: facility16, route8, readiness4, departure English22, restored exports4 and deployment recovery8. The complete-evidence cases add child facilities, explicitly search, verify5 confirmed/3 unknown when the response omits them, then omit the saved place from a new result and verify recheck with saved ID1001 preserved. No automatic recommendation request.
- Corrected English count grammar, then reran full746 quality and all16 affected facility browser cases (PASS23.5s). Other46 browser cases are unchanged. Inspected960 Korean light and1440 English dark captures including the final grammar: distinct counts and readable source/status/controls; axe passes. Existing five-card grid and sticky navigation remain visible.
- React review: status is derived from current data; no duplicated fetch/state store, dependency, quota change, cache TTL change, or forced data migration.

Hosted CI, merge and this change's own exact Production verification are pending. Owner waived review-count waiting, not required checks. Do not claim complete #277 closure or Release GO.
