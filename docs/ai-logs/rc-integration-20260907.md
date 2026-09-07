# PR #334 product integration checkpoint

- PR: https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/334
- Executor: Codex Engineering; implementation evidence, not independent QA approval.
- State: Draft integration candidate; no merge, Production deployment or migration.
- Baseline main: `34e6021265b16d046dca24feaa3ec2101fc977e2`.
- Original RC: `c1bae6f80f58fb2ec58d7e00160ad7869f2bdeef`.

## Included source changes

| PR | Source HEAD | Purpose |
| --- | --- | --- |
| #348 / #347 item 4 | `8635569ca80a9114d4fce9c50fd67d0d3368efa5` | Explicit add/new/cancel region boundary, atomic current-trip reset, late location callback invalidation |
| #342 | `d568a855fb6e9782b3e95a4717677379fb6e7f14` | Preserve search and route-query keyboard focus |
| #343 | `4c46f29393eb68e4d108aba19a29745c676fa990` | Official-photo fallback and region names |
| #344 | `072607d0eba71d5fe27660e1c828d11794ba92f2` | Map language and keyboard cancellation state; ancestor of #345 |
| #345 | `8a7813c6de342cb6dda6feb20923c8090b86cc34` | Locale-aware location consent |
| #338 | `cfdd86726676cf3c427fcfc8328d2b7063d27360` | Validate ODsay requested endpoints, walking connections and intercity completeness |

Source branches and all original worktrees were preserved. Local merge commits are
`fdf828c`, `b67037f`, `54d09e4`, and `2331832`. This is a fast-forward update to the
existing RC history, not a replacement PR or rewritten source history.

## Integration decisions

- Resolve location-hook conflicts by retaining both the locale-aware consent and
  the generation guards for delayed success/failure callbacks. Reset still clears
  private origin and restores the initial live notice.
- Preserve the RC's quality job, both browser shards and fail-closed aggregate
  `validate` check, including both dependency audits and credential-free checkout.
- Preserve bilingual route results while exposing distinct ODsay failure reasons
  in Korean and English. Only app-authored status messages are translated; raw
  upstream text does not become user guidance.
- Extend the delayed-location reset fixture to both locales and assert the consent
  locale. Extend all four transit browser cases to switch language without another
  route request and retain the original no-confirmed-option assertions.

## Verification boundary

- `git diff --check`: PASS before commit.
- No repository npm command was run on the credential-bearing host. The existing
  disposable CI jobs must validate this exact combined HEAD after push.
- Earlier source PR CI success is historical evidence only: #348 CI795 and #338
  CI796 do not validate this final combination.
- No new skip, assertion removal, timeout increase, worker reduction or budget
  increase was used. #345's earlier browser resource failure requires fresh evidence.
- Same-HEAD Preview, full regression and independent `wave-ai-qa:v2 PASS` remain
  required. No review thread is resolved merely by this implementation log.

## Outstanding checks

- Archived-trip restoration currently needs investigation: public coordinates may
  be omitted by archive serialization, unlike current-trip reload. Verify restored
  itinerary/map consistency without inventing coordinates.
- #289 remains blocked-sandbox. CI804 at `60896f64` passed normal validation but
  failed full application execution in the sandbox; artifacts require analysis.
  Its latest candidate is not included by this product integration checkpoint.
- Preserve the original #289 dirty ten files, #294 attempts/generation/receipt and
  all pre-existing browser artifacts. No actual queue tick or API model workflow.
- Preview anonymous-access restriction, independent QA, required human reviews and
  the unapplied 008 migration prerequisites remain separate gates.
- #341 is a design document, not implemented landing work. Post-RC #350–#354 are
  outside this stabilization change.
