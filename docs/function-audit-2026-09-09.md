# FUNCTION audit — 2026-09-09

Base: `a355f38d21d67b50ae5936bdcb49a3a310c96198` (`origin/main`, fetched before checkout).
Worktree: `D:/wave-function-finalization-20260909`; branch: `feat/product-function-finalization`.
Raw read-only evidence: `D:/wave-function-evidence-20260909` (Issue bodies/comments, PR reviews, local inventory, run logs and screenshots). No user worktree, stash, queue or prior artifact was reset or deleted.

## Starting evidence and ownership

- Open PR: #373, Draft `chore/ci-feedback-gates-20260908`; excluded CI track. All 49 open Issues recorded in `open-issues.json`.
- Existing dirty worktrees: `wave-integration-audit` (Production artifacts), `wave-subscription-queue` (10 files), `D:/wave-subscription-sandbox-289` (Python cache). Stash list empty. All worktree/branch SHAs and upstream differences recorded separately.
- DESIGN `D:/wave-production-validation-20260908`, `feat/fullscreen-story-353`, observed HEAD `d92c4bfc66343a7a538394155adfa8f1288e55a2`, 4 commits ahead of its remote; untouched.
- Current main CI [34296946060](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34296946060), Release 34296946058, CD 34297916669: SUCCESS. Production deployment 6340349746 records this same SHA and success.
- Post-Deploy QA [34298027840](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34298027840): FAILURE at provider preflight, `BLOCKED_EXTERNAL: unresolved provider hold; no live API calls made`. This is #372 operational evidence, not a new product-code failure or full Production PASS.
- Directly read #388, #347, #387, #277, #276, #252, #254, #275, #280, #281, #282, #272, #255, #253, #261, #264, #268, #269, #273, #274; also #11 and #372. Archived #334/#338 review submissions and inline comments. Closed #338 was integrated through #334; its own closed state is not merge evidence. Main integration commit is `0c06035` (#334).
- Existing current-location policy in `CLAUDE.md`: GPS-derived origins are blocked from W.A.V.E route requests. Do not silently remove this boundary to make an estimate appear. External-map handoff must separately explain its location handling.
- DESIGN file collision set includes `features/landing/**`, landing CSS, `app/layout.tsx`, `components/HelpCenter.tsx`, `features/preferences/**`, `components/WaveField.tsx`, shared accessibility/style tests and `features/community/components/LandingCommunityStory.tsx`. Avoid these; planner/domain/provider changes currently have no overlap with the observed DESIGN diff.

## FUNCTION AUDIT MATRIX

Status describes the cited scope; open/closed is not an implementation verdict. NOT VERIFIED items remain unconfirmed until a current reproduction. IMPLEMENTED rows preserve existing behavior and their transferred/deferred follow-ups.

| Priority | Issue | 기능 | Current main evidence | 상태 | 재현 여부 | Design 충돌 위험 | Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P0 | #388 | 외부 길찾기 출발/도착/수단 | `RouteComparisonPanel.tsx:53` builds destination-only `/link/to`; `useRouteRequest` already retains per-leg `routeStart/routeStartLabel` | BROKEN | Browser contract added for preset and second leg; baseline results recorded separately | Low, planner route component | First repair: current leg + selected mode in official Kakao URL |
| P0 | #347 | 날짜/7일/1분/지역/marker QA | `0c06035` integrates date, Kakao/ODsay endpoint and region fixes; `0116ef9` restores saved coordinates; `eab2442` map fit; `81b88e4` weather focus | PARTIAL | Existing targeted unit 133 PASS; date/itinerary browser 15 PASS; full QA not rerun | Medium for HelpCenter/global QA files | Preserve tested repairs; investigate untested valid-but-inconsistent measurements and remaining #388 cases |
| P0 | #388, #281 | 새 여행 lifecycle | `app/travel-book/page.tsx:133` new-trip link only navigates to `/planner`; `useRegionChange` resets saved data but page fresh callback retains selected facilities/themes | BROKEN | Static control-flow reproduction; browser reproduction pending | Low, planner/travel-book | Separate atomic current-trip reset and explicit saved-profile reuse; preserve archive |
| P1 | #388 | 복원 후 공유/캘린더 | `TripDayPlanner.tsx:95` and `DepartureReadinessCard.tsx:71` require live `plan`; restored catalogue works without it | BROKEN | Static restored-state (`plan=null`) disables both; browser pending | Low | Derive export snapshot from canonical saved itinerary, validate dates |
| P1 | #388 | 날씨/방문 경향 context | `useRegionWeather` requests region but response parser not bound to requested region; view model uses current weather and recommendation crowd; restored itinerary has no plan | NOT VERIFIED | Current browser mismatch reproduction pending | Low | Audit region/day/place identity and explicit forecast range |
| P1 | #388, #11 | 계정 탈퇴 | `account-deletion-error.js`; #249 and #11 record provider `404 NOT_FOUND` → `503 ACCOUNT_DELETION_NOT_CONFIGURED` | BLOCKED_EXTERNAL | Previous synthetic account evidence only; no live deletion attempted | Low | Fixture-check error categories; actual deletion/admin setting remains Human Gate |
| P0 | #387 | 실제 거리/시간 | Kakao provider road vertices/time/distance; ODsay verified city path; coordinate visit ordering and estimates; inventory below | PARTIAL | Endpoint regressions PASS; all-mode handler fan-out visible in code | Low | Mode-scoped provider requests; preserve basis/units and partial coverage |
| P0 | #277 | 장소 편의 vs 경로 편의 | `ItineraryRouteCoverage` warns route does not confirm access; `departure-assessment` still derives transport readiness from provider counts | PARTIAL | Existing route fixtures; full readiness field checks pending | Low | Provider capability and readiness evidence audit; never invent accessibility |
| P0 | #275 | 날짜 의미 | `usePlanRequest` signature excludes dates; enrichment receives dates; guided still asks date before search | PARTIAL | Date preservation/7-day browser PASS | Low; no guided redesign | Keep date contract; resolve forecast/event scope without moving DESIGN UI |
| P0 | #254 | 추천 0/stale 진행 잠금 | `useJourneyProgress`: completion uses current saved recommendation; availability uses saved catalogue for return visits | PARTIAL | Restoration unit PASS; new-criteria navigation edge pending | Low | Separate existing-trip editing access from current recommendation completion |
| P1 | #280 | 진행/출발 준비 | `useJourneyProgress` counts reviewed itinerary; `ItineraryRouteCoverage` all legs; departure card still provider health | PARTIAL | Core regressions present, remaining AC transferred to #277/#282 | Low | Keep completed core; repair per-leg readiness in owning follow-up |
| P1 | #281 | 저장·복원·새 여행 | `current-trip-storage.js` canonical record, legacy mirrors; region Add/New/Cancel | PARTIAL | Atomic storage, region reset unit PASS; activities reset missing | Low | Address #388 lifecycle in small independent change |
| P1 | #252 | 복수 테마 | `usePlannerCriteria.toggleTheme`, `plan-builder` bounded multi-theme fetch/dedupe, criteria in response; restore lacks selected criteria | PARTIAL | Implementation/merge evidence; full theme restore not verified | Low | Keep live multi-select; complete serialization/restore contract later |
| P1 | #282 | 느림/offline/timeout | `usePlanRequest` keeps prior plan, abort/signature; `useRouteRequest` and weather clear old result; generic request error state | PARTIAL | Existing contract tests present; broader fault browser pending | Low | Preserve valid previous results with explicit stale/error identity |
| P1 | #272 | URL/history/refresh | `usePlannerStageView`, `useRegionChange` popstate, restoration gate; criteria hydration restores region only | PARTIAL | Journey restoration unit PASS; criteria/question refresh remains | Low | Bounded navigation/criteria restoration tests |
| P2 | #255 | Planner 정보 hierarchy | Service/provider details disclosed; core stages remain; closed Issue explicitly transferred follow-ups | IMPLEMENTED | Main code, previous full CI and current planner render; no redesign | Medium, shared chrome | Preserve core; user-screen redesign deferred to Owner |
| P2 | #276 | 지도 기본/고급 도구 | Current `MapCommandBar` retains many commands; functional panel/focus regressions exist | PARTIAL | Full hierarchy not implemented or requested now | Medium, common map controls | Defer hierarchy change to Phase 5; fix only reproducible operation errors |
| Contract | #253 CLOSED | 한 질문/guided↔overview | `PlannerConditionsPanel`, `usePlannerStageView`; current neutral browser shows one question | IMPLEMENTED | Main browser renders; guided regression present; refresh/themes moved to #272/#252 | Low | Preserve; no question-order redesign during Phase 1 |
| Contract | #261 CLOSED | 중립/명시 조회/stale/abort | `usePlannerCriteria` empty selections; `usePlanRequest` manual action/signature/abort | IMPLEMENTED | Initial browser neutral, unit PASS; remaining network/gating in #282/#254 | Low | Preserve; no automatic recommendation |
| Contract | #264 CLOSED | canonical 일정→날짜→pin→leg | `orderedSavedPlaces`, `PlannerItineraryWorkspace` day filter, `buildItineraryLegs`, ordered key | IMPLEMENTED | Itinerary unit and browser PASS; route endpoint regressions PASS | Low | Preserve; external link currently loses this existing origin |
| Contract | #268 CLOSED | 실제 편의 선택 | `constants` facility wording, catalog profile fields and dedupe; explicit saved-profile apply | IMPLEMENTED | Code and accessibility score tests PASS; no health-type inference | Low | Preserve; direct field picker is a follow-up, not this repair |
| Contract | #269 CLOSED | 장소/편의/행동 추천 카드 | `RecommendationCarousel`, `PlaceEvidenceSummary`, separate exploration | IMPLEMENTED | Existing main/CI contract; current planner browser PASS | Low | Preserve cards and official-vs-review boundary |
| Contract | #273 CLOSED | 18지역 map/list/deep link | `GyeongnamRegionPicker`, shared geographic data, region state | IMPLEMENTED | Initial browser 18 + all choices; region tests present; early hydration P2 unverified | High if shared picker redesigned | No picker/geography edits; test current-state behavior only |
| Contract | #274 CLOSED | confirmed/unknown/negative | `accessibility-score.js`, `accessibility-model.ts`, structured requested evidence | IMPLEMENTED | Accessibility unit PASS; failure never becomes negative | Low | Preserve; remaining label/group details transferred in Issue |
| Excluded | #350/#351/#352/#386/#353/#385/#373 | cloud sync/login/ideas/intro/design/CI | Owner scope decision | DEFERRED | Not executed | High for DESIGN | Leave with owning track |
| External | #372 | ODsay hold | Current open hold + Production preflight failure | BLOCKED_EXTERNAL | Recorded evidence, live calls 0 | None | No key/quota/admin changes or repeated live tests |

## Distance inventory before #387 implementation

| Surface / calculation | Existing source and unit | Basis | Next action |
| --- | --- | --- | --- |
| Recommendation card | No generic origin-distance on current card; optional `plan.course.distance` (km) is the provider course, not user's itinerary | UNKNOWN for generic recommendation; provider course separate | Never reuse course distance as trip total |
| Nearby places | Kakao Local `distance` from search center, metres; `NearbyPlacesPanel` shows m | STRAIGHT_LINE | Label meaning explicitly; no route request per card |
| Suggested visit order | `directDistanceKm` haversine + destination evidence penalty | STRAIGHT_LINE | Keep heuristic explanation; no N² provider matrix |
| Each itinerary leg | `buildItineraryLegs` ordered day/from/to; `usableLegRoutes` selected mode | ACTUAL_ROUTE when approved provider bundle exists; otherwise UNKNOWN | Preserve leg identity and mode when requesting/exporting |
| Schedule travel time | Provider minutes if available; else coordinate distance / assumed speed × road factor, min/max clamped | ACTUAL_ROUTE time or ESTIMATE | Never call estimate an actual walking distance; investigate clamping actual time separately |
| Map geometry | Kakao road vertices; ODsay stops/connecting endpoints; unconfigured preview line | ACTUAL_ROUTE for verified Kakao road geometry; transit stop schematic; STRAIGHT_LINE preview | Do not describe ODsay schematic as measured road geometry |
| Car card | Kakao summary distance m / duration s→min; requested endpoints checked within product tolerance | ACTUAL_ROUTE | Check positive-but-implausible measurements, not just success/missing data |
| Public transport card | ODsay verified city `totalTime`, totalDistance, totalWalk | ACTUAL_ROUTE + PROVIDER_WALK | Recheck documented fields/units via fixture; #372 remains held |
| Walking/cycling card | No approved adapter in current code; external map fallback | UNKNOWN | Never substitute car route/coordinate multiplier |
| Total travel distance | Per-route `totalDistance`; no verified complete-itinerary aggregate | UNKNOWN for complete itinerary | Partial leg sum must not claim whole-trip actual total |
| Total walking distance | Provider route `totalWalk`, not all itinerary walking | PROVIDER_WALK | Preserve per-route scope; car 0 does not prove accessible entry |
| Saved/shared distances | Travel book stores place/date/order; optional course snapshot independent from actual route evidence | UNKNOWN for saved itinerary route total | Old snapshot must never gain actual-route status |
| External Kakao link | `/link/to/name,lat,lng` drops ordered origin/mode | UNKNOWN / broken handoff | Use documented `/link/by/{mode}/from/to` for nonprivate valid endpoints |

Official URL contract checked: [Kakao Maps Web guide](https://apis.map.kakao.com/web/guide/). `car / traffic / walk / bicycle` are distinct external modes. Provider acceptance still requires current ordered endpoints and valid response measurements; a link does not prove route availability or accessibility.

## Baseline validation

- `node --test` targeted: Kakao/ODsay integrity, trip dates, itinerary legs, current-trip storage, accessibility score, guided flow, region plan/location reset, journey restoration: **133 PASS, 0 fail/skip**.
- Local Playwright: `trip-date-integrity`, `itinerary-route-sync`, `planner-redesign`, desktop: **15 PASS**, 0 failed. Deterministic API fixtures, no live provider success claim.
- Isolated dev server `127.0.0.1:4189`; agent-browser neutral planner rendered; 18-region controls, disabled future steps, no error overlay; screenshot retained. Initial shell quoting failed an optional DOM query; corrected stdin query returned `OK` (not an app failure).
- Fresh #388 external-link red/green regression and each implementation's evidence live in its separate fix note. No global PASS, Issue closure or Production release is claimed by this audit.

## First repair and next reproduced defect

- #388 public Kakao handoff repaired in this candidate: [fix evidence](ai-logs/function-kakao-handoff-388.md). Main 2 browser failures → candidate related 38 browser PASS; 721 unit/contract PASS. It is not yet merged/deployed.
- #347/#387 positive-but-inconsistent measurements: unchanged main Kakao parser accepts a success fixture for 창원중앙역 → 주남저수지 with 8,229m / 60 seconds as configured=true, totalTime=1, provider connected. Existing missing-value/endpoint tests do not cover this. **BROKEN, P0**, exact offline reproduction `measurement-before.json`, provider calls 0.
- #347/#387 schedule consistency: `travelDurationBetween(..., {routeMinutes:301})` returns `{minutes:240,source:"route"}` due to the estimate cap being applied to provider values. **BROKEN, P1**, same reproduction artifact. Keep it separate from the external URL patch.
