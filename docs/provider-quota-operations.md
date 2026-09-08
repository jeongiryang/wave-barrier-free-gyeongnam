# External provider restrictions

This document describes the first #365 implementation slice on 2026-09-08, not
a claim that all automation or live-provider gates have passed.

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
  global account circuit**. An operational hold and automation no-loop policy must
  be completed before activation.
- Opaque SDK failures cannot prove quota versus authentication. Their unavailable
  state must not be presented as primary-provider success because a map fallback works.

## Completion boundary

The unchanged live success contracts remain strict. A restricted provider must
produce a blocked external outcome, never a fake PASS, fabricated place or empty
result. The remaining work is truthful notices, durable automation holds, enforced
live-smoke budgets, SDK/tile checks and exact CI/QA/deployment evidence. The current
Production ODsay failure still requires the actual application's plan, counter,
restriction reason and reset to be checked in ODsay LAB; no key value is needed.

No paid plan/key replacement, extra quota, model API execution, schedule or
zero-touch activation is authorized by this document.
