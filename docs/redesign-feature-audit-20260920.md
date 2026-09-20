# 개편 기능 접근 경로 독립 감사

기준: `c019af6` → `ed28b94` (2026-09-20). 코드 읽기 전용 감사이며 이 문서만 작성했다. 현재 부모 작업의 후속 변경은 이 판정에 포함하지 않는다. 운영 쓰기·로그인·배포는 하지 않았다.

## 수정할 구체 항목

1. **P1 — 모바일 전체 화면 가로 넘침.** `app/styles/night-desktop.css:8–14`는 미디어 쿼리 없이 커뮤니티·축제·플래너 및 모든 night-secondary에 `min-width:960px`를 적용한다. 390px 화면에서 최소 570px가 넘친다. 축제 4열과 플래너 2열·96px 여백도 전역이다. 기존 모바일 여행/로그인 접근성을 보존하는 데스크톱 조건부 적용 또는 모바일 재정의가 필요하다. 소스상 확정; 이번 감사에서 390 브라우저 재실행은 하지 않았다. 기존 `e2e/place-view-modes.spec.ts` 모바일 390 및 `e2e/planner-stage-jump.spec.ts` overflow 계약이 회귀 검사다.

2. **P2 — 숙박 가이드 링크가 지원하지 않는 조건을 전달한다.** `features/community/components/NightCommunitySidebar.tsx:6`의 `/planner?theme=stay`를 `lib/planner-criteria.js:1–7`가 빈 선택으로 제거한다. 허용값은 nature/history/leisure/food뿐이다. 숙박 안내/검색으로 이어지는 지원 경로를 연결하거나 실제 도착지에 맞는 이름으로 바꿔야 한다.

3. **P2 — 교통편 가이드 앵커 없음.** 같은 Sidebar의 `/guide#transport`에 해당하는 id가 없다. 실제 안내 섹션은 `app/guide/page.tsx:18`의 `return-transport`이다. 기존 안내로 이동하도록 앵커를 수정한다.

4. **P2 — 커뮤니티 인기순·댓글순이 전체 결과를 정렬하지 못한다.** `CommunityBoard.tsx`는 현재 페이지 12개만 재정렬하며, `useCommunityPostList.ts:23–27`는 sort를 API에 보내지 않는다. `post-read-repository.ts`는 최신순 LIMIT/OFFSET이다. 다음 페이지에 더 인기 있는 글이 있어도 1페이지에서 찾을 수 없다. 정렬은 API 페이지네이션 앞에서 적용하거나 현재 페이지 정렬임을 명확히 한다.

5. **P2 — 실게시글과 목업 결과의 검색 상태 충돌.** `CommunityBoard.tsx`는 NightCommunityStories와 CommunityPostList를 별도 렌더링한다. 목업에 매칭되는 검색어/카테고리만 있고 API 결과가 없으면, 이야기는 보이면서 `검색 조건에 맞는 게시글이 없습니다`와 초기화가 함께 보인다. 목업 결과 존재 여부를 empty 상태에 반영해야 한다. 사용자 요구의 목업 문구/숫자 자체나 표시 여부를 변경하라는 지적은 아니다.

6. **P2 — 커뮤니티 조밀한 카드 보기 접근 경로 삭제.** 기존 CommunityBoardToolbar는 cards/compact/list를 지원했지만 새 CommunityBoard는 cards/list만 제공한다. compact 렌더링 계약이 남아 있어도 사용자가 선택할 수 없다. 기존 기능 모두 보존 목표라면 compact 버튼을 복구한다.

7. **P2 — 목업 저장 후 모아보기 경로 없음.** NightCommunityStories의 북마크는 `wave-community-reactions-v1.saved`에 저장하지만 읽는 곳도 해당 컴포넌트뿐이다. 저장한 목업 이야기를 목록으로 모아보는 링크/필터가 없다. 실회원 저장 기능과 섞지 않고 동일 데이터의 저장 목록 접근을 제공해야 한다. 댓글 숫자는 span이며 댓글 열람/작성 버튼이 아니다; 새 댓글 기능이 있다고 설명해서는 안 된다.

## 유지되는 기능과 분리해야 할 사실

- 커뮤니티 실게시글 읽기·쓰기·상세 댓글/좋아요·현장 제보·사진·페이지 이동·장소 필터 해제·실패 재시도는 유지된다. tips/together는 타입·검증·DB CHECK·017 마이그레이션까지 추가되어 초기 목업만 있던 문제는 기준 커밋에서 보완되었다. 정적 fixture에는 together가 없지만 실제 together 게시글은 API 경로로 표시된다.
- 축제 홈페이지/관광정보 원문, 편의·문의 상세, 방문 날짜, 내 일정 담기, 새 여행, 나루 주변 코스는 제거되지 않고 `행사 정보·일정 담기` details 안으로 이동했다. 편의 상세는 그 안에서 한 번 더 펼쳐야 한다. 종료 행사 및 명시적 부정 편의에서 담기 제한 유지. 기존 선택·오래된 응답 방지·실패 재조회 유지.
- 축제 카드 CSS로 도시 small을 숨기지만 주소 및 행사명/날짜가 남는다. 숨김 CSS에서 기능 버튼을 직접 제거하는 규칙은 발견하지 못했다. 헤더 SVG/워드마크 보조문구/지도 장식 span 숨김은 기능 접근 삭제가 아니다.
- 플래너 본체 diff는 테마 클래스이며 조건 선택→추천, 저장 장소→일정, 수정·순서 이동·지도·대안·여행 도구 및 나루와 공유하는 상태는 유지된다. 일정판 사진 추가로 기존 핸들러가 바뀌지 않았다.
- 개편 전/후 나루 엔진 파일과 GlobalTravelWorkspace는 변하지 않았다. 운영 실제 비저장 POST는 200/3.22초/source=local-llm으로 확인했다. 로컬 공개 preview만 GET health=true/POST503이 불일치한다 (`scripts/vite-public-preview.mjs:4,11`). 카카오 버튼도 운영에는 있고 로컬 인증 환경 부족으로만 숨겨진다.

## 검증 범위

이번은 checkpoint 기준 정적 감사다. 앞선 같은 개편의 모의 API 나루 회귀 8/8, 인증/정책 20/20 통과는 실제 제공처·계정 인증이나 모바일 통과를 의미하지 않는다. 다음 검증은 위 수정 후 모바일 overflow, 커뮤니티 검색·정렬 페이지 이동, 두 가이드 링크, 축제 details 안 담기/편의 차단, 나루 적용·되돌리기를 우선한다.
