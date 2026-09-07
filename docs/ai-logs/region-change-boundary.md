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
  budgets and actual Preview are pending CI. This draft PR exists to validate
  in the permitted runner boundary, not to claim readiness or bypass a gate.
- Production remains `34e6021265b16d046dca24feaa3ec2101fc977e2` at resume.
  No deployment, migration, merge, final QA receipt or Release GO performed.

Preserved the 10 dirty #289 files outside this worktree, with original-byte
copies, a binary patch and SHA-256 manifest. Existing worktrees, logs, servers,
queue generation/attempts/receipts and archived travel books remain preserved.

Remaining before readiness: all CI outcomes, Preview journey/map marker equality,
archived-trip restoration, delayed request regression, independent latest-HEAD
QA, integration into final #334 and Production verification.
