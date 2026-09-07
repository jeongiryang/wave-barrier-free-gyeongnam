# Issue #347 item 4 — region decision boundary

Base: #334 `c1bae6f80f58fb2ec58d7e00160ad7869f2bdeef`. Refs #347, #288.

The region picker previously called `setRegion` immediately while saved IDs,
place snapshots and date assignments survived. A subsequent search could add
another region to the same day without consent.

This candidate adds an accessible three-choice modal before changing a region
with saved places. Cancel preserves the trip. Add preserves places/dates/order
and clears obsolete recommendation and provider results. New trip uses one
committed current-trip storage record, then resets saved IDs, catalogue,
assignments, order, active day, route results, origin, transport selection,
weather, enrichment, audio and completion reviews in the same event. Archive
restoration uses the same record and does not delete archived travel books.
Old asynchronous plan/route/enrichment/weather responses are invalidated.
Multi-region itineraries explicitly warn about long travel and midnight;
arrival after midnight also counts as continuing into the following day.

## Validation status

CI #786 (`34113679023`, initial `1b71371`) passed YAML/actionlint, both audits
and lint, then failed typecheck: the new required `onRegionChange` callback
was missing at the multiline page call site. The callback is now connected.
This was an implementation wiring error, not an obsolete test assumption.
The following push supersedes that run and retains the complete test scope.

CI #787 (`34113927718`, `beff740`) passed lint/typecheck and both audits.
Unit/contract: 493 PASS, 2 FAIL, 0 skip. Both failures were source-contract
assumptions: a blanket ban on `setPlan(null)` also prohibited the newly required
explicit reset, and the `setWeather(` pattern matched `resetWeather(`. The
automatic-criteria no-clear assertion is retained on the request path; reset
and delayed old-response behavior now have executable hook tests. The root
state-setter assertion uses identifier boundaries. No failed behavior is hidden.

CI #788 (`34114359487`, `e7a694a`): lint/typecheck and unit/contract **497 PASS,
0 FAIL, 0 skip**, Vercel build PASS. Performance gate FAIL: planner initial
JavaScript **270.50 KiB > 270 KiB**. The budget is unchanged. Region-dialog
details/actions are now a deferred module inside an immediately mounted native
dialog. Heading/cancel and focus containment remain available during loading;
module failure keeps the itinerary and offers cancellation/reload guidance.

CI #789 (`34114727249`, `0675bf2`) still measured **270.35 KiB**, above the
unchanged 270 KiB limit; all 497 unit/contracts passed again. The existing
place dialog's evidence and participation modules are also deferred until
the dialog opens. Its native shell, close control and heading stay immediate;
loading/error messages remain visible and no facility evidence is invented.
Existing place-dialog E2E remains part of the unchanged full suite.

CI #790 (`34115123833`, `8f3b421`): quality PASS, 497 unit/contracts PASS,
both audits PASS, Vercel build PASS. CSS gzip 69.94 KiB / 70; planner initial
JS gzip 268.83 KiB / 270. Full browser run completed: desktop 303 PASS / 5 FAIL,
mobile 302 PASS / 5 FAIL / existing skip 1, no flaky passes. The old cross-region
test tried to search behind the new consent dialog; it now explicitly chooses
Add before retaining its original place assertions. New restore tests wrongly
included an aria-hidden arrow in the exact button name. English setup clicked
the auto-hidden header while scrolled to the itinerary; it now uses Ctrl+Home
and asserts the preferences control is in the viewport. No force click, timeout
increase, selector broadening or assertion deletion is used.

Actual Preview deployment `6307396478` reports success for **8f3b421**:
https://wave-barrier-free-gyeongnam-kli97051x-jeongiryang-projects.vercel.app
On 2026-09-07 11:13–11:27 UTC, real KTO search returned five Changwon candidates;
Daesan Flowerland and Junam Reservoir were added. At 320px, cancel retained
Changwon/two places and returned focus to Hadong; Add retained both places and
the matching two map-marker titles; New cleared the current itinerary and
locked empty steps. An archived itinerary survived and restored two places.
KO/light and EN/dark/reduced-motion dialogs fitted 320px without horizontal
overflow, with heading focus, Shift+Tab/Tab containment and Escape return.
Console error/warning collection returned zero entries at the inspected point.
Kakao SDK did not connect on this Preview; Leaflet fallback rendered. This is
not evidence of Kakao or ODsay provider success, physical-device testing,
screen-reader testing or a complete Production smoke.

Preview exposed an archive-label defect: changing the search region to Hadong
while retaining only Changwon places produced a misleading Hadong title.
Generated titles and visible region labels now derive from the actual places;
the separate search region remains available for restoration, custom titles
remain intact, and multi-region archive coverage is added. The new dialog has
an explicit KO/EN language boundary and themed button colors.

Independent review `5131215805` / thread `3949088723` reports P1 FAIL: location
notice was not reset and a late geolocation error bypassed the generation guard.
Both success/error outcomes are now guarded, reset restores the initial notice,
and executable hook tests cover pending and already displayed locations. The
map's separate geolocation hook also invalidates pending callbacks when the
origin/place context changes or the component unmounts; browser regression
holds a real UI location request across New and then releases success/error.
Latest-head CI/Preview and separate QA are required before resolving this FAIL.

At `449fad4`, CI #793 (`34117242451`) quality passed: **502 unit/contracts,
0 fail/skip**, both audits zero vulnerabilities, lint/typecheck/build/budgets
PASS; CSS 69.94 KiB and planner initial JS 268.84 KiB. CI #793 then finished
SUCCESS including validate: desktop **310 PASS**, mobile **309 PASS / existing
skip 1**, zero failures/flaky passes. All 14 new region/location browser cases
passed. Preview **6307842521 SUCCESS** is
the same SHA at https://wave-barrier-free-gyeongnam-dbbl1g08a-jeongiryang-projects.vercel.app .
Real KTO search again returned five Changwon candidates. After retaining two
places while selecting Hadong, the saved book correctly displays Changwon and
the Changwon two-place title. This deployed-runtime check is separate from
mock provider coverage; it does not yet prove delayed geolocation outcomes.
At 320px the actual English/dark modal has `lang=en`, 44px minimum button height,
13.40:1 button text contrast, no horizontal overflow and keyboard containment/
Escape return to Jinju. The temporary browser viewport override was reset.

The existing manual Production API Smoke workflow now has an optional Preview
path, because running repository tests on the credential-bearing host remains
prohibited. Empty inputs preserve the existing Production smoke. Preview inputs
must be an immutable project origin and a full SHA equal to the dispatched
workflow commit; a successful GitHub Preview deployment with that exact URL/SHA
is required before npm executes in a standard ephemeral runner. No repository
secret is provided to the test step and checkout credentials are not persisted.
Non-read network methods are blocked in the Preview region test. It exercises
the deployed UI with deterministic provider and geolocation responses; real KTO
and other provider smoke remain separate requirements.

After deploying the latest branch HEAD, run the existing active workflow:
`gh workflow run production-api-smoke.yml --repo jeongiryang/wave-barrier-free-gyeongnam --ref fix/region-change-boundary -f preview_url=<immutable-origin> -f preview_sha=<full-current-head>`.
Registration of these inputs is not an executed test. Record the actual run URL,
counts/artifact and separate QA verdict before claiming the Preview gate passes.

An unauthenticated GET of the `e69203a` Preview on 2026-09-07 redirected to
`vercel.com` (login HTML). Browser observations above used the existing signed-in
browser and cannot prove anonymous CI access. The Preview gate now refuses
redirects/authentication/error responses before npm installs or browser tests.
Do not copy the browser session, Vercel credentials or a bypass token to CI.
This path remains **blocked-preview-access** until a Preview is legitimately
available to the credential-free runner. No protection setting was changed.

- Added storage commit/failure/reload contracts and midnight regression.
- Added KO/EN, light/dark, 320px modal, keyboard focus/trap/cancel and axe E2E;
  preservation/new-trip/reload, rapid region requests and history checks.
- Updated the existing storage-source contracts to check the storage adapter;
  no assertion removal, skip, timeout or budget increase.
- `git diff --check`: PASS before initial checkpoint.
- Repository npm scripts and queue tick were **not run on the host** because
  #289's credential isolation P1 remains unresolved. CI checkout credentials
  are not persisted; public standard runners retain the existing full suite.
  This change does not claim that #289's sandbox or automation smoke passes.
- Initial candidate: unit, lint, typecheck, full Playwright/axe, build, audit,
  budgets and actual Preview were initially pending CI. This draft PR exists to validate
  in the permitted runner boundary, not to claim readiness or bypass a gate.
- Production remains `34e6021265b16d046dca24feaa3ec2101fc977e2` at resume.
  No Production deployment, migration, merge, final QA PASS receipt or Release GO performed.

Preserved the 10 dirty #289 files outside this worktree, with original-byte
copies, a binary patch and SHA-256 manifest. Existing worktrees, logs, servers,
queue generation/attempts/receipts and archived travel books remain preserved.

Remaining before readiness: all CI outcomes, Preview journey/map marker equality,
archived-trip restoration, delayed request regression, independent latest-HEAD
QA, integration into final #334 and Production verification.
