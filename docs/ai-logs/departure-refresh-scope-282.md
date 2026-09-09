# Departure refresh scope and pending state — #282 / #280-R08

The departure action starts the existing weather reload and, when region/theme/facility criteria permit, a place search. It previously claimed a general latest-information check and stopped showing pending as soon as the faster place search finished, even while weather was still pending.

- Baseline3bb5cda initially failed because test setup incorrectly expected an Open-Meteo source label from a generic fixture. That was a test error, not evidence of a product defect. Corrected baseline bcae749 waits for the actual initial weather response. It then reproduces four genuine desktop/mobile failures: two early aria-busy=false states and two overly broad labels with no facility preferences.
- Derive pending from the existing place/weather loading state as well as the local request guard. Keep keyboard focus and reject duplicate Enter while either source is pending. No API, cache or hook request lifecycle changed.
- Label the action as places-and-weather or weather-only according to current place-search criteria. Without a region, the button tells the user to choose one and is disabled. Saved places and exports are unchanged.
- Full lint/typecheck,747 unit/contract tests, Vercel build and existing performance budgets PASS: Planner269.72/270KiB, CSS69.90/70KiB;13 existing lint warnings. All94 related browsers PASS2.9min (refresh8,departure-language22,search-result-focus40,facility16,route8). After adding capture-only checks, the eight refresh cases PASS10.2s again.
- Visually reviewed actual960px Korean/light and1440px English/dark captures. The scoped action and retained focus are readable and within the viewport. The tall960px readiness section extends above the viewport behind the existing sticky header; this capture validates the action area, not every obscured heading.
- React review: derive pending from existing state; no extra effect, request, subscription, dependency, storage mutation or polling. Native disabled is limited to missing region so pending interactions retain focus.

This is a preserved local follow-up on arrival6047a11. Latest actual main/arrival integration, hosted CI, merge and exact Production validation remain pending. Per-source stale-data preservation and the full #282/#280-R07 requirements are not completed by this change.
