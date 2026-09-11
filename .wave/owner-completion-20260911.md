# Owner completion scope — 2026-09-11

User authorizes continuation through design refinements, all 24 researched feature candidates, merge and Production verification. Latest Owner instruction defers the exhaustive all-click audit, repository regression analysis/refactoring, and pre-submission review to a later task. Focused checks of changed features and required CI remain. This is not authorization to submit the competition application or buy services. Korean/default theme. Keep existing data/auth/privacy boundaries. No messages to other people.

## Current stage

- COMPLETE: functional UI follow-up PR #468, `31be6b2e69234f56fecd01a97cedbdd3528974b9`. Independent QA, main CI34574038819 and Production CD34576545629 PASS. Production five-page desktop/mobile verification PASS; old CI issue #469 closed with evidence.
- COMPLETE: PR #470, `3c4089b79a90708c5ceadf84d49e1bf641e8903a`: full-bleed Eight photo scenes, Ten centered text, region film after preparation, compact sequential Planner. Independent QA, PR CI34577661837, main CI34578759862, Production CD34579711086 PASS. Five-page desktop/mobile checks PASS and one real Changwon search returned five places. The offscreen third mobile region photo loads when scrolled into view; all three photos decoded, page errors 0. Old CI issue #471 closed with evidence.
- COMPLETE: PR #472, `429565f542d9d1fd6247947e7df48792a6272636`: candidates 4/7 facility comparison and inquiry card. Independent QA, PR CI34580632760, main CI34581670628, Production CD34582611809 PASS. Production 1440/390 comparison/inquiry interactions PASS; one live Changwon search returned 5 matching places and 7 more to explore, with cached-response reuse on mobile.
- COMPLETE: PR #474, `c333a1bf32b9bda5ded541c74044a0299258adde`: candidate 9 editable visit duration, downstream schedule calculation, archive/account/share persistence. Independent QA, exact-head CI34584073506, main CI34585375495 and Production CD34586363973 PASS. Production 1440/390 preset/custom/default, recalculation, validation/cancel/focus PASS. One real plan search then response reuse; no account/share/message writes or live route calls. Evidence `D:/wave-completion-20260911/production-474-final-summary.json`; old CI #477 closed with full failure/comment mapping.
- ACTIVE: `codex/wave-opposing-region-film-353`: latest five image requests: transparent section rail, two opposing rows of nine regions, credits directly on photographs, no credit background blocks, no decorative three-bar brand mark. Focused QA fixes timer/scroll competition and mobile wrapped-credit hit targets.
- COMPLETE: frontend refinements PR #466 merged as `6aff57054f43887f77163ccb1b7a738d29129539`; main CI34570067238 and CD34570878909 succeeded. Production read-only checks on five pages at desktop/mobile: HTTP200, no page errors, Noto Sans KR, intro skip absent. Mobile search summary geometry found during visual review is handled in the active follow-up.
- DEFERRED by latest Owner instruction: exhaustive browser inventory of every click-driven existing feature. Continue focused frontend integration checks for changed features.
- PENDING: candidate implementation batches below, with integrated usable UI and focused verification.
- DEFERRED by latest Owner instruction: repository regression analysis/refactoring and contest pre-submission review.
- Notify the user on each completed PR merge; verify Production for every release.

## Baseline and preservation

- Latest merged PR #464, origin/main `736d9e84e4eaa07bd57472735085811eb7eb8710`.
- Worktree `D:/wave-function-finalization-20260909`, new branch `codex/wave-horizon-refinement-353`.
- Two previous uncommitted files (landing-cinematic.css and LandingSectionProgress.tsx) copied to `D:/wave-completion-20260911/preserved-before-work` before branch creation. Baseline HEAD/main file trees identical. Changes carried forward.
- Current Production QA failure: existing ODsay provider hold #454; previous read-only browser tests and CD passed. Do not claim full API success or repeatedly call held provider.
- References read live: design-studio `/ten/`, `/eight/`, `/login/`; current source/screenshot evidence in `D:/wave-completion-20260911`.
- Feature research report `D:/wave-competitor-research-20260911/WAVE-feature-candidates-20260911.md`.

## Frontend acceptance

- [x] Shared WAVE brand, no W.A.V.E in public service copy (historical records/identifiers preserved).
- [x] Intro header: primary three pages; bookmark icon with count, no help/settings icons or duplicate My Trips text navigation.
- [x] Ten font/colors/background/spacing and separate text boundaries; current follow-up implements the newer full-bleed Eight photo requirement while preserving the introduction narrative.
- [x] Eight region cards and chapter-to-region reveal, correct type/location placement, all 18 regions and credited photos retained.
- [x] Planner keeps step rail and region photo selection (check icon); remaining interface follows Ten while preserving functions.
- [x] Community follows Ten; existing real content/actions preserved.
- [x] Login: focused single card matching attachment, Kakao/email/reset/register/guest paths intact.
- [x] Owner addition: remove top-right intro skip button; automatic handoff (including static/failed media), Esc and hydration fallback retained.
- [x] Actual desktop/mobile visual and interaction checks, required CI, merge and Production confirmation for PR #466. Follow-up functional UI corrections remain active.

## Functional UI follow-up

- PR #468 merged as `31be6b2`; main CI 34574038819 and Production CD 34576545629 PASS. The first hosted attempt stalled at Ubuntu font downloads; only the affected job was rerun. Five public pages at 1440/390px returned 200 with page errors 0 and horizontal overflow 0; `/api/health` returned 200 (configuration evidence only). Evidence: `D:/wave-completion-20260911/production-468.json`.
- PR #470 completes the latest full-bleed photo scenes, Ten text spacing, region film after preparation and compact guided Planner. Main CI and Production verification PASS as recorded above; no pending/failed gate bypass.

- Active branch `codex/wave-travel-tools-353` from merged main. Palette/type improvements in place detail, route comparison, community forms/comments, map drawers, travel book, account editing; grouped account dates.
- Direct controlled interaction inventory: `D:/wave-completion-20260911/click-*.mjs` and PNG/JSON evidence. Existing save/order/date/archive, account edits/vote/invite/export/cancel, comment/edit/report menu, map route/nearby/layers/export, photo-course controls inspected; all writes use fixtures, no personal messages.
- Independent QA found and verified fixes for sticky map heading/category overlap, dark secondary-control contrast, delayed search taking keyboard focus, and inherited flat-header grid placement in the new sentence search.
- Full feature/state audit remains open. Do not equate this visual subset with every production function being certified. Account authentication/actual provider success and newly implemented features require their own evidence. ODsay hold #454 remains separate from successful CD.

## Feature candidates — all authorized; status is per feature, not inferred from a placeholder

1. ACTIVE — On-demand official opening/holiday/admission/event information and planned-arrival/full-visit comparison. Conservative conditional/unknown handling, raw source/time/contact, shared theme integration. Focused tests and independent QA; merge/Production pending.
2. PENDING — Walking burden and scheduled rests based on user preferences.
3. PENDING — Compare targeted replacement with original and undo.
4. COMPLETE #472 — 2–3 place facility comparison, matching needs first, confirmed/negative/unknown fields, sources and direct save/remove. Independent QA and Production interaction checks PASS.
5. PENDING — On-trip progress, skip, resume and remaining schedule.
6. PENDING — Companion needs combined into trip constraints.
7. COMPLETE #472 — Large Korean communication/inquiry card, selected questions, custom text, copy/manual fallback and PNG save. No automatic message. Independent QA and Production interaction checks PASS.
8. PENDING — Return/reservation deadline and remaining-time planning.
9. COMPLETE #474 — Editable visit duration and downstream recalculation. Presets/custom15–720/default, date/order isolation, local archive/account/public-share persistence. Independent QA, CI/CD and Production changed-feature verification PASS.
10. PENDING — Reason-driven alternatives (far, visited, easier, indoor).
11. PENDING — Weather alternatives with evidence-backed indoor suitability.
12. PENDING — Quieter-date comparison within available forecast coverage.
13. PENDING — Fixed accommodation/must-visit/event/time locks.
14. PENDING — Rest/toilet stops added to schedule with evidence.
15. PENDING — Recent facility confirmation history and structured update reports.
16. PENDING — Trip cost/budget with known/unknown distinctions.
17. PENDING — Offline-readable trip summary/export.
18. PENDING — Return transport direction/next service tied to itinerary.
19. PENDING — Anchor-first course expansion.
20. PENDING — Short outing with time limit.
21. PENDING — Less-known Gyeongnam alternatives without sacrificing needs.
22. PENDING — Optional companion split and reunion segments.
23. PENDING — Visit-evidence reviews without mandatory GPS tracking.
24. PENDING — Voice interaction with explicit activation/confirmation and text fallback.

Candidate feature must have user-facing integrated entry, meaningful state changes, persistence/share behavior as applicable, truthful data limits, and focused verification before marked complete. A placeholder panel or README is not completion.

## QA scope

This task verifies changed features and their relevant loading/empty/error/cancel states, desktop/mobile layout, required CI and actual Production delivery. The full inventory of all existing click-operated functions, repository regression/refactoring and pre-submission review is deferred by the Owner. Use test accounts/data for writes. External personal authentication/consent still needs the account holder. Do not omit direct visual/interaction verification of changed features.
