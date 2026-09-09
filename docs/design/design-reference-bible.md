# W.A.V.E Design Reference Bible

Canonical design entry · Owner #385 / implementation #353 · 2026-09-09 KST.
Read this before any design change, together with [design tokens](../design-system.md).
This is a design contract, not a claim that the current candidate is released or Owner-approved.

## Product brief — fixed by Owner

W.A.V.E는 경상남도에서 사회적 약자의 관광 편의를 지원하는 무장애 여행 서비스다.
휠체어 이용자·이동약자·장애인·고령자·영유아 동반자가 1차 사용자이며 모든 여행자가 함께 이용한다.
접근 가능한 장소 탐색, 이동 계획, 흩어진 시설정보를 연결한다. 무장애 관광지·지도·경로·교통이 우선이고 지역·축제 정보는 이를 돕는다.

**최상위 원칙: SCROLL-ONLY COMPREHENSION.** 소개를 펼치거나 탭을 눌러야 이해되는 구조는 실패다.
스크롤만으로 필요한 편의 → 경남 탐색 → 추천 → 날짜·일정 → 지도·이동 → 출발 전 확인을 이해한다.
Primary CTA는 **여행 계획하기** 하나다. 지역으로 시작, 커뮤니티 이동은 문맥에 맞는 secondary action이다.

순서: Full-screen Intro → Hero → **Region Showcase** → Accessibility → Recommendation → Itinerary → Map → Departure → Community → Closing.
KO-first. 기존 locale 구조는 유지하지만 EN polish 때문에 한국어 완성을 지연하지 않는다.
한화오션의 시네마틱 품질, 카카오의 정보 절제, 여행 에디토리얼의 사진 구성을 W.A.V.E 고유의 Deep Ocean·무장애 가치와 결합한다. 브랜드·코드·사진·정확한 레이아웃을 복제하지 않는다.

## Reference evidence and limits

| Source | 직접 확인한 내용 / 제한 | 적용 범위 |
| --- | --- | --- |
| [Hanwha Ocean](https://www.hanwhaocean.com/) | 2026-09-09 재조회는 사이트 접근 차단. **NOT DIRECTLY VERIFIED**. 이 세션에서 Owner 녹화 원본을 다시 재생하지 못함. 아래 확대/전환 원리는 [Owner 관찰](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/353#issuecomment-5599049518)에 근거하며 임의의 영상 타임코드를 쓰지 않는다. | 품질 목표·frame expansion·chapter transition |
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
- **W.A.V.E APPLICATION:** 필요한 편의부터, 내게 맞는 경남 여행. / 여행 계획하기.
- **DO NOT:** 큰 흰 설명 카드, 동급 CTA 네 개, 제작 과정 배지.
- **ACCESSIBILITY:** 고정 scrim으로 사진 실패·밝기 변화에도 대비 유지.
- **PERFORMANCE:** Hero image priority, 반복 영상 download 없음.
- **IMPLEMENTATION CANDIDATE:** LandingHero / StoryMedia.

### 04. Region as a changing destination
- **REFERENCE:** Owner representative switching + shadcn의 명명된 arrow 구조.
- **PATTERN:** 사진·지명·짧은 이야기·지역 시작 링크가 하나의 상태로 전환.
- **WHY IT WORKS:** 지도 설명을 읽기 전에 경남의 여행 범위를 느낀다.
- **W.A.V.E APPLICATION:** Hero 바로 뒤, 18개 실제 KTO 사진, 4초, 이전/다음만.
- **DO NOT:** 포커스 중 자동 변경, 재생/정지 CTA, 사진과 링크의 지역 불일치.
- **ACCESSIBILITY:** hover/focus/offscreen/hidden/reduced에서 멈춤; 수동 arrow 뒤 자동 재개 안 함; 자동 변경 live announce 안 함.
- **PERFORMANCE:** 선택 사진만 lazy load, API/provider 호출 없음, Save-Data rotation 중지.
- **IMPLEMENTATION CANDIDATE:** LandingRegionStory.

### 05. Small frame → viewport edge
- **REFERENCE:** Owner Hanwha 관찰 + Codrops expanding typography 실험.
- **PATTERN:** 여백 속 프레임 자체의 좌우 경계가 viewport edge에 도달.
- **WHY IT WORKS:** 단순 사진 zoom보다 장면 전체가 열리는 변화를 만든다.
- **W.A.V.E APPLICATION:** 지역·추천 chapter에서 약 55–65% frame → 실제 full bleed.
- **DO NOT:** 카드 내부 image scale만 증가, 완료 후 radius/shadow/gutter 잔존.
- **ACCESSIBILITY:** native wheel, 역스크롤 가역, 정적 expanded fallback, 텍스트 상시 제공.
- **PERFORMANCE:** clip frame + 단일 scroll RAF; sticky spacer·scroll-jacking 없음.
- **IMPLEMENTATION CANDIDATE:** data-cinematic / region-stage / destination panorama.

### 06. Asymmetric needs story
- **REFERENCE:** SiteInspire Photography/Unusual Layout 색인 + editorial 원리.
- **PATTERN:** 사람의 경험을 담은 이미지와 실제 편의 선택 UI의 비대칭 결합.
- **WHY IT WORKS:** 대상 사용자를 유형으로 단정하지 않고 필요한 시설로 설명한다.
- **W.A.V.E APPLICATION:** v1 동행 visual + 실제 편의 화면, 큰 제목 한 개.
- **DO NOT:** 가족/휠체어 유형에 기능을 고정, 여러 동일 feature card.
- **ACCESSIBILITY:** 이미지 alt는 concept과 실제 UI를 구분; 핵심 편의는 텍스트에도 존재.
- **PERFORMANCE:** 기존 WebP lazy, scroll transform만.
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

### 08. Dates become a visible itinerary
- **REFERENCE:** Codrops progressive space + 실제 W.A.V.E timeline recording.
- **PATTERN:** 앞뒤 날짜 상태를 스크롤 순서로 함께 노출.
- **WHY IT WORKS:** 설명 탭 없이 장소를 날짜에 놓는 의미를 이해한다.
- **W.A.V.E APPLICATION:** 첫날 두 곳 → 첫날 주남 / 둘째 날 대산 실제 capture.
- **DO NOT:** 설명용 tabs/date buttons, 날짜·ID를 임의 생성.
- **ACCESSIBILITY:** 읽기 순서 동일, captions/date/place names 상시 visible.
- **PERFORMANCE:** static DOM, lazy WebP, no planner hydration/request.
- **IMPLEMENTATION CANDIDATE:** LandingJourneyScene.

### 09. Itinerary → map continuity
- **REFERENCE:** 실제 제품 UI + editorial adjacent composition.
- **PATTERN:** 바로 앞의 장소·날짜·순서가 지도에도 같은 식별자로 이어짐.
- **WHY IT WORKS:** 지도 기능 나열보다 여행 하나가 연결됨을 보여준다.
- **W.A.V.E APPLICATION:** 동일 recording의 before/day1/day2 map, 방문 장소 이름 반복.
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
- **W.A.V.E APPLICATION:** 실제 editor의 빈 작성 양식/장소 연결 구조를 읽기 전용으로 구성.
- **DO NOT:** 가짜 사용자·후기·좋아요 수·작성일·실시간 activity.
- **ACCESSIBILITY:** caption에 UI example임을 분명히, 가짜 조작 버튼 없음; 실제 Community 링크만.
- **PERFORMANCE:** 실제 write/auth/API hook import 금지, static DOM.
- **IMPLEMENTATION CANDIDATE:** LandingCommunityStory.

### 12. Closing + navigation restraint
- **REFERENCE:** Kakao 행동 위계 + Owner Hanwha chapter rhythm.
- **PATTERN:** 마지막 큰 visual·짧은 invitation, 아래로 읽을 때 nav가 물러남.
- **WHY IT WORKS:** 시각 흐름을 가리지 않으며 돌아올 길과 다음 행동은 남긴다.
- **W.A.V.E APPLICATION:** v2 harbor closing, primary CTA; up 즉시 nav, down threshold, gear/help icons.
- **DO NOT:** 빈 min-height, 반복 summary grid, focus/menu 안 nav 숨김.
- **ACCESSIBILITY:** nav focus 즉시 reveal, 44px 이름 있는 icons, reduced static show/hide.
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

Baseline: local `2f09bd419be28c83dcc2c39751d43b5d81cb1d53`, not Production.

| Area | Current | Reference target / pattern | GAP / action and candidate |
| --- | --- | --- | --- |
| Intro | full-screen WaveField + Skip | 01,02 | Hero stagger/short reveal 추가 |
| Hero | photo 위 큰 KO copy | 03 | 장식 재생/검수 caption 삭제, CTA 고정 |
| Region | page 후반, map disclosure·18 buttons·pause | 04,05 | Hero 직후, arrows, full-bleed frame |
| Accessibility | illustration + repeated rows | 06 | 실제 편의 UI를 visible로 결합, 짧게 |
| Recommendation | 탭 뒤 places capture | 07,05 | 실제 사진 panorama와 추천 capture 상시 표시 |
| Itinerary | date 선택 button 뒤 capture | 08 | 같은 before/after를 스크롤로 읽도록 펼침 |
| Map | 또 다른 tab | 09 | 앞 날짜별 장소와 대응하는 지도 chapter |
| Departure | 큰 남해 풍경 | 10 | 좋은 기반 유지, 짧은 판단 문장 |
| Community | 설명 카드 두 개 | 11 | 실제 editor 구조 기반 큰 visual, fake review 없음 |
| Closing | harbor + 긴 출처 설명 | 12 | 한 CTA·짧은 문장, provenance는 footer 보조 |
| Planner | 기능 화면 | shadcn hierarchy | 이번 패스 구현 금지. 후속 기능 트랙에서만 재평가 |

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
| wave-journey actual captures + timeline manifest | USE | 편의·추천·날짜·지도 동일 실제 화면, watermark·ID·date 유지 |
| region-showcase-photos, KTO original URLs | USE | 18지역, recommendation panorama, departure. 사진은 시설 보증이 아님 |

## Visual system, whitespace and release boundary

- Existing Deep Ocean tokens, white/mint on dark scrim; body 4.5:1, large text 3:1, 44px controls.
- Headline 1–2줄, body 1–2문장. 중요 unknown 정보는 visible, 촬영 시각/asset 성격은 footer 출처로 분리.
- `--cinema-ease: cubic-bezier(.16,1,.3,1)`; 대표 장면 frame expansion, 나머지는 비대칭/rise/curtain로 다른 리듬.
- Desktop chapter breathing space와 mobile 밀도를 구분. 빈 sticky spacer 없이 내용 자체 높이로 읽는다.
- Expanded frame 끝은 x=0, right=viewport, radius=0. 시작/중간/완료와 역스크롤을 캡처한다.
- CSS gzip ≤70KiB / planner initial JS gzip ≤270KiB / 기존 landing 예산 유지. 이번 pass 추가 dependency 0. 예산 통과는 측정 전 주장 금지.
- Full CI/Preview는 Owner visual checkpoint 후. 로컬 PASS ≠ Preview ≠ Production ≠ #353 완료.

## Agent Design Contract — pass 4

REFERENCE: Owner #353/#385, Codrops expansion, Kakao copy, W.A.V.E 실제 UI.
PATTERN: 02/04/05/07/08/09/11/12.
W.A.V.E APPLICATION: 지역을 Hero 다음, 숨은 탭을 visible chapters로, 실제 frame edge 확장, community DOM, scroll-aware nav.
WHY: 클릭 없는 서비스 이해와 하나의 여행 이야기.
ACCESSIBILITY: 기존 intro focus/Skip/OS 유지, auto region stop, names/44px, visible place/date evidence.
PERFORMANCE: existing RAF·static assets, API/SDK/dependency 추가 없음, lazy below fold.
RESULT: 2026-09-09 18:52:39 KST LOCAL visual checkpoint. Hero 직후 지역 사진/4초 순환/두 arrow, 클릭 없는 편의·추천·3개 날짜별 일정·지도, 실제 우포늪 full-bleed, 후기 작성 UI visual, scroll-aware icon nav 구현. 실제 사진의 frame 시작/중간/끝/역스크롤 및 320/390/1366px 확인. 관련 unit 57 PASS; Intro 22, cinematic 10, complete story 2, nav/static 6의 최신 개별 실행 PASS(총40 case). 전체 suite 결과 아님.
GAP: Owner 육안 승인 대기. 모바일 일정·지도 3개 상태의 긴 세로 리듬, 지역별 사진 구도는 다음 visual 판단 대상. 한화오션 원본 영상/공식 페이지의 프레임별 비교는 접근 제한으로 미확인. 옛 tab/map disclosure/media button E2E를 새 visible-scene 계약으로 이관한 뒤 budget/Full CI/Preview/독립 QA/Production gate 필요. LOCAL ONLY, 완료/출시 아님.
