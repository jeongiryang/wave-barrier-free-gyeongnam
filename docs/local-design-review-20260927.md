# Local design review — 2026-09-27

Local source: faa1 / preview http://127.0.0.1:4183. No deployment, push or commit.

## Final design direction

Use the WAVE logo's exact cyan #17d6ff, blue #1199ff and ice #85eaff, paired with navy surfaces and deeper blue for readable white action labels. Preserve existing photography and character identity. Cards retain photos covering their complete bounds. Reading areas alone use a restrained translucent navy surface with only 5% blue tint and 2 px backdrop blur; text shadows are reduced. Community authors/reactions and editorial reading links are explicit white, 14 px. Missing-photo messages avoid category badges. Card gaps are 20 px desktop / 16 px mobile. Detail/add actions retain distinct accessible names and 44 px targets.

Planner introduction uses responsive minimum heights over one full-width harbor scene. The earlier community background plus inset image was removed. Mobile framing keeps dialogue away from faces and feet. The torn-cheek hand deformation and yellow marks were removed; the latest request removes the waving scene entirely. Conversation and map-reading scenes retain gentle crossfades. The region control is a single filled button with a small external label and chevron, with no nested frame.

Home paper map retains real region boundaries and its perspective below the child's hands. The marker is a pointed coral-red pin, flat and without shadow. Illustrated districts now use bright WAVE cyan/blue shades, with subtle blue wave strokes, legible navy names and a pale label. All 18 region controls remain functional. Home assistant answers have a distinct bordered bubble.

Naru workspace: compact 44 px icon toolbar; reconnect beside the other controls; custom-help icon retains its accessible name and expanded state. Removed duplicate history and in-log tool shortcuts; the main tabs retain these destinations. Attachment options open above the composer and no longer expand its height or cover the trigger. Support choices, tools, saved content, desktop resize and close were exercised. The welcome bubble remains available after scrolling; explicit dismissal is respected. Structured community provider errors now show readable recovery copy instead of [object Object]. Small date labels have their own compact glass surface. The mobile WaveSelect blank-field CSS bug and initial accessible label were repaired. Stop-editor fields align at both widths.

Previous requested changes remain: full photo cards, same-row community bookmarks, compact help/region popovers, compact footer/GitHub icon, guest/auth account menus, reduced redundant auth/policy copy, retained contextual errors, removed redundant hero CTA and preview pause/footer, stable map selection independent of scroll.

## Earlier verification evidence (before the latest follow-up)

- Earlier broad browser review: 204 selected scenarios. Initial 187 passed / 17 failed; after repairs, 15 passed then final 2 passed. This is not a single clean 204-case run.
- Follow-up single-background/toolbar suite: 54/60 passed initially; six legacy native-select test interactions were updated for the custom combobox.
- Subsequent contrast/accessibility/community-density/Naru workspace run: 42/42 passed.
- Latest glass/card/icon regression run: 44/44 passed. Final structured-error recovery and welcome/story controls run: 24/24 passed.
- Final unit suite: 1731/1731 passed, including the last error-message/scroll-hint changes. TypeScript, focused lint and the final 24 browser cases also passed.
- TypeScript passes. Focused ESLint has 0 errors, 4 existing raw-image/navigation warnings.
- Independent bounded QA at 390/960/1440: single planner scene, face visibility, hand-safe pointed markers, bubble contrast; 390/1440 actual support/tab/menu/resize/close and region selection/Escape focus recovery. Attachment popup overlap found and fixed, then real open/close passed.
- Production build passed locally. CSS gzip 104.75 KiB; landing initial JS 152.17 KiB, planner 249.17 KiB, largest chunk 70.51 KiB. Removed superseded and duplicate style declarations first. The expanded local blur/toolbar/readability scope exceeds the previous 104 KiB CSS cap by 0.75 KiB; explicitly rebased to 105 KiB. JS limits and route-reference validation unchanged. Original earlier cap was 101 KiB before the full-site redesign.
- These are local fixture and bounded browser checks, not proof of every production button or live external authentication/provider integration.

## Image edit record

Built-in image_gen, precise-object-edit. Prompt: remove only the three yellow emphasis rays above Naru's raised hand, fill with surrounding water; preserve original 1536x1024 composition, character, face, bag, harbor, sky and colors. No new objects, text, cropping or distortion.

Final project asset: public/naru/night-journey-solo-clean.webp (1536x1024, 210558 bytes), converted from generated PNG to WebP with Sharp. Original source retained. The cleaned file was used in the earlier scene. The current header uses the recomposed pavement scenes below; the user subsequently removed waving scenes entirely. The animation deformation was removed in code, not painted over.


## Latest screenshot follow-up

- Planner: a single viewport-filling scene, re-composed desktop/mobile pictures. Naru and the child stand safely on the pavement, with the whole moon, faces and feet visible. Removed the waving scene at the user's later request. The two retained scenes are conversation and looking down at the map.
- The handwritten invitation starts large and centered for the first 1.2 seconds, then settles into its smaller position. The opening does not repeat on subsequent dialogue loops. Reply delay 0.8 seconds; first pair reading hold 1.8 seconds, final pair 2.4 seconds; title settles in 0.4 seconds. Reduced-motion mode renders the final readable state without the intro motion.
- Removed the two dialogue/map shortcuts above the footer. The floating Naru launcher and persistent welcome bubble continue to open the real workspace.
- Region photo circles now show credited representative regional photos while live photos load or fail. If all image candidates fail, an explicit photo placeholder appears instead of a hollow circle. Representative fallback copy is distinguished from live provider photos.
- Shared photo cards use text-sized 5% blue / 2px glass, no broad dark reading panels. Detail/photo hover title is “자세히 보기”; saved places display a check and “담았습니다” based on actual saved state; undo clears the feedback.
- Family keyword derives alcohol exclusion only while selected. Changing/toggling it releases that derived exclusion; an explicitly selected exclusion stays selected. Alcohol exclusion is beside the keywords.
- Community sort/view/bookmark/help controls share one wrapping toolbar. Help and regional shortcuts moved into compact popovers. Expanded saved posts have a compact explanation and a 24px gap before cards.
- Home demonstration chat matches the real pale Naru workspace, with bordered answer bubbles. Removed compass N. Map handwriting starts on map visibility. Added spacing after the example choices.
- Photo loading is a restrained blue shimmer without fake text bars behind real content. Full community loading cards share the real grid, corner radii, spacing and metadata/title/footer alignment. Reduced motion is respected.
- Calendar: removed the absolute-positioned close button that overlapped next-month navigation. Previous/month/next/close share separate grid cells with 44px button targets. Removed “오늘” at the user's request. Date bounds, keyboard navigation, nested-dialog Escape and focus return remain.

## Latest verification

Local preview http://127.0.0.1:4183, working tree with existing cumulative edits. No Production claims.

- Latest selected browser behavior run: 8/8 (family toggle, persistent Naru welcome, map handwriting, earlier scene flow).
- Final two-scene/central intro/footer removal checks: 8/8 at desktop and mobile projects, including 390/960/1440 story controls.
- Place feedback/view/undo/reload and direct-search feedback: 4/4, including axe on the place section. Initial test failures were an obsolete fixed text-panel width assertion and a non-numeric fixture place ID rejected by the real command validator; corrected fixtures/contracts without loosening production validation.
- Calendar/skeleton follow-up: 8/8 (nested settings, partial input, invalid dates, min bounds, navigation, close/Escape focus, axe calendar, held network loading then decoded photo). These provider responses are controlled fixtures, not live-provider certification.
- Independent real-photo QA: readable bright editorial and planner photographs at 5%/2px; live local planner add showed “담았습니다” and undo removed it. Community post bodies remained loading during that live check and are not claimed as live-verified; fixture browser rendering is separately checked.
- Independent hero QA 390×851 and 1440×960: only two images, centered large title settling, map crossfade, full moon/faces/feet, mobile dialogue below the feet, full viewport background.
- Logs: C:/Users/admin/wave-final-scene.log, wave-feedback-verified.log, wave-calendar-skeleton-final.log, wave-skeleton-types.log, wave-skeleton-lint.log.

## Re-composed scene assets

Tool: built-in image_gen.imagegen, reference-image editing; PNG to WebP format conversion only. Active assets:

- public/naru/planner-harbor-grounded-v4.webp — desktop dialogue (1536×1024)
- public/naru/planner-harbor-mobile-v1.webp — mobile dialogue (1024×1536)
- public/naru/planner-harbor-map-desktop-v1.webp — desktop map-reading
- public/naru/planner-harbor-map-mobile-v1.webp — mobile map-reading

Prompt brief: preserve the exact Naru and little traveler designs, blue-hour Korean harbor, warm lamps and full moon. Recompose for the responsive hero so both full bodies stand on the flat stone pavement in front of the railing, not on top of it; keep text-safe sky and prevent the moon being cropped. For the map variants, keep camera/background/lighting/moon/feet positions unchanged and have both characters look down at the open map with Naru pointing. No letters, UI, added frames, yellow emphasis marks or split backgrounds. The waving variants are not consumed by the UI after the user's later correction. RGB checkerboard trials were rejected and never used as transparent cutouts.


Final local build and static checks after calendar/skeleton changes: PASS (TypeScript, focused ESLint with zero warnings, production build, unchanged 105 KiB CSS performance budget). Independent calendar QA also passed at 320/390/1440: separate 44px navigation/close targets, no horizontal overflow, no Today action, next/previous click and close/Escape focus restoration.

Evidence: C:/Users/admin/wave-calendar-final-types.log, wave-calendar-final-lint.log, wave-calendar-final-build.log, wave-calendar-final-performance.log. Screenshots copied to the parent workspace local-review directory. No new broad unit-suite or Production run is claimed for these visual follow-ups.


## Final screenshot follow-ups (2026-09-27)

- Departure and festival homepage sections now place their visuals on the left and copy on the right at desktop widths, stacking on mobile. Eight feature cards use short titles and one-line descriptions. Closing copy is one title plus one subtitle.
- Official statistical/course cards open a detail dialog instead of moving the visitor into a search field. A named candidate is not a fabricated place ID: the dialog fetches official records, filters name/region, shows the address and provides add/review actions for the selected real record. Empty and provider-error responses differ; retry is available. Required unknown facilities need acknowledgement; required absent facilities block add. Generic source/method limitations are collected under 운영정책 → 여행 정보와 추천 기준, while contextual evidence and failures remain visible.
- Information and add are distinct icons on unknown-result cards. Place, official-candidate, festival and community bookmark icon buttons share a 44px translucent navy circle. Successful writes retain saved/checked state and show a 2.8-second toast. The toast uses translucent navy, pale cyan text and a cyan border. Undo/removal and server/storage errors have accurate messages. Festival navigation carries the success toast into the planner. Like success waits for the server, blocks duplicate clicks while pending and supports cancel feedback.
- Festival expansion no longer changes photo height or clips tooltips. Status badge placement and date/action layout corrected; actual add action is labeled. Region/select gap is 10px; festival text input uses the community search navy background with visible border and 44px minimum height. Result-heading padding is 28px above and 20px below.
- Gradient headings now visibly animate across cyan/blue with a 2.4-second eased movement in each direction. Removed styles that disabled the animation. Reduced-motion mode keeps the gradient static. Hero dialogue has pale-blue borders and directional rounded corners. The real Naru composer shows the caret without a focused textarea outline.
- Naru welcome closes for the current tab session (sessionStorage), surviving route changes and reload. A fresh tab shows it again. The earlier permanent localStorage dismissal no longer hides it forever. Community previous/next buttons use matching chevrons.

### Verification for this follow-up

Local preview only; API-shaped controlled fixtures for behavior, no Production certification.

- 10/10 targeted browser cases: candidate matching/error recovery/consent/add/toast, like success/cancel/failure, actual festival visit-date preservation, photo identity, faster intro/dialogue (desktop and mobile).
- 6/6 additional cases: blocked local trip writes do not show success, late comment refresh preserves a newer like, unknown candidates retain explicit consent and dates/needs.
- 6/6 after centralizing saved-action toast delivery: official candidate, likes and blocked storage writes.
- Final hint-session checks 2/2: dismissal survives navigation/reload; new tab shows the hint. Final intro checks 2/2 passed with the 1.2-second intro.
- Independent visual QA: desktop/mobile homepage side ordering, eight compact feature cards, short closing, no horizontal overflow; 390/1440 hero transition and uncut text. Expanded festival photo dimensions stable, date/CTA areas fit and tooltips visible. Gradient background position changed 3.18%→61.64% over 1.05 seconds; reduced mode stayed stationary. Festival desktop search target measured 44px. Subsequent navy-tone change is local styling, not an additional independent QA run.
- Self visual inspection in the in-app browser confirmed Naru's focused composer has no cyan outline. Latest screenshot-only tweaks use the same tested controls and handlers.
- TypeScript and production build PASS. Focused ESLint: 0 errors, 6 existing image/internal-navigation warnings; the zero-warning command did not pass and is not claimed to have passed.
- Final unchanged performance limits PASS: CSS gzip 104.98 KiB (limit 105); initial landing JS 152.09 KiB (limit 155); planner JS 249.70 KiB (limit 270). Removed superseded rules; no budget increase.
- Logs: C:/Users/admin/wave-current-browser.log, wave-feedback-regression.log, wave-toast-final.log, wave-hint-session.log, wave-complete-types.log, wave-complete-lint.log, wave-final-ui-build.log, wave-final-ui-performance.log.


## PR preparation against current main (2026-09-27)

- Rebased the complete owner-approved design onto origin/main 1c2dd5fb, retaining the upstream Naru textarea height and accessibility fixes. Matched calendar next/previous chevrons.
- Removed the retired footer component and stale test references. Updated the quick-suite title and exercised custom selects through their visible options, retaining form-value assertions.
- Naru focus recovery now includes the welcome bubble bounds so restored/keyboard focus is not covered. Responsive checks exercise actual focus at 1440/1180/960/641/390.
- Full unit suite: 1,821 passed. TypeScript passed. Full ESLint: zero errors, 33 warnings; touched follow-up files also passed focused lint. Harness check passed. npm audit: zero vulnerabilities.
- Production build and performance passed. CSS gzip 104.97 KiB, landing initial JS 152.11 KiB, planner initial JS 249.72 KiB before the final tiny focus-bound calculation; final measurements are in the PR log.
- Whole-PR CSS budget is explicitly 96 -> 105 KiB for the cumulative redesign. Earlier 'unchanged' statements refer only to later follow-ups. JavaScript budgets are unchanged. Removed unused CSS instead of raising the 105 KiB limit after integrating main.
- Quick browser suite: 52/54 passed; the two responsive failures were corrected, then both passed in their targeted rerun. Controlled provider/auth fixtures, local Chromium. CI reruns the complete 54-case contract after push.
- No release-wide audit or live Production certification is claimed. Five unreferenced image experiments remain local and are excluded from the PR.
