# Desktop frontend review — 2026-09-20

Branch: `codex/desktop-mockup-rebuild`, starting at `c019af6`.
Local review only. No push, merge, deployment, account deletion or production data mutation was performed.

## Review pages

- http://127.0.0.1:4185/community — dark photographic banner, three-column stories, categories, search, sort/view controls and sidebar.
- http://127.0.0.1:4185/festivals — generated lantern banner, public API events, dates/facilities/keywords, four-column results, trip actions and nearby planning links.
- http://127.0.0.1:4185/planner — real administrative-boundary region map with photo markers, conditions, existing results/view modes, itinerary/photo/map continuity and Naru entry points.

Desktop priority; mobile design is explicitly deferred. Desktop 960px and 1440px stage navigation were checked. Service-introduction design is retained.

## Data and preserved functions

Tourism photographs and festival records come from the existing KTO-backed APIs. Dates and accessibility evidence are not invented. Confirmed, absent, unknown and provider-error states remain distinct. Festival adding/new-trip actions retain date validation, stale response protection, fixed visits, backup and storage failure handling.

The six owner-approved community mockup stories retain the specified names, initial counts and copy. These are presentation records, separate from authenticated community posts and official facility evidence. Their likes and saved state are browser-local. Displayed comment counts are presentation values, not seeded backend comment records; the story dialog links to writing a new travel story. Actual user posts retain the existing detail, comments, likes, moderation, photos and field-report APIs. No UI demonstration label is shown, per the owner's instruction; submission documentation must explain the presentation data.

`tips` and `together` are now supported end to end in category types, input validation, query filters and the existing editor. Migration 017 adds them without deleting existing rows; it is registered but has not been applied to production.

## Local environment

Start in PowerShell:

```powershell
$env:WAVE_PUBLIC_PREVIEW='1'
npm run dev -- --host 127.0.0.1 --port 4185
```

The opt-in Vite plugin forwards only allowlisted public GET requests to the existing service. It forwards no cookies, credentials, mutations or private account routes. Normal development without the flag uses the local backend. Production builds exclude this serve-only middleware.

This workspace has no local database/authentication/LLM credentials. Public tourism reads were verified live (nine festivals in the current default date range). Authenticated writes and real local-model POST requests are not verified here. Existing Naru shared-state behavior is covered by synthetic provider tests; that does not prove live model availability. A configured isolated development backend is needed to review real sign-in, posting, sharing and LLM calls locally. Do not interpret this frontend review as a completed account setup or production release.

Do not build while the Vite dev server is running: Nitro shares generated intermediate files between these operations. Stop the preview, build, then restart one dev server.

## Images

Generated with the built-in image generation tool; original PNGs retained under the Codex generated-images directory. Delivery assets are compressed 1920px-wide WebP files in `public/media/night/`:

- `community.webp`: supplied community mockup used as the reference; reconstruct its blue-hour coastal outlook with wheelchair traveler and companion, removing all UI/text.
- `coast.webp`: panoramic southern Korean coastal islands, blue hour and warm town lights, travelers on the right, quiet space for text on the left.
- `festival.webp`: panoramic night river, Korean pavilion, lanterns and restrained fireworks, dark left text space; conceptual banner, not an event record.
- `garden.webp`: coastal garden walkway and evening sea, gentle cyan/twilight palette and travelers to the right.

All prompts requested no generated lettering, logo, browser frame or UI. Sharp was used only for resizing/encoding the completed assets.

Specific community photos verified via the public KTO-backed API on 2026-09-20: 달아공원 (126661), 구조라해수욕장 (583071), 박서방식당 (2785742). Other story photos use the existing official spot-photo lookup or regional gallery, with the existing source link retained.

## Verification

- TypeScript and production build passed.
- Full ESLint: zero errors; existing/image-element/navigation warnings remain.
- Community unit checks: 21 passed. Schema/migration checks: 10 passed.
- Naru shared-state regression: 8 passed.
- Festival itinerary regression, updated for expandable card actions: 6 passed.
- Planner stage navigation: 4 passed, including 960px desktop.
- New desktop behavior/accessibility checks: 3 passed.
- Existing community field-report/journal browser checks: 2 passed; direct place search/storage-failure grid case passed.
- CSS gzip measured about 75.6 KiB. The total CSS budget is explicitly increased from 70 to 78 KiB for the three-route redesign. JavaScript budgets and the no-eager-auth/no-eager-map checks remain unchanged and pass. The landing authentication import was made lazy to preserve its initial-load constraint.

No final CI run or production deployment is claimed. A future release still requires the repository's normal checks and live backend verification.

## Secondary pages — owner-requested extension

The same desktop palette and navigation now cover login/register, password recovery/reset, account management/deletion completion, privacy/terms/operating policies, guide, local/account trip collections and editing, trip invitations, shared trips, companion editing, photo courses, outings, community details/editor/moderation, the existing example route and 404. Authentication forms and legal article text are retained. Account visuals reuse the generated coastal WebP; policy pages use compact headings, section navigation and readable dark tables. No new production data is created.

Service introduction source remains unchanged. Embedded Naru on the introduction is excluded from the night marker as well. Header login and registration preserve the safe return destination; duplicate footer utilities are removed on pages receiving the shared header.

Validation for this extension:

- Independent auth/validation/hydration/contrast/policy suite: 20 passed (mock APIs, not a live authentication service).
- Secondary route/navigation/accessibility suite: 17 cases passed across the final page run and two targeted contrast corrections. Includes 15 public routes, safe return navigation/introduction isolation and a populated shared trip.
- Account home/editor preservation suite: 7 passed, including API-failure recovery and opening a stored trip in the planner.
- Travel-book new-trip/photo restoration cases: 4 passed.
- Community field report/journal and share-link update/retry cases: 6 passed after button contrast corrections.
- Existing account-travel case passes its edit/conflict/accessibility and 1440/960px checks, then fails the embedded 390px viewport assertion. Mobile remains explicitly out of scope; that test was not weakened. Two other invite/privacy cases passed.
- Typecheck, targeted ESLint (0 errors, 1 pre-existing demo image warning), production build and performance check passed. CSS gzip is 77.94 KiB, within the existing 78 KiB redesign budget; unused auth header/journey styles were removed rather than expanding that budget. Landing initial JS is 140.19 KiB gzip.

Final local development command remains `WAVE_PUBLIC_PREVIEW=1 npm run dev -- --host 127.0.0.1 --port 4185` (set the environment variable using the current shell's syntax). Stop the dev server before building, then restart it. The preview reads public tourist data through the existing GET-only bridge; live account creation, account writes and local LLM inference still require the private local configuration and are not claimed verified.
