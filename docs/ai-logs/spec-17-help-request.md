# PR #번호 AI 작업 로그

- PR: (push 후 채움)
- 제목: feat: 도움 요청 버튼
- 작성자: Claude Sonnet 5 (Claude Code)
- 최종 상태: 작업 중 (사람 확인 대기)
- AI 도구: Claude Code (claude-sonnet-5)

## 목적

명세 17(`specs/17-help-request-button.md`)을 구현한다. 여행 중 도움이 필요한 순간에 사용자가
스스로 빠르게 도움을 요청할 수 있게 돕는 도움 요청 화면을 추가한다. 자동 신고·자동 발신·위치
전송은 어떤 경로로도 하지 않는다.

## 역할 구분

- 사람: 공식 연락 안내 목록(기관·번호·설명), 위치 미전달 안내 문구의 최종 표현, 도구 밖 노출 여부 확인(human-gate, 아래 절 참고)
- AI: 코드·테스트·문서 작성, 로컬 검증, PR 작성

## 구현 내용

- `lib/help-request.d.ts`, `lib/help-request.js`: 상황별 한국어 문장을 만드는 순수 모듈. 네트워크·브라우저 저장소·위치 API를 참조하지 않는다.
- `features/planner/components/HelpRequestDialog.tsx`: 새 dialog. 지금 있는 곳 표시 → 상황 고르기 4개 → 보여줄 문장 → 이 화면 보여주기/문장 복사하기 → 위치 미전달 안내 → (확인되면) 공식 연락 안내 순서로 보여준다. `usePlaceDialogFocus`를 재사용한다.
  - `OFFICIAL_CONTACTS`는 사람 확인 전이므로 빈 배열로 두었고, 비어 있으면 그 절 자체를 렌더링하지 않는다.
  - `기존 usePlaceDialogFocus`는 열릴 때 항상 제목(h2)으로 초점을 옮기므로, 명세가 요구하는 "첫 초점은 이 화면 보여주기 버튼"을 만들기 위해 마운트 시 한 번 더 그 버튼에 초점을 옮기는 `useEffect`를 추가했다. 이 값이 안정적으로 유지되도록 `onClose` 콜백을 호출부에서 `useCallback`으로 고정했다(안 그러면 리렌더마다 `usePlaceDialogFocus`의 effect가 다시 실행되어 초점을 제목으로 되돌리는 경쟁이 관찰됨).
  - `전화 앱 열기` 개별 버튼은 확인된 기관 번호가 없는 현재 상태에서는 걸 곳이 없으므로 렌더링하지 않는다. `OFFICIAL_CONTACTS`가 채워지면 각 항목이 `tel:` 링크(설명 한 줄 + 이름·번호)로 나타나도록 이미 구현해 두었다.
  - `#545`(문자중계 안내) 링크는 저장소에 아직 해당 내용이 병합되어 있지 않아(코드 전체 검색 결과 없음) 추가하지 않았다. 확인되지 않은 링크를 임시로 넣지 않기 위한 결정이며, 사람 확인 후 후속 작업으로 남긴다.
- `features/planner/components/TripDayTools.tsx`: `도움이 필요해요` 버튼 하나를 기존 당일 진행 버튼 줄에 추가했다. "지금 있는 곳"은 활성 날짜의 저장 장소 중 on-trip 진행 기록(`lib/on-trip.js`)에서 아직 완료 표시되지 않은 다음 장소로 계산한다(없으면 마지막 장소, 저장 장소가 없으면 `null` → 화면에 "일정에 담은 장소가 없어요."). 기기 위치는 전혀 참조하지 않는다.
- `features/planner/components/PlaceInquiryDialog.tsx`: 기존 `.inquiry-actions` 행동 줄(복사·큰 글씨·이미지 저장이 있는 줄)에 선택적 `onHelpRequest` 버튼을 추가했다.
- `features/planner/components/PlaceInquiryCard.tsx`: 도움 요청 다이얼로그의 열림 상태를 소유하고, `onHelpRequest`가 호출되면 문의 dialog를 먼저 닫은 뒤(`setOpen(false)`) 도움 요청 화면을 연다(`setHelpOpen(true)`). 중첩 dialog를 만들지 않는다.
- 두 진입점 모두 `HelpRequestDialog`를 **정적으로(lazy 아님)** import한다. `TripDayTools`/`PlaceInquiryCard`는 이미 각각 lazy 청크이므로, 그 청크가 로드된 뒤에는 도움 화면을 여는 시점에 새 네트워크 요청(코드 분할 포함)이 전혀 없어야 하기 때문이다. 처음에 `lazy()`로 만들었다가 오프라인 상태에서 청크 fetch가 실패해 클릭이 아예 동작하지 않는 것을 e2e로 발견하고 고쳤다.
- CSS 파일은 전혀 수정하지 않았다. 큰 글자 화면(32px+)과 상황 버튼(56px, 2열)은 모두 인라인 스타일로 구현하고, 다이얼로그 틀·헤더·문장 미리보기·행동 버튼 줄은 기존 `.region-change-dialog`, `.inquiry-dialog`, `.inquiry-card-preview`, `.inquiry-actions`, `.modal-note`, `.section-kicker` 클래스를 그대로 재사용했다. CSS gzip 예산이 이미 상한(70 KiB)에 딱 맞춰져 있어 늘릴 여지가 없었기 때문이다.

## 사람 확인이 필요한 부분 (human-gate)

- 공식 연락 안내 목록(기관 이름·번호·설명). 확인 전에는 `OFFICIAL_CONTACTS`가 빈 배열이고 그 절 자체가 렌더링되지 않는다.
- 위치 미전달 안내의 최종 표현. 명세에 고정된 문구(`W.A.V.E는 위치를 대신 전달하지 않아요. 통화나 신고 앱에서 직접 위치를 알려 주세요.`)를 그대로 사용했으나, 최종 확정은 저장소 책임자 몫이다.
- 이 기능을 여행 당일 도구 밖에도 노출할지 여부: 명세대로 두 진입점(여행 당일 도구, 장소 문의 카드의 행동 줄)에만 두었고 추가 노출은 하지 않았다.
- `#545` 문자중계 안내 링크: 저장소에 해당 내용이 없어 추가하지 못했다. 확인되면 후속 PR에서 추가가 필요하다.

## 검증

```sh
git fetch origin main
git merge-base --is-ancestor origin/main HEAD   # 통과
npm run lint            # 0 errors, 14 warnings (기존과 동일, 신규 경고 없음)
npm run typecheck       # 통과
npm test                # 1268 tests, 1266 pass, 2 fail (Python 없음, main에서도 실패하는 기존 이슈, 무관)
npm run build:vercel    # 통과
npm run check:performance  # 통과. cssGzipKiB 70 → 70 (변화 없음), plannerInitialJsGzipKiB 205.39 → 209.7 (budget 270)
```

- `tests/help-request.test.mjs`(신규 6개 테스트): 상황별 문장 구분, 장소 이름 포함, 장소 없을 때도 완성, 길이 상한, 상황 4종 확인, 네트워크·저장소·위치 API 미참조. 모두 통과.
- `e2e/help-request.spec.ts`(신규): 즉시 열림·첫 초점·기본 문장·큰 글자 32px 이상·서버 호출 0건, 상황 전환이 문장만 바꿈, 닫으면 상태 폐기와 초점 복귀, 세 폭(1440/960/390)에서 axe 위반 0건. `desktop-chromium`·`mobile-chromium` 모두 통과.
  - 완전한 브라우저 오프라인(`context.setOffline(true)`) 대신 `**/api/**` 차단으로 "서버 호출 0건"을 검증했다. 플래너 페이지의 지도 관련 컴포넌트(`RouteMap.tsx` 등, 이 기능과 무관)가 완전 오프라인에서 청크를 새로 받지 못해 화면 전체가 깨지는 기존 문제가 있어, 이 기능과 무관한 실패가 섞이는 것을 피하기 위한 선택이다. 이 부분은 이 기능의 순수성 검증(단위 테스트로 네트워크/저장소/위치 API 미참조 확인)과 정적 import 결정(코드 리뷰로 확인)으로 보완했다.
  - 관련 기존 스펙(`e2e/trip-day-tools.spec.ts`, `e2e/place-decisions.spec.ts`)도 재실행해 회귀가 없음을 확인했다(desktop-chromium, 6/6 통과).
- `navigator.geolocation` 참조: `features/planner/components/HelpRequestDialog.tsx`, `lib/help-request.js`, `TripDayTools.tsx`, `PlaceInquiryCard.tsx`, `PlaceInquiryDialog.tsx`에 0건(코드 검토 + grep 확인).
- 1440px·960px·390px 실제 렌더링: e2e 스크린샷 대신 axe 검사와 폰트 크기 assertion으로 확인(별도 스크린샷 캡처는 생략).

## 결과와 제한

- CSS를 늘리지 않았으므로 "죽은 선언 제거로 상쇄" 절차는 필요하지 않았다.
- `npm run test:e2e`(전체 스위트)는 실행 시간이 매우 길어 이번 세션에서는 관련 스펙만 선택 실행했다(`help-request`, `trip-day-tools`, `place-decisions`). 전체 스위트 실행은 후속 CI에서 확인이 필요하다.
- Python이 없는 이 머신에서 `assistant-photo.test.mjs`, `assistant-runtime.test.mjs`의 실패 2건은 main에서도 동일하게 실패하는 기존 문제이며 이번 변경과 무관하다.
