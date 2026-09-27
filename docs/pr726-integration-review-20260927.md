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
