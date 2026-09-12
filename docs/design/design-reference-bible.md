> 2026-09-12 여행 설계 개편: [나루 대화와 좌우 작업 공간](planner-naru-workspace-20260912.md)의 새 레이아웃을 적용한다. 기존 정보 근거·대비·키보드 기준은 유지한다.

# W.A.V.E Design Reference Bible

Latest Owner follow-up, 2026-09-11: the region section immediately below Hero adopts eight's `PLACES TO BEGIN` landscape cards. Keep all 18 albums and controls; the earlier full-frame presentation is superseded. My Travel adopts the same scenery/editorial rhythm. Three WAVE-authored starter articles supply the requested community examples without fictional member activity. Headers blend into pale blue product surfaces and use dark translucency over Hero. Existing functionality, Korean public defaults and mobile accessibility remain required. [Implementation and evidence](../ai-logs/20260911-scenery-card-refinement.md).

Canonical design entry · Owner #385 / implementation #353 · 2026-09-09 KST.
Read this before any design change, together with [design tokens](../design-system.md).
This is a design contract, not a claim that the current candidate is released or Owner-approved.

## Latest Owner amendment — 8 + 10 integration, 2026-09-11

Owner approved implementation of the 공모전S2 2026-09-10 23:09–23:36 decisions and the [design studio](https://wave-design-studio-iryang.jeongiryang03.chatgpt.site/). This supersedes the presentation choices in pass 6 below. The complete decision provenance and function-preservation map are in [the integration record](eight-ten-integration-20260911.md).

- 8's full-width Hero and three scrolling preparation chapters, with 10's editorial type, pale surfaces and spacing. Remove the left preparation demo card; keep chapter numbers and real product functions.
- Hero → all 18 regional albums → three preparation chapters → account/Kakao/companions on the retained sea scene → 10's predeparture checklist → two-photo community invitation → `다음 풍경에서 만나요.`. No duplicate attraction cards or fictitious community posts.
- All existing regional photographs, authors, links, stop/resume and keyboard behavior remain. Three photographs from the approved studio carry their individual Commons authors, CC BY-SA licenses and derivative disclosures in `/policies#horizon-photo-credits`.
- Native scrolling changes backgrounds; text stays in the document. Reduced motion removes crossfade. Intro and bounded Hero sequence, focus-safe navigation and primary Planner links remain.
- Product pages use 10's layout + 8's four-step progress + the working date calendar. Region/facility/activity/search remain connected; separate Places and Itinerary buttons preserve both views. Community adds card/list presentation of real posts, and saved/account trips, guide and photo courses share the pale surfaces. Login redesign is deferred.
- Implementation status: landing PR #460 is merged and Production CD 34504389521 passed for `c24878d`. Product-page evidence follows in its PR and [integration record](eight-ten-integration-20260911.md).

## Historical Owner amendment — pass 6, 2026-09-09

This supersedes earlier Hero/demo pause/replay controls and hover-expanded chapter navigation in this document. The continuously rotating regional photographs retain their own accessible stop/resume control; previous decisions remain historical evidence.

- REFERENCE: Owner review of the pass 5 screen; existing cinematic region/departure chapters.
- PATTERN: destination photo montage, permanently visible editorial chapter index, animated selection/composition inside real product vocabulary.
- W.A.V.E APPLICATION: each region shows ≥2 distinct tourist photographs (Changwon 3); remove n/18 decoration. Recommendation uses a large real Daesan panorama and the preserved product capture. Needs selections lift and highlight; Community writes a question into a layered composition.
- WHY: scenery and visible use should carry the story; control panels and validation copy should not dominate it.
- ACCESSIBILITY: OS reduction/SaveData keep complete static demos; offscreen/hidden tabs suspend timers. Demos play a bounded 4.2s sequence on each fresh entry. Hero plays A → B → C → A once and settles on A, including after scroll-away/return, with a stable accessible heading/CTA and no repeated live announcements. Intro runs once per session with an immediately usable skip control. Hero/demos have no replay controls. Regional photos have a first-tab stop/resume button. Focus, mouse entry, manual selection and motion/data reduction stop rotation until explicit resume; leaving or releasing a preference never restarts it. Native chapter links remain keyboard reachable.
- PERFORMANCE: reuse React/CSS/scroll progress; no dependency or provider architecture changes. Only the active region's album renders with lazy images. While visible, only the next adjacent album is warmed at low priority; offscreen/hidden/SaveData disables speculative loading. Source/author/original-URL metadata is unchanged. No new long-running animation loop in the demonstrations.
- RESULT: LOCAL WIP. Photo albums and chapter rail implemented; all three flat chapters restyled. Full CI/Preview/Production and Owner visual acceptance are pending.
- GAP: individual attribution/use conditions for additional official photographs need final confirmation before release. A local screenshot is not Production evidence.

## Product brief — fixed by Owner

W.A.V.E는 경상남도에서 사회적 약자의 관광 편의를 지원하는 무장애 여행 서비스다.
휠체어 이용자·이동약자·장애인·고령자·영유아 동반자가 1차 사용자이며 모든 여행자가 함께 이용한다.
접근 가능한 장소 탐색, 이동 계획, 흩어진 시설정보를 연결한다. 무장애 관광지·지도·경로·교통이 우선이고 지역·축제 정보는 이를 돕는다.

**최상위 원칙: SCROLL-ONLY COMPREHENSION.** 소개를 펼치거나 탭을 눌러야 이해되는 구조는 실패다.
스크롤만으로 필요한 편의 → 경남 탐색 → 추천 → 날짜·일정 → 지도·이동 → 출발 전 확인을 이해한다.
Primary CTA는 **여행 계획하기** 하나다. 지역으로 시작, 커뮤니티 이동은 문맥에 맞는 secondary action이다.

현재 소개 순서: Full-screen Intro → Hero → **Region Showcase** → Accessibility → Recommendation → Departure → Community → Closing.

2026-09-09 후속 Owner 결정: [#353 상세 수정](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/353#issuecomment-5600307264), [#385 변경](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/385#issuecomment-5600315615).
날짜·일정·지도는 **실제 핵심 기능으로 유지**, 소개 장면만 [#386](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/386)에 DEFERRED. “여행의 가능성을 넓히다 / 걱정은 덜고 설렘은 더 멀리” 독립 장면은 현재 구성에서 제거한다. 새 빈 장면으로 대체하지 않는다.
실제 렌더와 진행 표시의 단일 목록은 `features/landing/sections.ts`의 7개 항목이다. [#387](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/387) 경로 거리·시간은 후속 FUNCTION TRACK이며 이번에 구현하지 않는다.
KO-first. 기존 locale 구조는 유지하지만 EN polish 때문에 한국어 완성을 지연하지 않는다.
한화오션의 시네마틱 품질, 카카오의 정보 절제, 여행 에디토리얼의 사진 구성을 W.A.V.E 고유의 Deep Ocean·무장애 가치와 결합한다. 브랜드·코드·사진·정확한 레이아웃을 복제하지 않는다.

## Reference evidence and limits

| Source | 직접 확인한 내용 / 제한 | 적용 범위 |
| --- | --- | --- |
| [Hanwha Ocean](https://www.hanwhaocean.com/) | 2026-09-09 실제 브라우저에서 직접 확인. 전면 영상과 왼쪽 짧은 제목, Who We Are의 여백·사진 확대, What We Do의 비대칭 제목/선박 사진, LNGC·FPSO·잠수함 가로 장면을 관찰. 자산·코드·정확한 레이아웃 미복제. | 장면 확대와 전환, 비대칭 사진·타이포, 절제된 인덱스 |
| [Kakao corporate](https://www.kakaocorp.com/page/) | 공식 페이지의 짧은 서비스 문구, 서비스/스토리 구조, 본문·메뉴 skip link 확인. 애니메이션의 프레임별 육안 검증과 구분. | 한국어 한 메시지, 명확한 action |
| [SiteInspire](https://www.siteinspire.com/) | 공식 갤러리와 Typography / Photography / Unusual Layout 분류 확인. 개별 작품의 동작·라이선스 검증을 대신하지 않음. | 비대칭·큰 사진 후보를 찾는 색인 |
| [Land-book](https://land-book.com/) | 403, **NOT DIRECTLY VERIFIED**. 여행/에디토리얼 탐색 후보로 보존; 미확인 페이지를 관찰 사례로 꾸미지 않음. | 후속 큐레이션 |
| [Codrops: expanding image within typography](https://tympanus.net/codrops/2024/04/02/on-scroll-expanding-image-animation-within-typography/) | 이미지가 확장되며 타이포 공간을 바꾸는 공식 실험 설명 확인. 저자도 반응형 난점을 명시. | 장면의 프레임 변화; 예제 코드 미복사 |
| [Codrops: fullscreen clip demo](https://tympanus.net/Development/FullscreenClipEffect/) | 공식 fullscreen clip 실험과 toggle 구조 확인. 설명용 toggle은 W.A.V.E에 가져오지 않음. | Intro cut의 clip 원리 |
| [Palm Studio](https://palmstudio.co/) | 호텔·여행 사진을 장소의 분위기와 짧은 이야기로 연결하는 원 제작자 소개 확인. 사진/문구를 가져오지 않음. | destination-led editorial |
| [shadcn carousel](https://ui.shadcn.com/docs/components/base/carousel) | Embla 기반 구성·이전/다음 구조 확인. 자동재생이 접근성을 보장한다는 뜻은 아님. | 이름 있는 arrow와 상태 일치 |

## Reusable patterns — Reference → Pattern → W.A.V.E

### 01. Full-screen brand opener
- **REFERENCE:** Owner Hanwha 관찰 + Codrops fullscreen clip.
- **PATTERN:** 바다 → 무장애 형상 → wordmark, 하나의 전체 화면.
- **WHY IT WORKS:** 정보 입력 전에 서비스의 태도를 기억하게 한다.
- **W.A.V.E APPLICATION:** 기존 WaveField·v3 해안 영상을 전면화, Skip만 유지.
- **DO NOT:** 작은 Hero panel을 Intro라고 부르기, 긴 loading, 중복 wordmark.
- **ACCESSIBILITY:** native dialog, 처음부터 Skip, Escape/Tab/복귀, OS·Save-Data 정적 완성 상태.
- **PERFORMANCE:** 기존 짧은 무음 영상 하나; 재생 종료/hidden에서 정지. 추가 WebGL 라이브러리 없음.
- **IMPLEMENTATION CANDIDATE:** LandingIntro / arrival CSS.

### 02. Intro → Hero cinematic cut
- **REFERENCE:** Owner Hanwha 관찰 + Codrops clip.
- **PATTERN:** 위로 걷히는 mask 아래 Hero 사진이 열리고 제목·본문·CTA가 짧게 이어짐.
- **WHY IT WORKS:** 종료 버튼과 별개인 두 화면 대신 같은 이야기의 다음 장면이 된다.
- **W.A.V.E APPLICATION:** 620ms exit와 약 1초 이내 Hero reveal; 제목/본문/CTA stagger.
- **DO NOT:** focus를 다시 빼앗기, CTA disabled, 긴 curtain 뒤 대기.
- **ACCESSIBILITY:** reduced-motion에서는 즉시 완성 상태; DOM/포커스 대상 유지.
- **PERFORMANCE:** 짧은 WAAPI transform/clip; runtime reduction 시 cancel.
- **IMPLEMENTATION CANDIDATE:** LandingIntro.finish / LandingHero.

### 03. Photograph + one Korean headline
- **REFERENCE:** Kakao 서비스 메시지 + Palm Studio의 장소 이야기.
- **PATTERN:** 큰 visual, 한두 줄 제목, 한 문장, 하나의 primary action.
- **WHY IT WORKS:** 서비스 가치와 첫 행동의 경쟁을 줄인다.
- **W.A.V.E APPLICATION:** 첫 문구 “필요한 편의부터, 내게 맞는 경남 여행.”을 유지하고 B/C 두 문구를 6.5초마다 줄 단위로 전환. Intro 종료 뒤 A부터 시작. `여행 계획하기` 위치·문구·목적지는 고정한다.
- **DO NOT:** 큰 흰 설명 카드, 동급 CTA 네 개, 제작 과정 배지.
- **ACCESSIBILITY:** 고정 scrim, 고정된 SR용 대표 제목, 순환 live announce 없음. visible 재생·정지·다시보기 조작 없이 3개 문구를 한 번 보여준 후 첫 문구에 멈춤. 화면 밖·비활성 탭 정지, OS 감소·Save-Data에서 A 정적. 모든 문구가 공유하는 grid 높이로 CTA 이동 방지.
- **PERFORMANCE:** Hero image priority, 반복 영상 download 없음.
- **IMPLEMENTATION CANDIDATE:** LandingHero / StoryMedia.

### 04. Region as a changing destination
- **REFERENCE:** Owner representative switching + shadcn의 명명된 arrow 구조.
- **PATTERN:** 사진·지명·짧은 이야기·지역 시작 링크가 하나의 상태로 전환.
- **WHY IT WORKS:** 지도 설명을 읽기 전에 경남의 여행 범위를 느낀다.
- **W.A.V.E APPLICATION:** Hero 바로 뒤, 18개 지역 각각 최소 2장의 실제 KTO 관광사진. 사진마다 4초, 해당 지역 앨범을 마친 후 다음 지역으로 이동. 수동 이전/다음 및 사진 선택. 큰 제목·kicker 없이 기존 1rem/400 본문 “남쪽 바다에서 깊은 산자락까지. 마음이 머무는 곳을 찾아보세요.”만 남긴다. 사진·저작자·출처 링크가 같은 항목에서 전환된다.
- **DO NOT:** 포커스 진입·수동 선택 뒤 임의 재시작, Hero 재생/정지 CTA, 사진과 링크의 지역 불일치.
- **ACCESSIBILITY:** 지역 자동 전환 제어가 첫 Tab 대상이다. focus/hover/reduced/SaveData로 멈추면 명시적 재개까지 유지한다. offscreen/hidden은 타이머를 보류한다. 동작을 나타내는 변경형 버튼 이름을 사용하고 aria-pressed는 중복 적용하지 않는다. 자동 변경은 live announce하지 않는다. [W3C carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/).
- **PERFORMANCE:** 선택 사진만 lazy load, API/provider 호출 없음, Save-Data rotation 중지.
- **IMPLEMENTATION CANDIDATE:** LandingRegionStory / region-photo-sources. [사진별 출처 원장](region-photo-source-register.md): 확인된 상세 페이지만 연결하고, 미확인은 정확한 원본 이미지로 명시한다. 기관 홈·임의 상세 ID로 대체 금지.

### 05. Small frame → viewport edge
- **REFERENCE:** Owner Hanwha 관찰 + Codrops expanding typography 실험.
- **PATTERN:** 여백 속 프레임 자체의 좌우 경계가 viewport edge에 도달.
- **WHY IT WORKS:** 단순 사진 zoom보다 장면 전체가 열리는 변화를 만든다.
- **W.A.V.E APPLICATION:** 지역 chapter에서 작은 frame → 실제 full bleed. 삭제한 독립 panorama 장면을 재배치하지 않는다.
- **DO NOT:** 카드 내부 image scale만 증가, 완료 후 radius/shadow/gutter 잔존.
- **ACCESSIBILITY:** native wheel, 역스크롤 가역, 정적 expanded fallback, 텍스트 상시 제공.
- **PERFORMANCE:** clip frame + 단일 scroll RAF; sticky spacer·scroll-jacking 없음.
- **IMPLEMENTATION CANDIDATE:** data-cinematic / region-stage. 원본 LandingExpansionScene·자산은 보존만 한다.

### 06. Asymmetric needs story
- **REFERENCE:** SiteInspire Photography/Unusual Layout 색인 + editorial 원리.
- **PATTERN:** 사람의 경험을 담은 이미지와 실제 편의 선택 UI의 비대칭 결합.
- **WHY IT WORKS:** 대상 사용자를 유형으로 단정하지 않고 필요한 시설로 설명한다.
- **W.A.V.E APPLICATION:** v1 동행 visual + 실제 profiles 카탈로그를 재사용한 읽기 전용 선택 DOM. 접근로/승강기 → 시각 정보 지원 → 2개 선택 요약을 화면 진입 때 1회(4.2초) 보여준다.
- **DO NOT:** 가족/휠체어 유형에 기능을 고정, 여러 동일 feature card.
- **ACCESSIBILITY:** 이미지 alt는 concept과 실제 UI를 구분; 핵심 편의는 텍스트에도 존재.
- **PERFORMANCE:** 기존 WebP lazy, 로컬 표현 상태만 사용. 화면 밖/hidden 정지. OS·Save-Data는 최종 선택 요약 정적. 실제 Planner 저장/설정/API 호출 금지.
- **IMPLEMENTATION CANDIDATE:** LandingManifesto.

### 07. Real destination, visible evidence
- **REFERENCE:** Palm Studio destination narrative + W.A.V.E 실제 추천 UI.
- **PATTERN:** 실제 장소 사진 → 장소 이름 → 확인/미확인 근거.
- **WHY IT WORKS:** 관광 감성과 실제로 갈 수 있는지의 판단을 연결한다.
- **W.A.V.E APPLICATION:** 실제 창원 두 장소 capture와 접근로·화장실/승강기 미확인 표시.
- **DO NOT:** 가상 풍경을 시설 증거로 사용, 모든 편의 확인 주장.
- **ACCESSIBILITY:** 중요 미확인 안내는 accordion 밖; screenshot 내용을 텍스트로도 제공.
- **PERFORMANCE:** 원본 watermark 보존, 같은 asset 재사용.
- **IMPLEMENTATION CANDIDATE:** Recommendation chapter.

### 08. Dates become a visible itinerary — DEFERRED #386
- **REFERENCE:** Codrops progressive space + 실제 W.A.V.E timeline recording.
- **PATTERN:** 앞뒤 날짜 상태를 스크롤 순서로 함께 노출.
- **WHY IT WORKS:** 설명 탭 없이 장소를 날짜에 놓는 의미를 이해한다.
- **W.A.V.E APPLICATION:** 현재 Landing에서 제외. 기존 첫날/둘째 날 capture·manifest·LandingJourneyScene 보존. 실제 사용화면 재설계 후 #386에서 새 시연을 만들고 동일 날짜/장소 계약으로 재도입한다.
- **DO NOT:** 설명용 tabs/date buttons, 날짜·ID를 임의 생성.
- **ACCESSIBILITY:** 읽기 순서 동일, captions/date/place names 상시 visible.
- **PERFORMANCE:** static DOM, lazy WebP, no planner hydration/request.
- **IMPLEMENTATION CANDIDATE:** LandingJourneyScene.

### 09. Itinerary → map continuity — DEFERRED #386
- **REFERENCE:** 실제 제품 UI + editorial adjacent composition.
- **PATTERN:** 바로 앞의 장소·날짜·순서가 지도에도 같은 식별자로 이어짐.
- **WHY IT WORKS:** 지도 기능 나열보다 여행 하나가 연결됨을 보여준다.
- **W.A.V.E APPLICATION:** 현재 Landing/anchor/진행 목록에서 제외. 기존 before/day1/day2 원본은 보존. #386 완료 전 소개의 필수 장면이나 출시 개선으로 계산하지 않는다.
- **DO NOT:** 직선거리 추정을 실제 도로 경로로 표현, 무관한 stock map.
- **ACCESSIBILITY:** 지도 이미지 밖에 장소와 이동 한계 텍스트; 정보 click 의존 금지.
- **PERFORMANCE:** 지도 SDK를 Landing에서 추가 load하지 않음.
- **IMPLEMENTATION CANDIDATE:** Map chapter.

### 10. Departure as a calm chapter
- **REFERENCE:** 여행 editorial 큰 사진 + Kakao 짧은 카피.
- **PATTERN:** 넓은 풍경 위 하나의 메시지, 날씨·이동·시설 세 판단.
- **WHY IT WORKS:** 계획의 끝을 실제 출발 준비로 연결한다.
- **W.A.V.E APPLICATION:** 남해 실제 사진, 아직 미확인인 시설 안내와 전후 chapter 연결.
- **DO NOT:** 가짜 실시간 날씨/혼잡 숫자, 큰 기술 상태표.
- **ACCESSIBILITY:** 대비 scrim, 색 대신 글자, reduced static.
- **PERFORMANCE:** 사진 한 장, provider 호출 없음.
- **IMPLEMENTATION CANDIDATE:** LandingDepartureScene.

### 11. Community shown as a product
- **REFERENCE:** W.A.V.E CommunityPostList / CommunityEditor 자체 UI.
- **PATTERN:** 장소에 연결된 글/현장 확인 구조를 큰 DOM visual로 보여줌.
- **WHY IT WORKS:** 긴 기능 설명보다 경험이 어디에 모이는지 보인다.
- **W.A.V.E APPLICATION:** 실제 editor의 여행 질문/지역/제목/내용 항목을 읽기 전용으로 구성. 제목과 내용의 구성을 4.2초 동안 1회 보여준다. Owner 지시에 따라 제작·검수·예시 문구를 제거하며 별도 disclaimer로 대체하지 않는다.
- **DO NOT:** 가짜 사용자·후기·좋아요 수·작성일·실시간 activity.
- **ACCESSIBILITY:** 핵심 의미는 재생 없이도 전달한다. OS·Save-Data는 최종 정적 상태이며 SR 반복 낭독과 다시 보기 제어가 없다.
- **PERFORMANCE:** 실제 write/auth/API/storage hook import 금지. 화면 밖/hidden에서 타이머 중지, 추가 미디어 다운로드 없음.
- **IMPLEMENTATION CANDIDATE:** LandingCommunityStory.

### 12. Closing + navigation restraint
- **REFERENCE:** Kakao 행동 위계 + Owner Hanwha chapter rhythm.
- **PATTERN:** 마지막 큰 visual·짧은 invitation, 아래로 읽을 때 nav가 물러남.
- **WHY IT WORKS:** 시각 흐름을 가리지 않으며 돌아올 길과 다음 행동은 남긴다.
- **W.A.V.E APPLICATION:** v2 harbor closing, primary CTA; up 즉시 nav, down threshold, gear/help icons. 우측에는 같은 수직선상의 번호와 작은 섹션명을 항상 표시하고 native anchor로 이동한다. hover·focus 확장 패널은 pass 6 Owner 결정으로 제거했다. 모바일은 44px 현재/전체 native selector. 긴 통합 출처는 `/policies#content-credits`로 이동.
- **DO NOT:** 빈 min-height, 반복 summary grid, focus/menu 안 nav 숨김.
- **ACCESSIBILITY:** nav focus 즉시 reveal, 44px 이름 있는 icons, reduced static show/hide. 진행도는 페이지 탐색이며 준비율이 아니다. Intro 중 숨김, Escape/Tab/터치 지원, desktop 우측 안전 여백과 모바일 하단 여백으로 본문·CTA 충돌 방지.
- **PERFORMANCE:** 기존 RAF 공유, dependency 추가 없음.
- **IMPLEMENTATION CANDIDATE:** LandingClosing / LandingHeader / useLandingMotion.

## Open-source evaluation — no packages added

2026-09-09 GitHub API의 LICENSE·package.json·default HEAD를 직접 읽었다. 아래 비용은 **정성 평가**다. 문서 사이트 dependencies 전체를 component 번들 크기로 오인하지 않는다. 실제 gzip 측정/브라우저 접근성 검증은 하지 않았으며 사용 전에 필요하다.

| Candidate / inspected HEAD | License / last push | Cost and SSR | Keyboard / reduced / mobile / performance | Decision and application |
| --- | --- | --- | --- | --- |
| [React Bits](https://github.com/DavidHDev/react-bits) `4bb4491` | **MIT + Commons Clause**, 단순 MIT 아님; 2026-09-08 | 선택 효과마다 GSAP/Motion/OGL/Three 등 상이, docs React 19; browser animation client boundary 필요 | 장식 효과가 keyboard semantics/reduced를 자동 보장하지 않음. GPU/모바일 비용을 개별 확인해야 함 | IDEA ONLY: directional reveal 원리, 전체 설치/복사 안 함 |
| [Motion Primitives](https://github.com/ibelick/motion-primitives) `92586e6` | MIT; 2026-03-19 | docs Next14/React18, motion11; component 단위 import 확인 필요 | 텍스트/scroll 효과 선택지. OS reduction, visible semantic text 직접 검증 필요 | IDEA ONLY: 짧은 stagger; 기존 WAAPI로 충분 |
| [Magic UI](https://github.com/magicuidesign/magicui) `ec1cce6` | MIT; 2026-09-08 | monorepo root package에 runtime deps 없음은 0-byte 의미 아님 | 개별 animated component semantics·reduced·mobile GPU 별도 감사 필요 | REJECT for this pass: particle/marquee 장식 중복; source 후보 보존 |
| [shadcn/ui](https://github.com/shadcn-ui/ui) `3ba91b1` | MIT; 2026-09-08 | copy-based component, carousel Embla 추가비용; client boundary 필요 | 문서의 previous/next 이름·구조 참고. 4초 autoplay focus-stop은 앱 책임 | IDEA ONLY now: 이름 있는 arrows/44px. Planner hierarchy 후속 가이드, 기능 개편 안 함 |
| [Lenis](https://github.com/darkroomengineering/lenis) `eea7159` | MIT; 2026-09-05 | core runtime deps 없음, React17+ optional peer; client init | native wheel·anchor·keyboard·nested scroll·OS reduction 별도 검증 필요, RAF 추가 | REJECT for this pass: native scrolling 유지, scroll smoothing/jacking 추가 안 함 |

## Section mapping / current GAP → implementation

Baseline: local `c4f42990bf567a887683039f9cb703f336f28929`; 아래는 후속 pass 5 LOCAL 변경이며 Production 판정이 아니다.

| Area | Current | Reference target / pattern | GAP / action and candidate |
| --- | --- | --- | --- |
| Intro | full-screen WaveField + Skip | 01,02 | 기존 컷 보존; 다시 보기 후 Hero A부터 연결 |
| Hero | 고정 문구 | 03 | A/B/C 줄 단위 교체, CTA 고정, 지속 정지 |
| Region | 큰 제목 + 작은 본문 | 04,05 | 작은 본문만, 기존 실제 full-bleed 유지; 원본 링크/저작자 일치 |
| Accessibility | 정적 편의 capture | 06 | 실제 카탈로그 DOM 선택→요약 시연, 실제 설정 불변 |
| Recommendation | 실제 두 장소 capture | 07 | 유지; 앞 독립 panorama 장면/높이/로드 제거 |
| Itinerary | 기존 전후 capture | 08 | DEFERRED #386. 현재 렌더·anchor·목록에서 제외; 원본 보존 |
| Map | 기존 날짜별 capture | 09 | DEFERRED #386. 기능 코드·회귀 검사는 유지 |
| Departure | 실제 남해 풍경 | 10 | 유지, 7개 소개 흐름에 연결 |
| Community | 정적 작성 형상 | 11 | 지원 필드 입력→미게시 글 형태, 읽기 전용 DOM 1회 시연 |
| Closing | harbor + 긴 credits | 12 | CTA 유지; credits는 기존 운영정책 섹션으로 이동 |
| Progress/nav | scroll-aware header | 12 | 같은 7개 registry에서 compact/expanded/mobile progress 계산 |
| Planner | 기능 화면 | 후속 #386/#387 | 이번 기능 변경 없음 |

## Assets — deliberate selection

| Source | Disposition | Role / reason |
| --- | --- | --- |
| v1 `0de3ce4` planning-together | USE | 편의 chapter의 사람 중심 brand illustration |
| v1 coast / 8sec MP4 | KEEP SOURCE | v3 opener와 중복 |
| v2 `be1347f` garden / dawn | KEEP SOURCE | 실제 추천 장소로 오인하지 않도록 discovery는 실제 사진으로 전환 |
| v2 harbor | USE | Closing의 브랜드 장면; 실제 지역 사진 근거 아님 |
| v2 original film / GIF / subtitles | EDIT / KEEP SOURCE | 장식 재생 UI 제거. 옛 문구·기능과 맞지 않는 film 재사용 안 함 |
| v3 `d908bd9` hero-water-loop / coast | USE | Intro와 Hero의 공통 브랜드 바다 |
| v3 ocean-expand / ocean loop / journey sequence | KEEP SOURCE | 이번 대표 full-bleed는 실제 관광사진 우선, 중복 영상 다운로드 방지 |
| v3 examples | REJECT as implementation | global CSS/JS 복제 안 함 |
| wave-journey recommendation capture | USE | 실제 추천 화면·watermark 유지 |
| wave-journey conditions capture | KEEP SOURCE | 현재 편의 소개는 실제 카탈로그 DOM 시연으로 대체 |
| wave-journey timeline/map captures + manifest | KEEP SOURCE / DEFERRED #386 | 원본/날짜/ID/워터마크 보존, 현재 렌더·미디어 로드 제외 |
| region-showcase-photos, KTO original URLs | USE | 18지역과 departure. 기존 독립 panorama 제거. 사진은 시설 보증이 아님 |

## Visual system, whitespace and release boundary

- Existing Deep Ocean tokens, white/mint on dark scrim; body 4.5:1, large text 3:1, 44px controls.
- Headline 1–2줄, body 1–2문장. 중요 unknown 정보는 visible, 촬영 시각/asset 성격은 운영정책의 콘텐츠 출처로 분리. 사진별 인접 출처/워터마크 유지.
- `--cinema-ease: cubic-bezier(.16,1,.3,1)`; 대표 장면 frame expansion, 나머지는 비대칭/rise/curtain로 다른 리듬.
- Desktop chapter breathing space와 mobile 밀도를 구분. 빈 sticky spacer 없이 내용 자체 높이로 읽는다.
- Expanded frame 끝은 x=0, right=viewport, radius=0. 시작/중간/완료와 역스크롤을 캡처한다.
- CSS gzip ≤70KiB / planner initial JS gzip ≤270KiB / 기존 landing 예산 유지. 이번 pass 추가 dependency 0. 예산 통과는 측정 전 주장 금지.
- Full CI/Preview는 Owner visual checkpoint 후. 로컬 PASS ≠ Preview ≠ Production ≠ #353 완료.

## Agent Design Contract — pass 4 (historical; superseded presentation noted above)

REFERENCE: Owner #353/#385, Codrops expansion, Kakao copy, W.A.V.E 실제 UI.
PATTERN: 02/04/05/07/08/09/11/12.
W.A.V.E APPLICATION: 지역을 Hero 다음, 숨은 탭을 visible chapters로, 실제 frame edge 확장, community DOM, scroll-aware nav.
WHY: 클릭 없는 서비스 이해와 하나의 여행 이야기.
ACCESSIBILITY: 기존 intro focus/Skip/OS 유지, auto region stop, names/44px, visible place/date evidence.
PERFORMANCE: existing RAF·static assets, API/SDK/dependency 추가 없음, lazy below fold.
RESULT: 2026-09-09 18:52:39 KST LOCAL visual checkpoint. Hero 직후 지역 사진/4초 순환/두 arrow, 클릭 없는 편의·추천·3개 날짜별 일정·지도, 실제 우포늪 full-bleed, 후기 작성 UI visual, scroll-aware icon nav 구현. 실제 사진의 frame 시작/중간/끝/역스크롤 및 320/390/1366px 확인. 관련 unit 57 PASS; Intro 22, cinematic 10, complete story 2, nav/static 6의 최신 개별 실행 PASS(총40 case). 전체 suite 결과 아님.
GAP: Owner 육안 승인 대기. 모바일 일정·지도 3개 상태의 긴 세로 리듬, 지역별 사진 구도는 다음 visual 판단 대상. 한화오션 원본 영상/공식 페이지의 프레임별 비교는 접근 제한으로 미확인. 옛 tab/map disclosure/media button E2E를 새 visible-scene 계약으로 이관한 뒤 budget/Full CI/Preview/독립 QA/Production gate 필요. LOCAL ONLY, 완료/출시 아님.


## Agent Design Contract — pass 5

REFERENCE: 위 최신 #353/#385 Owner 댓글. 기존 Bible의 원리만 갱신하며 전수 재조사하지 않음.
PATTERN: 줄 단위 카피 전환, compact editorial progress, 실제 UI의 bounded read-only demonstration.
W.A.V.E APPLICATION: 7개 소개 순서, 편의/작성 내부 상태 시연, 인접 출처 링크 + 운영정책 통합 원장.
WHY: 핵심 메시지는 첫 문구와 스크롤만으로 전달하며 설명용 클릭을 요구하지 않는다.
ACCESSIBILITY: 지속 정지, 고정 SR 제목/정적 설명, OS/Save-Data 최종 상태, 44px, focus/CTA 위치 유지.
PERFORMANCE: 기존 React/CSS만, 새 dependency 없음. 삭제 장면 DOM/observer/media 요청 없음; 기능은 변경하지 않음.
RESULT: 현재 로컬 구현. 실제 경량 검사·녹화 결과는 [작업 로그](../ai-logs/fullscreen-story-353.md)의 pass 5 참고.
GAP: 사진별 원문 상세/개별 이용조건은 원장에 미확인으로 남김. Owner 시각 평가 및 최종 candidate의 budget/Full CI/Preview/독립 QA/Production은 아직 별도 Gate.
