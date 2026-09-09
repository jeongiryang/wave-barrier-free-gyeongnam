# Archive module recovery — #282

Codex, under the Owner's functional completion request. Taking an already rendered Planner offline while TravelBookArchiveAction was still downloading rejected its uncaught lazy import and replaced the entire editable Planner with document recovery. This was first observed during the separate plan-error classification tests.

Baseline72ceb50 reproduces the module failure in Korean/light and English/dark using an explicit aborted module request. Both desktop cases enter whole-page recovery instead of keeping the itinerary usable. The first attempted fixture clicked before hydration and failed during setup; the corrected baseline waits for the existing mode control to be enabled. Those initial setup failures are not product evidence.

Catch this optional archive module's rejection at its existing lazy boundary. Show a local alert that editing remains available and provide an explicit document reload for another attempt. No automatic retry, page reload, data clearing, provider call or dependency is added. A reload is not an assertion that the user is online. The current trip stays editable while the module is unavailable.

Validation on actual main a23afdd: lint/typecheck,748 unit/contract tests, Vercel build and unchanged performance budgets PASS (Planner269.96/270KiB, CSS69.90/70KiB;13 existing lint warnings). Related40 browser cases PASS1.3min: archive failure, travel book, new trip, restored exports, itinerary language and deployment recovery. The final change reuses the existing archive-control wrapper for the button's styling; afterward full quality passed again and the four affected KO/EN desktop/mobile cases passed9.0s. Fresh960px KOlight and1440px ENdark captures were visually reviewed: the local notice and46px minimum button fit with the existing itinerary controls, without the initial native-button styling.

The new cases assert no archive module request before adding a place, exactly one failed request, usable time editing to08:30, no automatic second request, no axe violation, and an explicit keyboard-triggered document reload restoring the archive action with saved1001 and08:30 intact. No real archive deletion or remote write is performed.

React review: reuse the established lazy catch/fallback pattern; no added effect, subscription or loading on initial empty itinerary. CSS, storage and successful archive behavior are unchanged. This is a preserved local candidate; own hosted CI, latest main integration, merge and exact Production are pending. Broader #282 and provider holds remain open.
