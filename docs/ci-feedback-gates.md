# CI feedback and release evidence

The policy separates working feedback from release authorization. **Only a Full
gate with the exact current HEAD can authorize independent QA, merge or CD.**
Fast feedback is never a release PASS and never replaces human review rules.

## Gate contract

| Situation | Browser scope | Completion check |
| --- | --- | --- |
| Owner-created internal Draft, reviewed base map covers every changed file | Mapped existing specs plus core journeys, final accessibility and shared contrast, both unchanged projects | `fast-pr-gate` |
| Ready, `status:ready-for-qa`, main push, unknown/shared/configuration/dependency change | Every Playwright/axe case in the existing two shards | protected `validate` |
| Missing/inconsistent diff or failed classifier | Full or failed gate; never Fast authorization | no successful release proof |

Both routes retain lint, typecheck, all unit/contracts, workflow static checks,
production/development dependency audits, Vercel build, performance budgets and
the frozen sandbox boundary. Fast and Full browser jobs are mutually exclusive
for one event. The complete browser command, configuration, assertions, retries,
timeouts, workers, existing skip and artifacts remain unchanged. Fast selects
existing specs through validated argv, not shell text from PR/Issue content.

The impact policy runs from the PR's reviewed base. The first policy PR and any
policy/infrastructure change run Full. The initial map covers modified Markdown,
individual existing E2E specs and three weather presentation files; everything
else conservatively requires Full. New/deleted/renamed files require Full.
External actors/forks never qualify for Fast or local executor authority.

The final job always runs, but is named `fast-pr-gate` for Fast and `validate` for
Full. A skipped job counts as a passing GitHub check, so there is deliberately
**no skipped protected `validate` job for Fast**. It rejects failed/cancelled/
skipped selected dependencies, incomplete mode evidence and duplicate browser
execution. Repository rulesets are unchanged.

## Automation and deployment

An immutable Owner work order remains necessary. After Fast succeeds, the local
queue keeps `ci-pending` and adds `status:ready-for-qa` once to request Full on
the same HEAD. It rechecks the work order, issue, repository, branch and HEAD;
it does not consume another implementation attempt, emit QA PASS or merge.
An existing label or already Ready PR is not repeatedly mutated. GitHub's
`labeled`/`ready_for_review` event starts Full; an unavailable event/permission
leaves work pending instead of granting QA. This is not an API-model workflow.

Queue refresh and the secretless CD preflight share `ciGateEvidence`. Overall
workflow success is insufficient: the latest exact-SHA CI must have successful
quality, both full browser shards, sandbox-boundary and `validate` jobs. Each job
must belong to that run/SHA. `filter=latest` retains successful earlier-attempt
jobs when only a failed job was rerun, without accepting another run or SHA.
Fast, missing or stale proof cannot enter the Production environment. Separate
QA must inspect the same Full proof before issuing an independent receipt.

Subscription runtime byte changes require the existing reviewed immutable
distribution installation; source files alone do not activate a local executor,
register a schedule or complete a canary. Paid/API false gates remain disabled.

## Measured baseline and retained boundaries

2026-09-08, standard hosted public-repository runners; no larger/paid runner or
new service. Values below are actual job/test wall seconds, not estimates.

| CI | quality | boundary | browser 1 job / test | browser 2 job / test |
| --- | ---: | ---: | ---: | ---: |
| [844](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34201403895) | 73 | 42 | 1364 / 1301 | 1274 / 1214 |
| [850](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34215610104) | 77 | 45 | 1359 / 1309 | 1372 / 1322 |
| [855](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34227284864) | 78 | 39 | 1401 / 1351 | 1431 / 1370 |

CI855 npm/browser setup was38/40seconds; browser report wall22.50/22.81minutes.
798cases:399desktop and398mobile+existing1skip,0failed/flaky. Before hooks sum
53/48seconds; real shared fixture UI actions556/543seconds; axe-owned steps265/
244seconds; navigation222/187seconds; fixed waits108/107seconds. These are
**non-overlapping top-level step sums across parallel tests**, not added wall time.

The fixture cost includes real region/condition/search actions, not redundant
setup. Replacing these with seeded state would remove journey coverage. Fresh
contexts and per-shard server lifecycle remain. Similar-looking contrast tests
cover different pages/states and are retained. Fast/Full separation removes the
unnecessary full-suite repetition during mapped Draft iterations.

No four-shard experiment or adoption is claimed. Current CI855 browser wall
imbalance is only18seconds; four shards need controlled wall time, total runner
time and flaky comparison before adoption. Existing two shards remain.
Lossless artifact compression comparison saved1.7seconds CPU but added3.1MB
transfer, so changing compression was not justified. Existing static asset
responses advertised keep-alive; the Nitro/httpxy worker connection guard stays.

## Render readiness correction

[Main CI856](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34230335695)
failed with one desktop landing-contrast flaky (398pass+1flaky); mobile398pass+
existing1skip. Trace shows the seven diagrams inside React's hidden `S:0`
streaming container while the earlier theme bootstrap already matched. Sampling
immediately after `DOMContentLoaded` measured no visible captions. The test now
requires a visible main and **all seven visible captions** before the unchanged
4.5 contrast assertions. No extra sleep/timeout, force action or retry was added.
This is observable render readiness, not a product caption removal or an allowed
flake. That failed main run and its screenshots/trace remain preserved.

The related PR records actual new Full CI, Preview, independent QA and subsequent
Production proof. The requested trusted canary must provide real Fast→Full→QA→
release evidence; fixtures and this document are not canary completion.
