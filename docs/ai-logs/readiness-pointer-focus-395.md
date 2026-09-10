# Readiness pointer focus — #395 / #432

Owner authorized tested merges and per-PR Production verification. PR431 CI34426193240 exposed an overview crowd shortcut flake. Its captured trace shows a link near the viewport bottom, a completed pointer action, unchanged #places URL and a closed evidence disclosure. The issue is reproducible on actual main430574c8e4aef16f64616cb0e61a6358a73e424a6e7: baseline5ce3445 holds a real pointer press across two rendering frames at the viewport edge and fails on both browser projects.

The readiness hook cancels following on pointerdown, but its next focus event rearmed the animation-frame centering between press and release. Suppress rearming during a pointer press, and clear that flag on pointerup/cancel. Keyboard focus and late-layout following retain their existing behavior. No delay, retry, focus assertion, test budget or API/storage boundary is changed.

New two browser cases and existing crowd6/departure-language22/refresh8 PASS38 total52.1s. These include keyboard links, browser history, focus retained during slow loading and manual scrolling away. Full lint/typecheck,756 unit/contract tests,Vercel build/performance PASS (Planner269.28/270KiB,CSS69.90/70KiB). Latest main ancestry rechecked. No displayed design change. Hosted CI and this PR's exact Production verification follow.

CI431's separate photo test flake was traced to scrolling the lazy photo fallback as it was replaced by its loaded component. That test synchronization follow-up remains separate; this PR does not claim to close432 or all395. ODsay372 remains held and full Release GO is not claimed.
