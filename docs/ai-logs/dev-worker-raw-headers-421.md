# Restore the development worker connection policy — #421

- Author/tool: Codex, under Repository Owner implementation/merge/deployment authorization.
- Purpose: unblock main #419 CI34412755713 without weakening checks. Current Production remains verified #415 until a new main passes its complete pipeline.
- Failure evidence: mobile shard3, nearby light viewport case. At22:34:40Z /planner returned HTTP500 read ECONNRESET before product interactions. The45s timeout was waiting for a control on that failed document, not a slow category assertion. Trace, screenshot and error context were inspected and preserved under the temporary wave-419-mobile3-artifacts folder. No exact reusedSocket flag was present in the CI trace.

## Cause and change

Installed srvx NodeRequest reads req.headers for a direct lookup but builds iterable Headers from req.rawHeaders. Nitro/env-runner/httpxy forwards through that iterable representation. The existing serve-only middleware changed headers.connection only; the actual worker hop still received keep-alive.

Baseline2606a25 adds an actual TCP ingress → NodeRequest → httpxy → worker contract. Before the fix, all three GET/POST/GET requests reached the worker with keep-alive instead of close (one failed, two existing tests passed). Normalize only Connection in rawHeaders as well. Missing, duplicate and mixed-case Connection values receive one close value; all other raw headers and WebSocket upgrades remain intact. No request retry, timeout increase, hidden error, disabled overlay, dependency change or Production server change.

## Validation

- Four focused contracts PASS: actual worker connection separation, original methods/URL/POST body/custom headers, absent/duplicate headers, WebSocket upgrade preservation, genuine500/error body and one request without retry.
- Full lint, typecheck,748 unit/contract tests, Vercel build and unchanged performance budgets PASS: Planner269.96/270KiB, CSS69.90/70KiB;13 existing lint warnings.
-36 nearby browser cases PASS56.0s. The original light viewport case passes three repetitions on each device (six cases,26.8s). Browser retries, workers, timeout and assertions are unchanged.
- No product rendering is changed; the actual CI failure screenshot was inspected. Exact hosted HEAD CI, merge and Production are pending and will be recorded on the PR. A passed rerun alone does not close421.

## Boundaries

The real forwarding contract demonstrates the missing connection policy; it does not prove the precise TCP-close timing of the original CI incident. The correction is confined to Vite serve. Existing immutable bootstrap, provider holds, storage, Production CD and security boundaries remain unchanged. The Owner waived review-count waiting, not failed or pending CI. #419 feature implementation must still be verified on actual Production; #420 waits for this repair.
