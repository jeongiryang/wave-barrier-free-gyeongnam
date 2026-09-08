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

CI851 on `b4f87c9` passed quality but correctly blocked its changed queue CLI:
the immutable CI distribution still expected the old coordinator bytes. This was
a missing distribution refresh, not a browser defect or justification to weaken
the boundary. Source `b4f87c9` pins the new CLI digest; distribution `51e3331` pins
that source. CI now downloads exactly that immutable bootstrap with its SHA256.
Only the explicit distribution SHA/hash constants in the existing contract test
changed; deep equality for every command, timeout and safety probe remains intact.
Existing external-bootstrap and CI-bootstrap tamper probes pass without queue or
model execution. No new sandbox scenario, kernel setting or isolation mechanism
was added. Existing installed runtimes are preserved and remain unactivated.

#369 was subsequently squash-merged as `5e7ec6b5a969dec4928b55c3b169ab6767c0f089`
after CI850 and independent QA5140782398 PASS. Its Git tree exactly equals reviewed
source `f9e6b59`. Integrating this main into the follow-up caused eight add/content
conflicts because squash removed the source ancestry; inspected committed follow-up
versions were kept only after whole-tree equality and ancestor checks. The merge
result equals the pre-merge follow-up tree; no product change was dropped.

The local browser run started at `b4f87c9` overlapped that integration and saw
temporary conflict files. Its owned execution was stopped at385/796, logs and
reports copied to the external interrupted-run checkpoint, and it is **not PASS**.
The final stable HEAD must run the full suite afresh. The frozen CI boundary failure
is separately preserved as CI851 evidence; no tests or gates were bypassed.

Original10 dirty user files,49worktrees and historical traces/reports are preserved.
The follow-up was checkpointed outside the repository before the #369 correction.
#365 minimum is not operationally complete until same-HEAD CI/QA/Production verify
these contracts. Then #368 measured Fast PR/Full Release work precedes the actual
trusted-only canary; #353 follows. Account-wide distributed protection and opaque
SDK diagnostics are not falsely counted as implemented.

## Exact Preview correction after CI853

`f243fc9` completed CI853:690 unit, desktop398 PASS, mobile397 PASS plus one
existing skip;0failed/flaky. Stable local full suite795 PASS plus one existing
skip in21.1min. These reports are preserved, not final evidence for later changes.
Its exact READY Preview (`dpl_77y7kexoSpcVXiAttzyTHxYnLcHu`) was exercised with
real Changwon recommendations, Daesan Flower Land itinerary/map1:1, Kakao30min,
and the actual public-transport restriction. KO/EN320/1366, keyboard focus,
dark/reduced motion and no inspected console error/overflow were verified.

That actual Preview found another P1: the main route summary displayed the quota
reason in Korean, but English translation discarded `failure` and used generic
upstream-error text. The new direct unit reproduction failed, and the summary
now uses the same structured failure messages as transport details, even if the
provider has no legacy detail string. Existing validation/empty translations are
preserved byte-for-byte in `transit-detail.ts`. The test import follows that move;
all original assertions remain, with an additional eight-kind KO/EN contract.

The first correction exceeded the unchanged planner budget at270.69KiB. A barrel
re-export kept the deferred translation eager and measured271.13KiB. Direct
module imports and a status-only lazy component now measure269.74/270KiB;
CSS69.96/70. There is no change to route selection, request timing or focus.
Its loading/error notice keeps itinerary and detailed transport controls usable.
Browser regression covers the main quota notice and a failed notice module.

Correction validation:691 unit/contract PASS;lint0errors2existingwarnings;
typecheck/build/performance PASS;focused provider/route language browser38 PASS,
0failed/flaky/skip. No original test/assertion/locator/timeout/worker/retry/budget
was removed or relaxed. New final-HEAD CI, full browser and Preview/independent QA
are still required. Finding receipt: PR370 issuecomment5584257737.

#369 main5e7ec6b separately completed mainCI852 andCD215. Actual Production
deployment `dpl_F6RF2oHLaNHpoBhhzCA8Q72EyPY3` matched5e at11:19:11Z. Its old
Post-Deploy6 route contract still failed; #370's durable hold/no-loop is not yet
deployed and that failure is not relabelled as provider success.
