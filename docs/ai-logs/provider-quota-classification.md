# Provider failure classification — #365

- Author: jeongiryang; implementation/fixture verification: Codex subscription.
- Base: `fd44f7392ae8c62dbe4b178141bdfb05076041e3` (2026-09-08).
- Status: first implementation slice, not automation activation or Issue completion.

## Change

Eight server HTTP call sites covering nine provider identities now use a shared
request boundary. It classifies explicit HTTP/envelope restrictions without
retaining upstream messages, authenticated URLs or key values in public metadata.
Public-data code 22, code 23, Kakao -10, ODsay gateway arrays and Retry-After are
handled separately from normal empty results, authentication failures and timeouts.
Unknown provider codes or reset times are not invented.

There are no automatic HTTP retries. Identical in-flight calls coalesce; a known
restriction blocks repeat calls within the same warm server instance. Rate limits
admit one half-open request after Retry-After or bounded exponential cooldown.
This is **not** a distributed account quota counter. Restart/cold-start limitations
remain explicit in `.wave/provider-budget.json`.

The registry maps actual server operations and browser SDK/tile dependencies.
`loadLane` has no runtime caller in this source, despite the historical Issue list.
Account-specific limits remain `ACCOUNT_SPECIFIC`; ODsay account plan/reset is
unverified. No live provider calls were made for these fixture tests.

## Validation

The real-adapter test exposed an ODsay malformed error-array/HTTP429 precedence
bug; the classifier was corrected, not the assertion. Existing route integrity
test harnesses load the new real dependency; endpoint, geometry, zero-minute walk
and intercity integrity assertions are retained.

Local validation at the final code tree: `npm test` 673 PASS, 0 failed/skip;
`npm run lint` 0 errors with 2 pre-existing warnings; `npm run typecheck` PASS;
`npm audit --omit=dev` 0 vulnerabilities; `npm run build:vercel` PASS;
`npm run check:performance` PASS (CSS 69.96/70 KiB, planner 269.97/270 KiB gzip).
Full browser/axe is still running as this log is written; final counts and exact
commit/CI/Preview will be linked in the PR. It has not been replaced by fixtures.
No tests/assertions removed, no new skips, no timeout/worker/retry/budget changes.
Existing user changes, queue generations, pinned runtimes and artifacts preserved.

## Remaining #365 gates

- Propagate partial provider failures and expose truthful KO/EN notices.
- Persist operational holds across automation runs; prevent quota-to-code-fix loops.
- Enforce low live-smoke request budgets and classify restricted runs as blocked,
  never successful verification; preserve all existing success predicates.
- Check opaque browser SDK/tile error visibility and tile policy alignment.
- Complete full CI, independent QA, exact Preview and controlled Production evidence.

No runtime install, scheduler registration, canary or paid model/API path is enabled.
#368 measured Fast PR/Full Release separation follows the minimum #365 gate;
successful trusted canary then precedes actual #353 design work.
