# Route measurements and itinerary arrival time — #347 / #388

- SCOPE: Resume the preserved `fix/route-measurement-integrity-347` work in its existing worktree after the Owner authorized functional completion. No existing WIP, branch or checkpoint was discarded.
- REPRODUCTION: An offline raw response of 8,229 metres in 60 seconds was previously accepted as a confirmed one-minute car route. Separately, the schedule converts a valid 301-minute route into 240 minutes; two new regression cases fail with 14:00 instead of 15:01 and +1 day 03:00 instead of 04:01. Pre-fix evidence is `%TEMP%/wave-route-schedule-before.log`.
- ROOT CAUSE: The provider adapter checked positivity without validating the documented integer seconds/metres or their consistency. The itinerary applied the four-hour estimate cap to already-confirmed provider results.
- CHANGE: Require positive safe integer measurements, reject a road distance substantially shorter than its geometry (5%/100 m tolerance) and grossly inconsistent car speeds above 200 km/h. This is a corruption guard, not a legal speed limit or a fabricated replacement estimate. Preserve plausible short and slow routes. Keep the estimate cap for estimates only; verified integer minutes propagate unchanged through origin legs, arrivals and following visits.
- PRESERVED: Requested endpoint/road geometry validation, GPS boundary, provider state/error classification, unavailable-time fallback, external directions, explicit retry, no automatic provider retry or paid API, all previous route assertions and performance budgets.
- VALIDATION: On main #400, 70 targeted unit/adapter/API-composition/schedule checks, all 719 unit tests, lint (13 existing warnings), typecheck, build:vercel and unchanged performance budgets PASS. Four desktop/mobile route and schedule browser cases PASS, including explicit retry from inconsistent measurements to 15 minutes, then a confirmed 301-minute route and next-day arrival. Rendered arrival rows were reviewed at 960/1440 px. Latest-main integration, hosted CI and Production validation remain pending.
- BROWSER EVIDENCE: `%TEMP%/wave-route-measurement-browser-verified.log` and `%TEMP%/wave-route-measurement-verified-output`. The first run began before the local server was ready and failed with connection refused; the following run identified an incorrect test assumption about the default transport mode. The final test explicitly selects the car mode before checking car-specific copy and retains every assertion.
- LIMITATIONS: Offline responses do not claim actual provider service availability or fix the ODsay #372 hold. Saved-trip lifecycle, calendar/share recovery and other #388/#395 requirements remain separate work.

Reference: [Kakao Mobility directions response units](https://developers.kakaomobility.com/guide/navi-api/directions).

## Latest main integration — 2026-09-10 KST

- Integrated main 299a76089b66e87193127e5241fa59d27a9aecac (#404) by normal merge in the preserved worktree.
- Fresh lint (13 existing warnings), typecheck, all 733 unit tests, build:vercel and unchanged performance budgets PASS. Planner initial gzip 269.32/270 KiB; CSS 69.82/70 KiB.
- Ten desktop/mobile browser cases PASS (21.0s): raw adapter measurements/recovery and next-day arrival, itinerary route synchronization, public origin/mode/second-leg handoff and GPS exclusion. Source was unchanged during the run. 960/1440 arrival captures inspected again.
- Evidence: `%TEMP%/wave-route-main404-{lint,typecheck,test,build-vercel,check-performance,browser}.log` and `%TEMP%/wave-route-main404-output`.
- Hosted CI and exact merged Production are still pending. Provider availability remains outside fixture evidence; ODsay hold #372 remains unresolved.
