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

### First combined Preview and follow-up

- Candidate `443c5760b5e983632371a1dc7300bff7d69b8d46` deployed to Preview
  [6310242023](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/deployments)
  at https://wave-barrier-free-gyeongnam-oas2fwvxa-jeongiryang-projects.vercel.app
  (Vercel `DyqbbhujAypPLGyzsADisF4U64yL`, ready 2026-09-07 13:59:40 UTC).
- Signed-in browser: real KTO search returned five recommended Changwon places;
  saved Daesan Flower Land and Junam Reservoir. Two dated places and two matching
  destination map markers, two ordered journey legs, transport select present.
- The actual car query returned zero of two confirmed journeys; ODsay displayed an
  upstream-error notice and the main map used its alternative. This is failure
  recovery evidence, NOT live Kakao/ODsay success. The direct API browser tab was
  blocked by the browser client; no authentication/protection bypass attempted.
- At 320px, the region dialog displayed all three choices without horizontal
  overflow. Escape restored the Hadong trigger; both existing places remained.
  KO-to-EN retained the itinerary and showed English ODsay guidance. Recommendation
  evidence correctly became stale because locale is part of its search signature.
- English add-region retained both places and dates; new-trip reset locked the
  empty itinerary, persisted Jinju after reload, and preserved the separately
  archived two-place Changwon trip. Reopening that archive in guided mode exposed
  another navigation defect: the app returned to preferences despite restoring
  places. Restore URLs now target `#itinerary`; a new desktop/mobile guided-flow
  test requires direct itinerary visibility and an explicit missing-coordinate
  notice. Existing no-coordinate archive assertions are retained unchanged.
- Found a language-boundary defect in this Preview: English planner headings and
  controls inherited document `lang=ko`. The follow-up sets the planner main's
  language to the selected locale and explicitly marks original-language journey
  endpoint names. New inherited-language and original-name assertions accompany
  the existing light/dark, 320/960/1366px browser cases. The global Korean fallback
  for other partially translated pages remains unchanged. Real screen-reader
  speech has not been verified.
- [CI805](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34129957939)
  on `443c576` finished: desktop356 PASS, mobile355 PASS/existing1skip,
  fail0/flaky0. Quality stopped before checks when the pinned actionlint download
  returned HTTP504, so aggregate validate correctly failed. The language and
  guided-restore follow-ups require a fresh full run; these browser results are
  not attributed to the later HEAD.
- GitHub marked stacked #342–#345 and #348 Merged when their base histories gained
  their HEADs. This is inclusion in the RC, not main/Production deployment.

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

## CI806 performance regression

- `f87294035172b2ba9fcdab520c0a8631d00bd1e9`, run34131988536: workflow static checks, both dependency audits, lint, typecheck, unit/contract549 and Vercel build passed. Quality then failed because CSS gzip measured70.01KiB against the unchanged70KiB budget. Browser shards were still running when this fix was prepared.
- Removed eleven obsolete rules for the retired `hero-proof`, `hero-noise` and `map-halo` classes from `landing-explorer.css` and their responsive overrides in `place-dialog.css`. Repository source search found no rendered or dynamic references; current `LandingHero` uses `landing-hero`, `WaveField` and the four-step journey summary. No active component styling or budget was changed.
- `git diff --check` passed. Exact post-build size and complete browser/axe regression require the fresh CI; no host repository npm execution was used. No assertion, locator, skip, worker or timeout was changed.

## Guided restoration hydration race

- CI806 completed with desktop356 PASS/1FAIL and mobile355 PASS/1FAIL/existing1skip; neither shard reported flaky tests. The same new archive-restoration case failed twice per project at the unchanged visible itinerary assertion. Error context showed the saved count was1, while guided mode still displayed preferences.
- Root cause: `useJourneyProgress` interpreted the initial pre-storage saved count0 as an empty trip and replaced the URL-requested itinerary stage with conditions. Appending `#itinerary` alone was insufficient. The redirect effect now waits for both criteria and trip storage readiness. A truly empty hydrated trip still redirects to a permitted stage; no completion flag is granted by restoration.
- Added four KO/EN hook regressions for pending storage, restored places without a recommendation search, and genuinely empty itinerary/departure links. The existing desktop/mobile browser assertion remains unchanged and must pass in the next full run. No delayed forced-focus restoration or timeout increase was added.
- Read-only Production check at2026-09-07T14:26Z: deployment6278499275 remains34e6021265b16d046dca24feaa3ec2101fc977e2. Health reported configuration ready; route response contained a configured Kakao alternative but ODsay state error. This is not a full Production transport PASS. Signed-in Vercel logs for443Preview confirmed Kakao/ODsay outbound calls, configured=false and one unverified alternative; Preview auth/get-session also returned503. Exact upstream failure reason remains unconfirmed. Connected Vercel app inspection was403 due to scope authorization; no credential or protection change attempted.
# Follow-up: saved public place locations, 2026-09-07 15:10 UTC

- CI808 at e6dc25961a54fec320e2611d3a09db83693e5a49 succeeded: unit553, desktop357/mobile356 PASS, existing mobile skip1, fail0/flaky0. Quality includes lint/typecheck/build, both audits0, CSS69.80KiB and planner269.75KiB under unchanged limits. https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34134054194
- Exact Preview6310972273 (6imphawat) was checked using the existing signed-in Vercel browser: real KTO5, save2, dated2/map2, archive restore directly opens the itinerary. EN320 dark/reduced-motion region Cancel/Add/New preserves or resets as selected, Escape returns focus, overflow0; observed console capture returned no errors. This does not prove anonymous Preview access, live ODsay success or full console history.
- Restoration deliberately strips coordinates from the archive. The two restored places therefore had no route/map recovery action. Worse, blank strings were converted to numeric zero in visit-order distance calculations, showing a 240-minute straight-line estimate from Korea to null island.
- Candidate correction: reject blank/outside-service coordinates for distance estimates; keep archive privacy assertions intact. A user-initiated public content-ID lookup restores only verified matching coordinates to the current trip catalog. Provider error, official empty, missing coordinates and invalid responses stay distinct. It does not rerun recommendations or refresh facility evidence. At most3 requests are concurrent, with a20-second overall deadline; leaving/changing the trip aborts and invalidates the response. The activated button stays mounted after success.
- Added provider contracts and KO/EN320 browser cases for recheck, focus, dates, archive privacy, reload, empty/error/wrong-ID retry and late-response/new-trip invalidation. These additions are NOT validated yet at this checkpoint; only git diff --check/static review ran on the host. Repository npm scripts remain reserved for disposable credential-free CI.
- #289 ea10705 CI807 is green, but independent review5133081079 found aggregate writable-workspace quota P1. It remains blocked-sandbox; no queue tick, model/API workflow activation, scheduler registration, main merge, Production deployment or008 migration.
