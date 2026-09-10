# Establish an actual edge target before the pointer regression — #437

Owner authorization covers deployment/CI repair and tested merging. Codex inspected the hosted failure, corrected the test preparation, ran a negative control and local checks, and prepared this repair. This log is not a Production or full Release GO claim.

## Failure and correction

Main CI34431689442 on e8269485a05b132250de1a9f7dfcf71cc0b45615 marked the mobile readiness-pointer-focus case flaky. Its configured retry passed, and fail-on-flaky correctly blocked validate and CD34432368762. Other jobs passed. The one skipped case is the existing desktop-only planner-product-flow multi-viewport representative. Current Production remains the previously verified PR #431 release.

The preserved trace records mouseMove call7417 at x684.25/y1057.265625 before mouseDown7419, with a1440x960 viewport. The final screenshot was inspected and places the target below the visible area. Late itinerary layout can change during setup; this occurrence clicked outside the viewport before testing a press/release interaction. No new Production product regression is claimed from it.

Before pressing, the test now aligns the target to the viewport bottom, uses hover actionability, confirms elementFromPoint hits that target, and checks its captured bounds are on screen at the edge. Bounded setup polling does not repeat the press or outcome assertions. The original real mouse down, two animation frames, mouse up, open-details, focused-heading and URL assertions remain. No product source, global timeout, retry, fail-on-flaky, skip, worker, axe or performance-budget change.

## Verification

The preliminary setup correction passed ten fresh desktop/mobile contexts in13 seconds. A negative control then temporarily used the actual pre-#433 focus hook from main #430 (574c8e4): both desktop/mobile cases reached the press and detected the original open-details failure. The current hook was restored byte-for-byte in finally; matching SHA256 is7014985802DD30082071FE175256023BD004B6C526953A509C26DA609D122280. This demonstrates the stronger preparation still catches the focus-scroll defect.

Final lint/typecheck, all762 unit/contract tests, Vercel build and performance budgets passed (Planner269.34/270KiB, CSS69.90/70KiB). All30 related pointer/departure-language/crowd-shortcut browser cases passed in44.5 seconds, including late-layout keyboard focus and intentional manual scrolling. Products and screenshots rendered by the test are unchanged; the hosted failure screenshot and trace supply the visual diagnosis.

Logs/artifacts are preserved under the local temporary wave-434-main-mobile3, wave-434-pointer-trace, wave-pointer-layout-negative-output and wave-pointer-layout-final-output paths. #437 triage: https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/437#issuecomment-5612119601 . #435 remains open pending Production. Required next steps are this repair's complete hosted CI, merge, own main CI/CD and canonical Production verification including #434. PR #436 stays held and must incorporate the actual repaired main before merging. The previous failed main run is not rerun as a substitute for correction.
