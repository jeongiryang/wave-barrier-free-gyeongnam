# Share and calendar after itinerary restoration — #388 / #395

- REPRODUCTION: All four desktop/mobile × reload/archive browser cases restore the saved place, assigned date and start time, but both share and calendar controls remain disabled. The initial search count stays at one. Evidence: `%TEMP%/wave-restored-export-before.log` and retained failure traces.
- ROOT CAUSE: Client controls and the sharing hook require the in-memory recommendation response, which does not survive restoration. The existing server already stores selected public place IDs, dates, order and selections; it does not need that response.
- CHANGE: Share the current immutable selections and public place IDs without posting the unused plan object. Reject an empty selection, and enable export for restored saved places. Existing outside-date sharing, past-trip calendar, same-origin URL, stale-response, request deduplication, clipboard fallback and no-coordinate persistence boundaries remain intact. Restoring an itinerary does not trigger another search or pretend to have fresh provider/review evidence.
- VALIDATION: 16 browser cases PASS, including both restored flows, shared snapshot editing, obsolete-response rejection, clipboard failure/retry and departure/calendar checks. The four restored cases also PASS after adding explicit focus and reveal-opacity checks for usable 960/1440 px captures; first captures were blank and were not accepted as visual evidence. Corrected captures were inspected. Lint (13 existing warnings), typecheck, all 708 unit tests, build:vercel and unchanged performance budgets PASS (Planner 269.07/270 KiB, CSS 69.82/70 KiB gzip).
- EVIDENCE: `%TEMP%/wave-restored-export-fixed.log`, `%TEMP%/wave-restored-export-rendered.log`, `%TEMP%/wave-restored-export-rendered-output` and `wave-restored-export-quality-*.log`.
- LIMITS: Latest-main integration, hosted CI and Production verification remain pending while deployment repair #403 takes priority. This does not change criteria restoration policy, claim fresh provider availability, grant reviewed progress, or complete all #388/#395 reports. Browser share requests are test fixtures, not real public writes.

## Latest-main validation — 2026-09-10 KST

- Integrated main 6184a321ae62be82ba867f773f35891ae557c204 (#405) by normal merge.
- Fresh lint (13 existing warnings), typecheck, all 733 unit tests, Vercel build and unchanged budgets PASS: Planner 269.33/270 KiB gzip, CSS 69.82/70 KiB.
- All 16 related browser cases PASS (37.9s), including reload/archive exports, immutable snapshot changes, obsolete response rejection, clipboard recovery and actual ICS content/download. 960/1440 restored-share renders inspected.
- Evidence: `%TEMP%/wave-restored-main405-*.log` and `%TEMP%/wave-restored-main405-output`. Source frozen during browser run.
- PR/hosted CI, merge and exact Production verification pending. No real public trip was written in these fixtures; provider availability and overall Release GO are not inferred.
