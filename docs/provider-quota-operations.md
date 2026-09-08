# External provider restrictions

This document describes the #365 classification and operational-hold candidate
on 2026-09-08. Candidate implementation is not proof of deployment or activation;
exact CI, independent QA and Production evidence are recorded in the related PRs.

The machine-readable inventory is [provider-budget.json](../.wave/provider-budget.json).
It lists actual operations, configuration **names only**, official sources,
account-specific limits, fallback scope and remaining activation gates.

## Verified interpretation

| Source | Implemented distinction |
| --- | --- |
| [Public Data Portal error codes](https://www.data.go.kr/tcs/dss/selectErrCodePopupView.do) | 22 usage allowance, 23 request rate, authentication codes, unknown upstream errors |
| [Kakao REST reference](https://developers.kakao.com/docs/ko/rest-api/reference) | -10 allowance, 429 rate, access/authentication errors |
| [Kakao Mobility errors](https://developers.kakaomobility.com/affiliate/solution) | Driving provider errors remain unavailable; no invented driving geometry |
| [ODsay API reference](https://lab.odsay.com/guide/releaseReference) and [gateway-array example](https://lab.odsay.com/community/boardView?seq=471) | Documented no-path is empty; gateway authentication is an error, including array envelopes |
| [ODsay restriction example](https://lab.odsay.com/community/boardView?seq=702) | LOCKED is access restricted; it does not prove this application's plan, current counter or reset |
| [Open-Meteo terms](https://open-meteo.com/en/terms) | Free public policy is recorded separately from account-specific approval and commercial-use decisions |
| [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/) | Best effort, no SLA or unlimited-use claim; no bulk download/prefetch |

HTTP status and explicit provider envelopes are checked before adapter success
parsing. `Retry-After` seconds and HTTP-date are accepted, malformed/negative
values rejected. A known hard restriction has no invented reset timestamp.
Public error metadata never includes arbitrary provider messages or request URLs.

## Current execution limits

- Each request makes at most one HTTP attempt. There is no hidden retry loop.
- Identical concurrent calls coalesce within the warm instance. Successful data is
  not newly cached by this module; existing HTTP caches keep their original policy.
- A rate cooldown uses Retry-After first, otherwise 60 seconds–15 minutes with
  bounded jitter. Only one half-open request is admitted per provider/operation.
- Hard quota/access/authentication circuits stay closed for the warm instance.
  A cold start or deploy creates another instance: **this does not implement a
  global account circuit**. GitHub operational holds separately stop automation
  across deployments; user-facing cold-start account protection remains a limitation.
- Opaque SDK failures cannot prove quota versus authentication. Their unavailable
  state must not be presented as primary-provider success because a map fallback works.

## Automation no-loop and live smoke

The two live Production workflows share `production-provider-smoke` concurrency.
Before provider calls, a read-only job checks open `status:blocked-external`
Issues with the validated `wave-provider-hold:v1` record and GitHub Actions author.
An unresolved hold makes the verification **fail as blocked-external**, with no
live API calls; it does not manufacture a successful release check. Normal
read-only browser regression and the exact deployment recheck still execute, so
a simultaneous product defect is not hidden by the provider incident.

`check-production-apis.mjs` retains every original success predicate and all 27
checks. It allows at most **33 W.A.V.E HTTP requests** per run, including at most
six extra transient retries in total and at most three attempts per individual
transient failure. An explicit safe quota/rate/access/auth response, or application
HTTP429, stops immediately without retry. This is an application request budget,
**not a provider fan-out measurement or account-wide usage counter**. Most tests
use fixture transports and never contact external providers.

A separate `issues:write` job records only provider/operation/kind, an optional
validated Retry-After, SHA and run ID. Raw responses, authentication URLs and
error messages are never copied. Identical unresolved provider/operation holds
are reused without a new Issue or repeated comment. The ordinary Failure Router
suppresses a code-fix Issue only when trusted main workflow job/step evidence
proves a provider-only failure and successful durable recording. Unknown parser,
browser, deployment, timeout and mixed failures still enter engineering triage.

An unclassified district/theme/detail failure remains a boolean fact through
nested aggregation; private error text is not copied. All-failed groups also retain
every cause instead of returning only the first restriction. A known quota plus
another failure immediately stops further smoke calls and records the quota hold,
but produces `blocked-mixed` with `engineeringRequired:true`. Both live workflows
then fail the separate mixed-failure step. That step is outside the Failure Router's
provider-only allowlist, so the additional failure still gets engineering triage.
Pure quota retains `blocked-external`; neither outcome is a successful smoke.

The subscription executor refuses an operational-hold Issue at enqueue and claim,
including a task queued before it became blocked. Existing task generation and
attempt counts are not reset. A failure cannot buy quota, rotate a key, grant
execution, or enable a paid model path.

Recovery requires checking the actual provider account/access/reset, then resolving
the hold. There is no invented daily reset or automatic closure. The next bounded
smoke must satisfy the unchanged real success contracts; closing a hold is not PASS.
Parser/cooldown/UI defects are separate reproducible engineering tasks. Changed
executor source also needs the normal reviewed/pinned runtime installation before
any activation; writing these files did not install a runtime or schedule a tick.

## User-facing evidence and completion boundary

The unchanged live success contracts remain strict. A restricted provider must
produce a blocked external outcome, never a fake PASS, fabricated place or empty
result. Recommendation, weather and transport notices distinguish explicit
restrictions in KO/EN. Partially retrieved districts/themes retain verified places
and the missing evidence; their status is not complete/live and is not CDN-cached.
Saved places and the itinerary remain available. Opaque SDK/tile failures cannot
identify an account quota; advanced account-wide protection and canonical OSM tile
policy correction remain separately documented in the registry. The current
Production ODsay failure still requires the actual application's plan, counter,
restriction reason and reset to be checked in ODsay LAB; no key value is needed.

No paid plan/key replacement, extra quota, model API execution, schedule or
zero-touch activation is authorized by this document.
