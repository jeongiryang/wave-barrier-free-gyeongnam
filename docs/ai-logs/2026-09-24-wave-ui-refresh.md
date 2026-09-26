# WAVE 소개·여행 설계 UI 개선

- 작성자: jeongiryang / Codex
- 상태: PR 검증 대상. 사용자 지시로 병합·배포 금지.
- 기준: origin/main 4adf2e5

## 요청과 구현

- 소개 상단 네비게이션·히어로 및 하단 안내·푸터를 연결한 사진 파노라마. 소개 사진은 기존 관광공사 수상작 API 응답, 커뮤니티·축제는 기존 세 장의 배너 이미지 활용. 이전/다음 및 정지 버튼 제거.
- 기존 커뮤니티·축제 손글씨 문구 보존, 한 글자씩 등장. 소개·커뮤니티·축제 강조 문구에 보라·파랑·청록 흐르는 그라데이션.
- 회원가입 스타일을 기준으로 로그인·계정 링크, 여행 설계 탭, 지역 선택, 인구감소지역 우선 보기 및 검색 버튼 디자인 통일. 인구감소지역 필터는 사용자의 마지막 지시에 따라 유지하고 명칭을 명확하게 변경. 지도 별표·설명 제거.
- 소개/여행 설계 공통 지도는 18개 지역 모두 기존 KTO photo endpoint 사용. 이미지 디코딩 실패 시 동일 장소의 strict spot-photo 조회, 확인된 관광지 ID에 한해서만 설명 조회. 정적 사진 목록으로 대체하지 않음. 실제 합천 이미지 실패와 대체 동작 확인.
- 경남 전체는 18개 경계 모두 강조. hover/focus/touch 사진 미리보기, Escape와 외부 클릭 닫기.
- 검색 입력·실행을 하나의 영역으로 묶고 여행지 결과 제목/표시 방식 연결. 목록/격자 선택과 여행 담기 상태 유지.
- 나루 하단은 흰 배경 안내부터 푸터까지 연결. 원본 나루 단독→동일 어린아이 왼쪽/나루 오른쪽 두 생성 이미지, 공룡 여행과 휴식 질문의 말풍선 누적. 실사 성인 시안은 포함하지 않음. 같은 Nanum Pen Script에 필요한 글리프 추가. 실제 대화 버튼과 기존 걷기·휴식 도구 연결.
- 전체 화면 여행 준비 로딩 장면 제거(오류·개별 요청 상태 유지).
- API/백엔드/AI 모델/인증 규칙 변경 없음.

## 검증

- npm test: 1678/1678 성공 (WAVE_TEST_PYTHON 지정).
- npm run typecheck: 성공.
- npm run lint: 오류 0, 기존/일반 img 경고 포함 28개.
- 신규 wave-ui-refresh Playwright: desktop/mobile 4개 성공. 지도 API는 이 테스트에서 합성 응답.
- place-view-modes + declining-regions Playwright: desktop/mobile 8개 성공, 저장 상태·키보드·390/960/1440·axe 포함.
- 실제 관광공사 응답: 소개/여행 설계의 18개 사진, 전체 선택 18개 경계, 거창 미리보기, 모바일 넘침 없음 확인.
- 독립 QA: 캐시 이미지 시작 누락·손글씨 글리프 누락 수정 후 PC1440/모바일390 정상 장면 전환, 캐릭터와 대화 겹침 없음 확인. reduced-motion은 대화를 정지 상태로 모두 제공.
- npm run build:vercel 성공.
- 성능: 폐기 배너 제어 스타일 정리 후 CSS gzip87.87KiB. 기존86KiB 제한은 초과했으며 추가된 UI 범위를 명시해89KiB로 조정. 초기JS 예산은 변경하지 않음: landing145.72KiB, planner266.46KiB, 최대 chunk69.59KiB 모두 기존 한도 이내. 생성 이미지 두 장 합계 약97KiB.

## 제한

관광공사 사진 응답에 설명이 없는 경우 제목·위치·작가만 제공. 외부 API/사진 제공처 실패 시 빈 상태를 알리고 임의 정보를 채우지 않는다. 배포 결과를 주장하지 않으며 PR 전체 CI는 GitHub에서 확인한다.

## Local follow-up: expanded controls and Naru light palette
- User requested local review only. No push, PR, merge or deployment.
- Styled official exploration cards and their search actions with the shared gradient.
- Reviewed facility/comfort/companion/saved-preference disclosures, place detail evidence/reviews/preview/inquiry, Naru menus/tabs/attachments, and header settings by opening them locally.
- Fixed mixed inherited white/dark tokens, unreadable expanded labels, checkbox presentation, nested horizontal overflow, and action spacing.
- Naru uses a white canvas, footer-matched blue user and lavender assistant bubbles, and a borderless launcher with the hint's soft shadow.
- Independent facility QA at 1440/960/390: check/uncheck, save/load, focus return, no horizontal overflow; Axe zero violations. Naru tools/request mobile Axe zero violations. Typecheck and edited TSX lint passed.
- Live AI response generation was not part of this visual verification. Local work remains uncommitted.

## Local follow-up: banners, photo cards and profile framing
- Shared planner/community/festival openings: 480px desktop/tablet and600px mobile. White planner scene reuses existing fictional child/Naru artwork. Circular portraits carry names below; child label is 꼬마 여행자. Naru crop reduced to300% and centered72%38% after user review.
- Benefit dividers removed; planner controls and official-exploration disclosure aligned. Mobile handwritten note overflow and joined description text corrected.
- Planner result, theme, community, festival and related-course photo cards now use full backgrounds with dark readability scrims. Removed ambiguous community location glyphs including detail/editor variants.
- Official statistical candidates request lazy, capped-concurrency strict photo matches; normalize 시/군 before API region lookup, reject mismatched titles, preserve usable cards on errors or missing photos.
- Festival default dates are today through+30days; ended events are excluded by period intersection, not a retention cutoff. Added explanation and past30days empty-state action. Actual local public-provider response for2026-08-25 through2026-09-23 returned3ended festivals.
- Naru loading and loaded panel verified white and identical1440px viewport geometry: x110,y24,w1220,h852.
- Independent QA: three openings at1440/960/390 correct heights and no horizontal overflow. Card/list and expanded festival views at1440/390: Axe0. Fixed and rechecked mobile festival state badge and planner photo-center click interception.
- Validation: typecheck passed; lint0errors/29warnings. Unit suite1674/1678initially passed; all4failures subsequently passed after configuring WAVE_TEST_PYTHON and updating stale header mock/performance baseline expectation (actual budget unchanged89).
- Browser suites: wave-ui-refresh4passed, place-view-modes4passed, festival-facility-continuity4passed, photo-cards-period4passed across desktop/mobile. Photo match/error tests use synthetic responses; actual past-festival query was checked separately.
- Build passed. Performance gate remains FAILED: CSS gzip93.48KiB exceeds existing89KiB budget; no budget increase. Further CSS consolidation is outstanding. No claim of full production readiness.
- Local-only, uncommitted, no push/PR/merge/deploy. Dev server restored at127.0.0.1:4173 with WAVE_PUBLIC_PREVIEW=1.

## Local follow-up: balanced closing frames and intro focus
- User asked for smaller planner footer, then matching opening/closing heights on all four pages with a separate landing size. Work pages now use680px desktop/tablet and840px mobile minimum frames; introduction usesmax(760px,100svh), or840px minimum mobile. Expanded community guide content can grow naturally.
- Repositioned compact Naru art beside four dialogue rows on desktop, above on mobile; smaller portraits keep readable names and preserve arrival animation. Compact link alignment; GitHub glyph centered. Hint hides while Naru footer visible so it cannot cover disclosure text.
- Added community closing invitation using existing write link; festival course cards use contained mobile swipe rail with a stacked empty-state fallback.
- User-reported cyan line was the outline on the programmatically focused, noninteractive hero after intro completion. Removed only that hero outline; interactive focus indicators remain.
- Removed130selectors from31 reviewed obsolete class groups. Dynamic Naru/crowd/category/Leaflet and mixed functional selectors preserved. Independent static audit manifest kept outside repository. No runtime dependency added (cssnano benchmark outside repository did not improve size).
- Independent browser QA all4pages x1440/960/390: equal initial frame heights, no document horizontal overflow, footer Axe0. Expanded community guides and footer actions verified. Intro outline none and border0 verified in actual browser.
- Browser regressions:7/8 initial pass; mobile region preview Escape failure corrected to keep dismissed previews closed until a fresh interaction. Both desktop/mobile region tests then pass. Footer animation tests passed.
- Unit1677/1678 initial; outdated removed-selector assertion moved to active feedback button selector; affected23tests pass. Typecheck/build pass; lint0errors29warnings.
- CSS performance remains above unchanged89KiB budget:92.29KiB vs prior93.48KiB, despite added matching-frame styles. Further consolidation remains open; do not claim full gate success.
- Local dev restored at127.0.0.1:4173. No deployment, push or commit.

## 2026-09-25 follow-up — bright photo cards and simpler chrome

- User authorized the seven requested UI changes after clarifying that photos must not be darkened for lettering. Newly converted itinerary, festival-preview, community-preview and region-hover cards use full-size source photos with text-only outlines; existing photo scrims were not altered.
- Removed the visible header auth text controls and planner control row. Kept account icon, direct search, saved-trip icon, and an accessible planner heading. Mobile chrome now exposes search and saved-trip icons in a separate icon row without changing opening/closing section heights.
- Removed inherited green from the introduction map container, centered all four departure information icons and removed their square backgrounds.
- Naru solo scene is centered, its initial heading is larger, and both scenes progress every two seconds with existing motion transitions. Initial render now starts on the solo frame rather than cross-fading from the reduced-motion final frame.
- Planner card actions use icon-only 44px circular controls, keeping descriptive accessible labels, add, review and undo behavior.
- QA: typecheck passed; lint passed with29 existing warnings; all1678 unit cases ran, five obsolete header contracts updated and affected16 tests passed. Eight desktop/mobile card/map/Naru browser tests passed. Independent visual and interaction review at1440/390 identified inherited action min-width and hidden mobile navigation, both corrected. Responsive manual check at1440/960/390 showed no page overflow.
- Final follow-up: search icon switches planner stages in-place so unapplied date drafts survive; the existing new-trip action moved into the support menu, preserving archived travel metadata. Both strict regression smokes passed after this change. Account/keyboard/navigation suite:12 passed initially, two stale stage-target assertions corrected and both passed on rerun.
- Final frame measurements at1440/960/390: intro first/last900px at900px viewport; planner/community/festival first/last680px desktop/tablet,840px mobile; page overflow0. Empty festival footer grid span was corrected as part of this check.
- Long festival names were checked with clearly synthetic fixture data at all three widths; the narrow preview area uses a keyboard-accessible horizontal card rail and has no card text clipping. Photo filters remain none.
- Final build passed. CSS performance remains unresolved:93.18KiB gzip vs89KiB budget (budget unchanged). No commit/push/deployment. Local server restored on4173.
