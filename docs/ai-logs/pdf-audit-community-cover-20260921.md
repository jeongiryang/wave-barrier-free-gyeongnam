# PDF audit: community cover layout (2026-09-21)

- Scope: populated community cards (PDF pages 9/22); separate from the opt-in demo-data change.
- Finding: the cover used content-sized centered grid alignment. With SmartSpotImage metadata hidden, its absolutely positioned photo contributed no intrinsic width, leaving a 36px strip within the full card cover.
- Change: remove the obsolete icon-cover padding and stretch one minmax(0,1fr) grid column. Existing cover height, crop, card variants, mobile thumbnails, and list visibility remain in control of their existing rules.

## Executed validation

- Read-only browser reproduction on author-owned Vite http://127.0.0.1:4181 using two ordinary post API fixtures without demo metadata. Photo transport was fulfilled with the repository's public/media/wave-story/hero-coast.webp; this verifies rendering, not the external photo provider.
- Desktop 1440 card: cover 490.80 x 280; photo before 36 x 225, after 490.80 x 280.
- Desktop 960 card: cover 295.19 x 280; photo before 36 x 225, after 295.19 x 280.
- Compact covers at 1440/960/390: after photo widths 238.89/141.09/172 respectively, matching their cover widths; heights 280. Before every photo was 36 x 225.
- Mobile 390 card thumbnail remains 68 x 68. List covers remain hidden at all three widths. Document horizontal overflow is zero for all nine width/layout combinations.
- Captured before/after screenshots under local tmp/community-cover-{before,after}-{1440,960,390}.png and inspected after desktop/mobile images. Local script and screenshots are review evidence, not committed build inputs.
- E2E_BASE_URL=http://127.0.0.1:4181 E2E_EXECUTABLE_PATH=C:/Users/user/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe node node_modules/@playwright/test/cli.js test e2e/community-density.spec.ts --workers=2: 6 passed (25.1s). Covers existing desktop/mobile density, hydration, filtering, focus, no overflow, and scoped accessibility assertions.
- Node executable: C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe. Browser executable override used because the expected bundled Playwright revision is unavailable.
- git diff --check passed.

## Boundaries

No demo data or API behavior changed. No Naru interactions, LLM calls, Production writes, merge, or deployment. Risk-based checks were authorized; no full CI run was claimed. Independent QA will replay the actual-SQL demo payload integration after this commit.
