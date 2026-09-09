# Route measurements and itinerary arrival time — #347 / #388

- SCOPE: Resume the preserved `fix/route-measurement-integrity-347` work in its existing worktree after the Owner authorized functional completion. No existing WIP, branch or checkpoint was discarded.
- REPRODUCTION: An offline raw response of 8,229 metres in 60 seconds was previously accepted as a confirmed one-minute car route. Separately, the schedule converts a valid 301-minute route into 240 minutes; two new regression cases fail with 14:00 instead of 15:01 and +1 day 03:00 instead of 04:01. Pre-fix evidence is `%TEMP%/wave-route-schedule-before.log`.
- ROOT CAUSE: The provider adapter checked positivity without validating the documented integer seconds/metres or their consistency. The itinerary applied the four-hour estimate cap to already-confirmed provider results.
- CHANGE: Require positive safe integer measurements, reject a road distance substantially shorter than its geometry (5%/100 m tolerance) and grossly inconsistent car speeds above 200 km/h. This is a corruption guard, not a legal speed limit or a fabricated replacement estimate. Preserve plausible short and slow routes. Keep the estimate cap for estimates only; verified integer minutes propagate unchanged through origin legs, arrivals and following visits.
- PRESERVED: Requested endpoint/road geometry validation, GPS boundary, provider state/error classification, unavailable-time fallback, external directions, explicit retry, no automatic provider retry or paid API, all previous route assertions and performance budgets.
- TARGETED VALIDATION: 70 unit/adapter/API-composition/schedule checks PASS after the two failing pre-fix schedule cases. Full latest-main quality, browser and Production validation remain pending.
- LIMITATIONS: Offline responses do not claim actual provider service availability or fix the ODsay #372 hold. Saved-trip lifecycle, calendar/share recovery and other #388/#395 requirements remain separate work.

Reference: [Kakao Mobility directions response units](https://developers.kakaomobility.com/guide/navi-api/directions).
