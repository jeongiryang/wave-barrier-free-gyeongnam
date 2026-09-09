# Deterministic album clock setup — main CI after #401

- REPRODUCTION: Main CI `34385776274`, desktop browser shard 2, fails the album timing case with `clock.pauseAt: Cannot fast-forward to the past`. Its retry passes, so the unchanged fail-on-flaky gate correctly rejects the run and CD `34386663747` is skipped. The APT installation repair succeeded in every job; this is a separate test-clock race.
- ROOT CAUSE: The test reads browser `Date.now()`, adds only 100 ms, then sends another browser command. A busy runner can exceed that interval before `pauseAt` executes.
- CHANGE: Install a fixed clock origin before navigation, allow hydration normally, then pause one simulated hour later while the album is still offscreen. This is beyond the unchanged 45-second test deadline and independent of command latency. After scrolling, tick the same 100 ms explicitly before interaction.
- PRESERVED: Every assertion, including 3,999 ms without photo advancement, the final 1 ms boundary, all album photographs, region transition and exact links, no storage mutation/API calls, reduced motion, keyboard behavior and all 18 destinations. No product source, timeout, retry, fail-on-flaky, skip, budget or workflow change.
- VALIDATION: All 10 cases in the affected browser file PASS on desktop/mobile. Fresh lint (13 existing warnings), typecheck, all 708 unit tests, build:vercel and unchanged performance budgets PASS. Hosted CI remains pending; Production deployment is not claimed until exact-SHA CD succeeds.
- EVIDENCE: `%TEMP%/wave-401-main-ci-failed.log`, `%TEMP%/wave-clock-fixed.log`, `%TEMP%/wave-clock-fixed-output`.

Reference: [Playwright consistent time and timers](https://playwright.dev/docs/clock#consistent-time-and-timers), [failed main CI](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34385776274).
