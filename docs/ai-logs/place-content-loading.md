# Deferred place detail content — performance preservation

- During departure facility work, the unchanged 270KiB Planner initial JavaScript budget failed at270.16KiB. The existing modal already renders only after an explicit place decision, so its secondary evidence, public stories and correction content now load through a separate module only on opening.
- Native dialog, title focus, close/Escape/Tab handling and the primary Add/Remove itinerary action remain synchronous. A failed content chunk shows a local alert and retains these actions. Existing nested-module fallback behavior remains.
- Full lint13 warnings/typecheck/739 unit tests/build and unchanged budgets PASS:269.68KiB Planner initial JS,69.87KiB CSS. The source-contract tests now inspect the extracted module too; assertions and reachability checks were retained.
- All42 related browser cases PASS1.1min:16 facility evidence,12 existing departure/route cases,4 deferred-content success/failure and10 existing place-decision cases. Confirms no content request before opening, initial focus, failure recovery, Escape focus return and successful itinerary addition.
- This is local evidence, not hosted CI or Production. Shared extraction can accompany the departure repair if its latest-main build requires it.
