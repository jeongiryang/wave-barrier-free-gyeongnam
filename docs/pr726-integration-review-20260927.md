# PR #726 UI and integration review

The approved visual direction is retained. The review concentrates on usable controls, nested dialogs, account ownership of asynchronous responses, and Naru's proposal/apply/undo contract.

## Reproduced defects corrected

- An open custom select retained its desktop width after narrowing to390px. It now recalculates its bounds and keeps the active option visible and focused.
- Before application hydration, the custom select originally exposed only a disabled trigger while hiding the real select. The initial paint now exposes the native form control and progressively enhances it, preserving the selected value and focus. This keeps the landing search usable when application scripts are delayed or fail.
- Automatic intro playback no longer takes focus from a visitor already using the server-rendered page. Explicit replay and reduced-motion behavior retain their existing contract.
- Actual painted text exposed low contrast where a bright photograph overlapped the gradient title and description. A localized background behind the hero copy preserves the image, layout and gradient while improving readability. The regression measures glyphs against their rendered backdrop and includes an unreadable white-on-white control; equal foreground/background pixels cannot be silently discarded.
- Open calendars retained desktop coordinates. Calendars now reposition after resize. Ordinary modal parents no longer reopen unnecessarily, and Naru preserves its explicitly owned calendar above the parent through large/compact presentation changes. Focus and scroll are restored without reopening unrelated dialogs.
- A pending community like response could change state or show a global toast after logout or unmount. Response ownership now includes the account, article, and mount generation; stale success and failure responses cannot mutate the new context. Delete completion uses the same ownership guard.

Permanent regressions cover four viewport/menu/calendar paths and five late-response paths. Existing browser tests now choose options through the visible custom menu; the hidden native field is only read to verify the submitted value. Existing skips, semantic assertions and test coverage are retained while obsolete native-select and landing-control selectors are updated.

## Bounded evidence before CI

- Frontend: three-width journey plus nested guidance4/4; viewport regressions4/4; final nested guidance/Naru calendars3/3; short calendar keyboard navigation1/1.
- The same four viewport regressions also pass in Firefox and WebKit8/8; these browser engines are not physical-device verification.
- API/state: action feedback8/8, related comment/festival/storage regressions5/5, auth/community unit tests9/9.
- Independent harness QA: prior keyboard/Naru/save regressions12/12; five representative visible-select migrations5/5; language and duplicate-label helper boundaries pass.
- Delayed/failed application loading and native-to-custom selection/focus preservation11/11 pass. Other updated landing contracts retain keyboard navigation, real regional form submission, loaded photographs, readable content and the Naru example's apply/undo behavior.
- Related root unit tests41/41. Combined TypeScript check passes. Source lint has0 errors and33 existing warnings. The first local lint also scanned ignored downloaded trace bundles; `harness-results` now joins the existing generated-report ESLint exclusions, so ordinary local lint checks source rather than downloaded trace viewers. CI runs from a clean checkout.
- Local PR UI to the live approved local model and Production backend at1c2dd5f: prompt→official-place proposal→explicit apply→undo passed with source=local-llm, no page errors,2 inference POSTs and20 public GETs. Guest authentication and unrelated endpoints were blocked. This does not certify a new Production deployment or streamed-response timing; those require separate post-merge evidence.

Full Release Audit and required CI results are recorded on the PR/Actions for the exact candidate. A bounded test passing is not a claim that every specification item or physical assistive technology is verified. The previous physical-device limitations remain: browser viewport and accessibility checks do not observe native screen-reader speech or operating-system behavior.

Local detailed evidence is kept in the ignored `harness-results/pr726/` directory: frontend-review, api-independent-review, api-frontend-cross-review, qa-summary, and naru-real-integration reports. No account records were created by this review's synthetic tests.


## Full-audit follow-up

The first review candidate (22f4f8) did not pass CI. Two source-contract regexes still assumed the old JSX layout, and quick browser selection raced the server-native to custom-control handoff. The failed Release Audit was cancelled after preserving its logs, not counted as a pass. Its 34 failing files were assigned to four reviewers; obsolete copy, reading order, control locations and input/select semantics were mapped to the approved design without removing journeys or lowering accessibility thresholds.

Further reproduced product corrections:

- Community region buttons wait for the React search handler, while native help/region popovers remain usable during server rendering. A synthetic request test covers selection after hydration and category reset.
- The route result retains an explicit wheelchair-access limitation and on-site confirmation alongside its single-leg travel-time scope.
- English help close text and tooltip follow the selected language.
- On high-density mobile rendering, the gradient title clipped the comma's lowest pixels. Two pixels of inline-block padding preserve the original title and gradient.
- Text-sized photo labels, the Naru welcome bubble, policy links and visitor-information disclosure receive localized contrast corrections. The pixel helper measures actual glyph/backdrop positions; small opaque text uses its verified CSS colour to avoid interpreting antialiasing as a different authored colour.
- Rotating from the desktop place panel into a mobile modal no longer raises the parent above an open on-site communication dialog. Explicit opener ownership restores only that child stack, its focus and scroll position. Inquiry openers explicitly take focus before opening, so WebKit can return focus to the actual initiating button.
- Without IntersectionObserver, a new preview hook threw and unmounted the landing page. Presentation hooks now retain static content, handwritten glyphs are actually opaque, regional sound is unavailable when it cannot observe departure from view, and official photos use the existing bounded request queue without lazy observation. Cleanup continues to guard delayed work.

The navigation intentionally follows normal document flow in the approved design. Tests now verify its geometry, lack of overlap and keyboard return rather than restoring the previous hidden/sticky behavior. Pet/wellness limits are reached through the actual service-policy link; the same-place information, provider error/retry, telephone links and saved-trip preservation remain checked.

Bounded follow-up evidence: API/state owner 24 affected desktop/mobile cases passed; root's 16 desktop cases passed across the initial 11 successes and the final 5 corrected cases, and the same 16 mobile cases passed in one run. The complete unit suite passed 1,821/1,821; lint reported zero errors and 33 existing warnings. The final full Audit is still required for the eventual candidate. Raw failed runs and HMR-contaminated local runs remain in the local evidence directory.

Final local build and performance checks passed with CSS gzip 104.99/105 KiB, landing initial JS 152.28/155 KiB and planner initial JS 250.14/270 KiB. Duplicate CSS declarations were removed to retain the existing budget. These are local measurements, pending independent CI.

Firefox and WebKit both pass the new static no-observer and nested on-site dialog rotation checks (four engine/case pairs). The WebKit fixture waits for all 18 synthetic region-photo responses before full navigation, avoiding old-document request cancellation being reported as an access-control error. A first WebKit focus-return failure was reproduced and fixed in the inquiry opener; original failing logs remain preserved.

The final frontend pass resolves 16 representative cases, plus one new upward-tooltip/no-scroll regression and two mobile high-density contrast cases. A stationary pointer could trigger region hover while keyboard navigation returned to the header; the preview previously scrolled the page away again. It now chooses available space above or below without scrolling the document. Bright-photo tests first confirm image decode, and the solid-colour contrast path rejects transparent/different fills and opacity/filter/blending that would invalidate its measurement.

## Completed audit and final repair candidate

The full Audit on `3ff254d` completed: 2,342 passed, 99 failed, one flaky, and two existing device-duplicate skips across 2,444 cases. Thirty files contained failures. The run remains a failure, and its complete logs and per-case classification are preserved locally in `release-audit-status.json`. Quick CI separately rejected a first-arrival test that passed only on retry. No failure or retry was waived for merging.

The additional audit exposed these product defects, now covered by bounded regressions:

- Loading a different tab's current trip reapplied the old tab's region/date URL. Explicit recovery now clears only the obsolete travel criteria before loading the stored trip; current state and the archived prior trip remain checked.
- Naru's welcome animation masked running/completed/warning avatar states. Only an idle assistant now greets, preserving its actual execution state.
- On viewport changes, a focused weather action could move behind Naru's tabs. The viewport hook reveals that control within its own scrolling pane, preserving focus, page position and pinch zoom.
- Duplicate mobile itinerary gutters compressed the image-export drawer. Removing that duplicate gutter preserves the original minimum drawer width, export/retry, keyboard, touch-target and axe checks.
- Long English transport labels can wrap within their columns. Selected comparison actions and Naru's day-progress, budget, split/reunion and return-transport surfaces use their actual local palette instead of mixing dark and light tokens.
- Scrollable regional previews now support keyboard focus and Escape return. Tests wait for interactive controls before positioning a bottom-edge hover, rather than measuring an inert server copy.
- Itinerary coverage and the decision receipt retain a short wheelchair-access limitation beside the actual route evidence.

The revised UI contracts retain approved photographs, overlays, Korean handwriting, compact closing spacing and readable maximum form width on ultrawide screens. Their tests still verify containment, rendered contrast, actions, error recovery, and data preservation. Voice lifecycle tests explicitly use a returning visitor; first-arrival behavior remains separately covered.

The arrival clock failure was traced to real playback continuing during slow protocol/trace snapshots. Readiness now steps actual animation callbacks while paused, retaining the eight-second readiness bound, positive playback evidence and the exact completion boundary. Desktop/mobile dismissal, session memory, automatic completion and reduced-motion cases passed without retries.

The contrast mask also checks unchanged capture coordinates. Rounded/fractional edges are blackened behind the glyphs without dropping any rows. An experimental outline was rejected by independent QA because it hid the clipped-comma failure. The final shadow-based mask preserves the original failure and sample counts at all three high-density widths; restoring the product's two-pixel padding passes each width. Original paint/background captures remain unchanged.

Before the final remote candidate, local units passed 1,821/1,821, type checking passed, and lint had zero errors/33 existing warnings. Root's focused weather, voice and route matrix passed all 14 combinations across its initial 13 successes and one final route-selection recheck; the original failed local run and its CSS hot-update trace are retained. Fourteen visual follow-ups and the six mobile closing/public-page cases passed. QA's arrival, recovery, drawer and search-focus checks passed 28 cases. Naru/API and frontend owner reports preserve their own exact runs and initial failures separately.

The current local production build measures CSS gzip 104.99/105 KiB, landing initial JavaScript 152.26/155 KiB and planner initial JavaScript 250.21/270 KiB. The old Naru palette and overwritten declarations were removed; budgets remain unchanged. The final remote CI and complete Release Audit are still required for the new commit. Merge, exact-main CI/CD and Production UI plus real-model proposal/apply/undo verification follow only after those results pass.
