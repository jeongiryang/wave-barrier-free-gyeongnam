# Unified CI triage — 2026-09-25

## Evidence and scope

Read complete failed-job logs for PR #706 run `36140881325`; #707 run `36141820871` desktop shard 1 and mobile shard 6 logs confirm the same failures. Both quality and sandbox-boundary jobs passed. #706 all 16 browser shards failed. This is not a claim that every failure has been reproduced locally.

Raw logs retained outside repository under Documents/ChatGPT (`pr706-failed.log`, `pr706-errors.txt`, `pr707-browser1.log`, `pr707-browser6mobile.log`). No CI bypass proposed.

## Confirmed product defect: bookmark hydration race (fixed in candidate)

`PlannerHeader` omitted `onSaved` while the initial saved count was zero. The first render therefore exposed a working `/travel-book` link, even when a saved trip was restoring. Clicking before restoration navigated away from the planner. `departure-facility-evidence.spec.ts` complete KO locally reproduced at `fixtures.ts:124`; failure snapshot is the travel-book page. This also explains shared helper failures in `simple-live-share` and reload failures in `planner-date-hydration`.

Fix: pass actual `tripSelection.storageReady` through the planner header. WaveHeader renders a disabled bookmark until storage readiness; after readiness, nonempty trip retains itinerary callback and genuinely empty trip retains travel-book navigation. No fixture timing relaxation.

Desktop targeted verification: departure complete KO, Seoul/KO date hydration, first live-share test — all 3 passed (13.7s). Mobile equivalents all 3 passed (10.2s). Fresh guest bookmark retains `/travel-book` navigation. `region-change-boundary` KO-light preserve/reset test passed (8.4s). Remaining itinerary-related cases should be rerun against the final tree before assuming they share this cause.

## Product regressions / investigation priorities

- `community-density.spec.ts:156`: editorial grid remains 3 columns when 2 selected. Guides moved outside density-owning workspace; extend density state/scope to relocated grid rather than weakening assertion.
- `preferences-theme-contrast.spec.ts:72`: light-theme select contrast 1.02. Give select/selected option explicit matching foreground and surface.
- `regional-information-language.spec.ts:42`: selected `#theme-tab-language > small` uses #233b55 on #3659ba (1.8). Inherit selected-tab light foreground on child small text.
- `search-result-focus.spec.ts:142,197` and `preferences-picker-recovery.spec.ts:20`: legacy Home/ArrowDown/Enter or label-click/ArrowDown/Enter no longer commits value with base-select. Review actual native keyboard contract; retain accessible navigation or explicitly test opening then navigating new picker. Do not classify as network flakiness.
- `preferences-disclosure-focus.spec.ts`: review popup focus boundary after base-select changes.
- `planner-workspace-responsive.spec.ts:95`: action centre covered by launcher/header. Reproduce with final header and inspect `elementFromPoint`, preserve reachable actions.
- `place-detail-decision.spec.ts:90`: primary action height 44.39px versus required48px. Restore established48px target.
- `naru-followup-intents`: initial route calls expected3, received0 after bookmark click; likely hydration cascade, not yet individually reproduced.

## Outdated assertions caused by explicit UI changes

- `night-desktop.spec.ts:17`: expects removed 다음 배너 control and 02/03 label. Replace with automatic panorama transition test while retaining category navigation assertions.
- `restored-landing-story.spec.ts:31`, related landing no-provider-request tests: forbid authorized `action=enrich`/`action=photo` calls. Permit narrowly scoped read-only photo requests; continue forbidding plan/model/write side effects.
- `submission-ui-completion.spec.ts:59`: direct-child `.landing-page > .wave-balanced-footer` no longer matches shared closing wrapper. Locate semantic footer within closing section and retain width/no-overflow checks.
- `site-chrome-contrast.spec.ts:40`: requires old solid #050e19/no-background-image instead of shared panorama. Verify composited contrast/overlay rather than reinstating removed boundary.
- `landing-theme-contrast.spec.ts:19`: getComputedStyle(null) in old DOM traversal; update element guard/ancestor lookup before measuring contrast.
- `mobile-design-b.spec.ts:18`: exact60px header versus96px; check current requested layout before updating the size contract; do not simply waive overflow/usability tests.
- `parking-alternatives` request-total assertions count late decorative photo requests. Scope to forbidden inquiry payload/network actions and await authorized photo settling rather than accepting arbitrary extra requests.

## Environment classification

No evidence that disk capacity caused these failures: reported temporary free space ~89GB, shared memory ~8GB. Disk telemetry after failed steps is diagnostic, not a failure cause. `companion-support` times out at page.evaluate/setViewportSize, so classify unresolved performance/timing pending isolated reproduction, not proven environmental. Most deterministic assertions fail on retry in both PRs.

## Complete failing spec inventory from #706

Inventory only; unlisted root causes remain unclassified pending focused reproduction.

- `e2e/community-density.spec.ts`
- `e2e/companion-support.spec.ts`
- `e2e/departure-facility-evidence.spec.ts`
- `e2e/departure-route-evidence.spec.ts`
- `e2e/deployment-screen-recovery.spec.ts`
- `e2e/editorial-journey.spec.ts`
- `e2e/equipment-rental.spec.ts`
- `e2e/festival-trip-upgrade.spec.ts`
- `e2e/four-innovations.spec.ts`
- `e2e/itinerary-language.spec.ts`
- `e2e/landing-boundaries.spec.ts`
- `e2e/landing-cinematic.spec.ts`
- `e2e/landing-owner-pass5.spec.ts`
- `e2e/landing-regions.spec.ts`
- `e2e/landing-reveal-regression.spec.ts`
- `e2e/landing-scroll-contract.spec.ts`
- `e2e/landing-theme-contrast.spec.ts`
- `e2e/launch-integrity.spec.ts`
- `e2e/leaflet-date-fit.spec.ts`
- `e2e/local-place-filter.spec.ts`
- `e2e/mobile-design-b.spec.ts`
- `e2e/naru-followup-intents.spec.ts`
- `e2e/night-desktop.spec.ts`
- `e2e/one-hand-layout.spec.ts`
- `e2e/onsite-communication.spec.ts`
- `e2e/parking-alternatives.spec.ts`
- `e2e/photo-accessibility.spec.ts`
- `e2e/place-arrival-route.spec.ts`
- `e2e/place-decisions.spec.ts`
- `e2e/place-detail-decision.spec.ts`
- `e2e/place-inquiry.spec.ts`
- `e2e/planner-date-hydration.spec.ts`
- `e2e/planner-workspace-responsive.spec.ts`
- `e2e/powerchair-charging.spec.ts`
- `e2e/preferences-disclosure-focus.spec.ts`
- `e2e/preferences-picker-recovery.spec.ts`
- `e2e/preferences-theme-contrast.spec.ts`
- `e2e/pwa-install.spec.ts`
- `e2e/recommendation-language.spec.ts`
- `e2e/region-album-playback.spec.ts`
- `e2e/regional-information-language.spec.ts`
- `e2e/restored-landing-story.spec.ts`
- `e2e/roadview-recovery.spec.ts`
- `e2e/route-language.spec.ts`
- `e2e/search-result-focus.spec.ts`
- `e2e/service-story.spec.ts`
- `e2e/simple-landing.spec.ts`
- `e2e/simple-live-share.spec.ts`
- `e2e/simple-planner-continuity.spec.ts`
- `e2e/site-chrome-contrast.spec.ts`
- `e2e/story-media-remix.spec.ts`
- `e2e/submission-ui-completion.spec.ts`
- `e2e/text-scale.spec.ts`
- `e2e/tone-mode.spec.ts`
- `e2e/transport-evidence.spec.ts`
- `e2e/travel-choice-hierarchy.spec.ts`
- `e2e/trip-alternatives.spec.ts`
- `e2e/trip-comfort.spec.ts`
- `e2e/trip-date-integrity.spec.ts`
- `e2e/trip-day-tools.spec.ts`
- `e2e/trip-timing-confirmation.spec.ts`
- `e2e/weather-language.spec.ts`

## Follow-up verification

- After the bookmark fix, three fresh `/planner` document requests each rendered a disabled bookmark `<button>` on the server; no `pageerror` hydration failures occurred. No `PlannerSkeleton` exists in this checkout. Reported server-anchor/client-button mismatch was not reproduced against the current server.
- `mockPlannerApi` now supplies a deterministic empty photo response. `mockPublicShellApi` supplies scoped empty photo/enrichment responses, allowing later specialized route overrides. This removes real provider 503s from unrelated fixture tests without suppressing API-error test coverage.
- Returning saved-trip launch plus share initial/create/edit/re-entry desktop checks: 4 passed (13.7s).
- Entire mobile `simple-live-share.spec.ts`: 11 passed (34.2s), including conflict handling, update serialization, revoke/reload, last-place removal and undo. No additional share-state product changes were needed.
