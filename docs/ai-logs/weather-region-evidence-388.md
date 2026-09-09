# Weather response region — #388 / #277

- Baseline1cf48a5: valid Changwon weather is accepted for a Jinju request. Two desktop/mobile browser cases also reproduce wrong-region data appearing on the requested destination's weather board instead of the unavailable/retry state. These are deterministic response-integrity fixtures, not evidence that a current provider is returning wrong regions in Production.
- The existing response parser now checks the requested region, passed by useRegionWeather after its existing cancellation/generation checks. A different-region response stays unavailable and can be retried independently. No provider call, cache duration, forecast values, selection or itinerary mutation was added. The generic API fixture now returns the requested region; the explicit mismatched fixture remains wrong for the regression.
- Official server resolver retains 경남 전체 as a supported region; exact response identity therefore preserves that existing case too. This change does not claim a province-wide weather forecast or invent local conditions.
- On main #414 (`680cd64`), source `0c95a54` plus normal integration `1a23055`: lint (13 existing warnings, no errors), typecheck, all 737 unit tests, Vercel build and unchanged performance budgets PASS. Planner initial JavaScript 269.83/270 KiB; CSS 69.90/70 KiB.
- All 32 targeted browser cases PASS (weather 18 and region boundary 14, 1.5 minutes). Wrong-region failures now remain unavailable and an explicit retry restores the matching forecast without losing saved places. Existing light/dark keyboard, overflow and axe checks cover widths 320–2560; desktop/mobile rendered weather captures were reviewed. No new layout was introduced by this response check.
- Hosted CI, final latest-main integration, merge and Production remain pending. No full #388 or #277 closure; source freshness is a separate remaining requirement.

## Main #417 verification
Normal merge of main616c90a. Fresh737 full unit/contract, lint13 existing warnings, typecheck/build and unchanged budgets PASS (Planner269.84KiB, CSS69.90KiB). All32 weather/language/error/retry/region-boundary browser cases PASS1.4min. Latest-main integration after the queued departure PR, fresh checks, hosted CI and exact Production remain pending.

## Main #415 regression verification
Normal integration of e2254c9. Fresh740 full unit/contract, lint13 existing warnings, typecheck/build and unchanged budgets PASS (Planner269.48KiB, CSS69.90KiB). All40 related browser cases PASS1.9min (weather18, region-boundary14, departure-route8). This branch remains locally prepared; integrate later merged field/arrival fixes and revalidate before its PR.

## Main #420 verification
Normal integration of d21258c569b50afd6acafa58978e22734ae25dad. Fresh lint/typecheck, all750 unit/contract tests, Vercel build and unchanged performance budgets PASS (Planner269.67/270KiB, CSS69.90/70KiB). All40 weather/region-boundary/departure-route browser cases PASS1.7min. Later actual main and hosted CI will be verified before merging this bounded response-identity fix.
