# Provider operational gate — #365

- Owner-authorized implementation: Codex subscription, 2026-09-08.
- Based on #369, corrected core `f9e6b5974d0f370351e1d0517a778095b22b7206`.
- Candidate only; no runtime/scheduler/paid workflow activation, no live quota probe.

## Root cause and change

Adapters can report restrictions, but the UI previously conflated an unavailable
recommendation with a normal empty result, and region/theme aggregation dropped a
failed subset if another subset succeeded. Recommendation/weather/transport now
show safe KO/EN failure notices, retain the user's itinerary and verified places,
and keep partial evidence out of complete/live states and shared response caches.
Insufficient-evidence place UI loads on demand; its existing content/actions were
moved intact to keep the unchanged 270 KiB planner budget.

Production smoke previously retried HTTP429 as a transient error and its generic
failure event could create repeated engineering work. Existing success contracts
remain unchanged. The smoke now has a finite application request budget and stops
on explicit restrictions. Validated bot-authored operational holds persist through
GitHub Issues, are checked before further live calls, and cannot become executor
work. Writing Issues is isolated from read-only validation. A mixed browser or
deployment defect still reaches the ordinary Failure Router. Original task
attempts/generations, paid false gates and sandbox boundaries are untouched.

## Validation and intermediate corrections

- Initial full unit run failed because the weather refactor had bypassed the
  established `optionalPlannerJson` contract. The product helper was retained and
  extended with an error callback; the assertion was not removed.
- Moving existing insufficient-evidence UI required adding the new source file
  to the existing source-contract aggregation. Existing assertions remain intact.
- Initial builds exceeded the unchanged planner budget (270.17 and 270.16 KiB).
  Loading the secondary UI on demand and removing unused props brought it to
  270.00/270 KiB; CSS69.96/70. No budget was raised. Headroom remains very small.
- Focused browser/axe:64 PASS,0failed/flaky/skip, including new320px KO/EN notices
  and existing recommendation/weather/transport scenarios. New test syntax was
  corrected before that run; no locator or assertion was weakened.
- After the independently reviewed #369 circuit-race correction was fast-forwarded
  without touching the dirty follow-up, full unit/contract689 PASS,0failed/skip;
  no-loop/queue/Production focused30 PASS. Real smoke entrypoint was run with a
  substituted fixture fetch:HTTP200/429/502 restriction stops at two application
  calls, returns failure, and emits no private sentinel. No live provider calls.
- lint0errors2pre-existingwarnings;typecheckPASS. Final full browser, build,
  performance, audit, workflow static CI, Preview and independent QA still need
  final-HEAD evidence. Do not reuse the old #369 PASS superseded by review5140431045.

Final local source checks before PR:690 unit/contract PASS (application HTTP429
without an upstream identity now also verified),0failed/skip;both dependency
audits0;build/performancePASS;actionlint1.7.12PASS (downloaded official Windows
archive SHA2566e7241b51e6817ea6a047693d8e6fed13b31819c9a0dd6c5a726e1592d22f6e9).
Hosted actionlint also supplies shellcheck on the unchanged shell commands. React
component review covered stable hook ordering, generation/abort ownership, deferred
secondary UI, status announcements and preservation of existing facility controls.

Original10 dirty user files,49worktrees and historical traces/reports are preserved.
The follow-up was checkpointed outside the repository before the #369 correction.
#365 minimum is not operationally complete until same-HEAD CI/QA/Production verify
these contracts. Then #368 measured Fast PR/Full Release work precedes the actual
trusted-only canary; #353 follows. Account-wide distributed protection and opaque
SDK diagnostics are not falsely counted as implemented.
