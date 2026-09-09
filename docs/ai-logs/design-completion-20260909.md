# Design completion — local work in progress

Owner authorized design-first completion of the introduction and working pages, reference review, generated imagery, and merge after verified quality. On 2026-09-09 the Owner asked to finish the existing release PR first. This commit preserves the new work while #391 is repaired and released.

Base: d42543332a856a04df9a8210146fd8d72e8c6b88. Existing worktree reused. No reset, clean, stash, new worktree, force push, dependency installation or data deletion.

## Current implementation (not release ready)

- Planner destination-first region chooser with official photographs and original credits; explicit selection remains neutral. Existing polygon map is available in a native disclosure. Region module is lazy-loaded.
- Compact workspace heading and navigation, larger facility choices and destination cards. Existing hooks/data/itinerary remain intact.
- Generated companions/coast image for needs and journal/sea image for community. Brand assets are separate from actual tourism evidence. Old assets remain untouched.
- Removed Hero replay and explanatory demo copy per Owner. Region auto sequence now visits each photo before advancing region.
- Actual Community opening uses a smaller editorial header so the board is closer to the first viewport.

## References observed

GitHub #384 body and Owner comment reject option 3. Downloaded all five PDFs and rendered pages locally; full page comparison is still in progress. #353/#385 current Bible read; relevant historic issue/PR bodies fetched to local audit files. Full requirements audit is not yet complete.

Hanwha Ocean homepage directly opened in browser on 2026-09-09: full-screen film and left-aligned short headline, ample white transition space, small photograph intersecting headline expanding to viewport edges, restrained right chapter rail. Previously recorded access restriction does not apply to this observation. More transitions remain to inspect.

## Generated assets

Built-in imagegen, no paid API credentials. Originals retained under Codex generated_images/01a085f8-315f-7783-beeb-b0b8111a9cd4.

- `companions-coast-v2.webp`: 1120×1400, 267132 bytes. Original exec-d0442d89-017d-4dfa-a5d9-3905af10057d.png. Prompt: premium inclusive coastal brand composition, three equal companions including wheelchair user, deep ocean and warm ivory palette, no real landmark or facility claim.
- `travel-journal-v2.webp`: 1440×960, 159760 bytes. Original exec-0c5c47a0-bc69-48c9-a879-09c52925d62d.png. Prompt: blank tactile travel journal on coastal ledge, blue sea, natural light, no text/logos/map or personal data.

## Verification / remaining

Typecheck passed before the final stylesheet/copy edits. First rendered Planner inspection found narrow rail grid overlap; explicit column positions have been corrected but not rechecked. No full QA or acceptance claim.

Pending: complete reference/issue/PR audit, responsive/theme/axe verification, CSS budget cleanup without changing budgets, active test contract migration after replay removal and album sequence change, itinerary/map usability, saved trips, functional bugs tracked by #388/#387, new real product captures for #386 after working pages settle. Current #391 remains OPEN and its required CI failed; no new design is deployed.
