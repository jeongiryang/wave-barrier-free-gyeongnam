# Visitor forecast shortcut — #395

- REPRODUCTION: Four guided/overview × desktop/mobile browser cases fail because the visitor concentration shortcut focuses the common weather disclosure summary. The relevant forecast and impact heading is below the weather board and does not receive focus. Evidence: `%TEMP%/wave-crowd-shortcut-before.log` and retained traces.
- CHANGE: Give the visitor evidence its own `#crowd` destination, mapped to the departure stage. Open the containing disclosure and focus/scroll to the existing impact heading. Keep weather links and the general weather/visitor button at `#layers`. Hash navigation and history reopen the containing panel. A restored itinerary without a fresh plan shows an explicit unqueried forecast state without automatically searching or inventing a concentration value.
- VALIDATION: Existing 16 weather/language/keyboard/fault cases and four initial crowd cases PASS. Expanded six crowd cases PASS for pointer, keyboard, repeated activation, history, restored deep link and the general shortcut. 960/1440 px captures were visually inspected. Fresh lint (13 existing warnings), typecheck, all 708 unit tests, build:vercel and unchanged performance budgets PASS.
- FAILED CHECK: Initial typecheck caught the general shortcut passing a mouse event into the new target parameter. Its handler now passes `layers` explicitly, and the final browser tests verify that control as well.
- LIMITS: No provider quota, new provider request, forecast calculation, CSS or snapshot privacy changes. Existing nearby-enrichment behavior on opening the panel is preserved. Latest-main integration, hosted CI and Production verification remain pending after the current deployment and preceding function PR.
- EVIDENCE: `%TEMP%/wave-crowd-shortcut-fixed.log`, `wave-crowd-shortcut-history.log`, `wave-crowd-shortcut-final-*` and the corresponding output directories.

## Latest-main validation — 2026-09-10 KST

- Integrated main 013b3b680e8ee526f45336464e198aae656ca8b9 (#406) by normal merge. Restored export guards remain included.
- Fresh lint (13 existing warnings), typecheck, all 733 unit tests, build:vercel and unchanged budgets PASS. Planner 269.55/270 KiB gzip; CSS 69.82/70 KiB.
- All 22 crowd and weather/language/keyboard/fault browser cases PASS (36.0s), including repeated activation/history, restored no-query state and general weather shortcut. 960/1440 captures re-inspected.
- Evidence: `%TEMP%/wave-crowd-main406-*.log` and `%TEMP%/wave-crowd-main406-output`. No source edits during browser run.
- Hosted CI, merge and exact Production validation remain pending. No new live provider operations, forecast certainty or overall Release GO is inferred.
