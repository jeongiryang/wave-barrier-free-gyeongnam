# Start a new trip from the travel book — #388

- REPRODUCTION: The footer's New trip link returned to /planner with the existing saved place and dates. The new desktop/mobile cases both fail with one retained place instead of an empty itinerary. Evidence: `%TEMP%/wave-travel-book-new-before.log`.
- CHANGE: Use an explicit action. If the active itinerary contains places, show a native modal confirming that the current editor will be emptied while archived trips and notes remain. On confirmation, atomically replace only the current-trip record with empty selections and current dates, then open the planner conditions. No saved places means no unnecessary confirmation. Failed reads/writes are visible and do not navigate or discard the old trip.
- ACCESSIBILITY: Reuse the existing modal focus/Tab containment/Escape recovery and travel-book button styles. Hydration disables the action until ready. Light/dark axe checks caught a 2.47:1 cancel-button contrast gap; the existing dark action style now covers buttons as well as links, and both modes pass after repair.
- VALIDATION SO FAR: 12 desktop/mobile browser cases passed for new trip, cancel, Escape/focus return, failed atomic commit, archive byte preservation and existing travel-book restore/notes behavior. 960/1440 light/dark modal captures inspected. All 722 unit tests, lint (13 existing warnings), typecheck, build and unchanged budgets passed before the last visible-error/date-assertion refinement.
- PENDING: Rerun final source checks after latest-main integration, then hosted CI, merge and exact Production. This log does not claim the implementation deployed or all #388 requirements complete. No actual public write or provider API call was made.

## Final local source on main #405

- Normal merge of 6184a321ae62be82ba867f773f35891ae557c204; final visible storage-error handling and date assertion are included.
- 12 desktop/mobile travel-book tests PASS (14.6s), including light/dark axe, cancel/focus return, blocked atomic commit and existing archive/restore behavior. `%TEMP%/wave-travel-book-new-main405-browser.log` and output directory preserve the evidence.
- Fresh lint (13 existing warnings), typecheck, 733 unit tests, build:vercel and performance PASS (`%TEMP%/wave-travel-book-main405-*.log`). Planner 269.38/270 KiB, CSS 69.83/70 KiB gzip.
- Ready for its separate PR after higher-priority pending exports and shortcuts. No hosted CI or Production completion is claimed yet.

## Main #407 verification
Normal merge bcab49c included restored exports and crowd navigation. Fresh733 unit tests, lint (13 existing warnings), typecheck/build and unchanged performance budgets passed (Planner269.61/270 KiB, CSS69.83/70 KiB). All12 travel-book browser cases passed21.7s. Hosted CI/merge/Production remain pending.

## Main #410 verification
Normal merge4667b6d, fresh733 unit tests/lint/typecheck/build/performance PASS. All12 travel-book browser cases PASS16.8s. Archived book bytes, cancel/Escape/focus and failed current-trip commit are preserved. Hosted CI/merge/Production pending; next integration includes the activity-restoration PR before submission.
