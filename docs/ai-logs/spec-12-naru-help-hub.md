# 나루 도움 모음 (명세 12)

- 작성자: 사용자 요청에 따른 Claude Sonnet 5
- AI 도구: Claude Code, 로컬 명령
- 기준: `origin/main` `5ffa800`
- 브랜치: `feat/spec-12-naru-help-hub` (base `main`)
- 상태: 구현 및 로컬 검증 완료. 병합·배포는 하지 않았다.

## 목적과 범위

`specs/12-naru-accessibility-hub.md`를 구현했다. 나루 대화를 열었을 때 대화를 입력하지 않고도 자주 쓰는 도구(이미 있는 `ASSISTANT_TOOLS` 값)를 바로 여는 "도움 모음" 한 줄을 추가했다. 새 도구·새 화이트리스트 값·새 서버 호출은 만들지 않았다.

## 구현

- `lib/naru-hub.js`, `lib/naru-hub.d.ts`(신규): `NARU_HUB_ITEMS`(6개 항목)와 `visibleNaruHubItems(items, context, limit)` 순수 함수만 둔다. 네트워크·저장소·위치 API를 참조하지 않는다.
- `features/planner/components/NaruHelpHub.tsx`(신규): 표시와 클릭 동작만 담당. 상태를 props(`context`, `canTalk`, `onOpenTool`, `onTalk`)로만 받는다. 도구가 열리지 않으면(`onOpenTool`이 예외를 던지면) 대화창을 유지한 채 `aria-live="polite"`로 "지금은 열 수 없어요."를 알린다.
- `features/planner/components/PlannerAssistant.tsx`: `NaruHelpHub`를 대화 입력 폼 바로 위에 배치했다. 기존 `focusedPlace` ref 대입 4곳을 `setFocused(id)`로 바꿔 같은 ref에 더해 `focusedPlaceId` state를 함께 갱신하도록 했다(장소가 선택됐는지 판단하는 유일한 목적, 기존 동작·순서는 바꾸지 않음). `useTravelBook()`으로 저장한 여행(`저장한 여행 열기` 조건)을 읽었다. 항목 클릭은 기존 `goToTool(tool)`(대화창을 닫고 `props.onOpenTool` 호출)을 그대로 재사용해 dialog 겹침을 만들지 않고 기존 초점 복원 규칙을 그대로 탄다.
- `lib/assistant-actions.d.ts`: `AssistantTool = string` 타입 별칭 한 줄만 추가했다(타입 전용, 런타임 화이트리스트 `lib/assistant-actions.js`는 건드리지 않음). 명세의 `naru-hub.d.ts`가 이 타입을 import하도록 지정했기 때문이다.
- `app/styles/planner-conversation.css`, `globals.css`, `design-system.css`: **수정하지 않았다.** 기존 클래스 `.naru-context-suggestions`(이미 pill 버튼·44px·`--line` 테두리 스타일을 가짐)를 그대로 재사용하고, "가로 스크롤 캐러셀 금지" 요건은 인라인 스타일(`flexWrap:'wrap'`, `overflowX:'visible'`)로 해결했다. `직접 이야기하기` 버튼의 강조색은 인라인 `style={{ background: 'var(--accent)', color: '#fff' }}`로 처리했다. CSS 파일을 전혀 늘리지 않아 죽은 선언을 제거해 상쇄할 필요가 없었다.

## 명세와 다르게 구현한 부분

- 명세 UI 절은 "`app/styles/planner-conversation.css`의 기존 클래스 안에서 확장"을 요구했지만, CSS gzip 예산이 이미 상한(70/70 KiB)에 도달해 있다는 상위 지시에 따라 CSS 파일을 전혀 건드리지 않고 기존 클래스 재사용 + 인라인 토큰만으로 완성했다. 결과적으로 CSS gzip은 변경 전후 동일(70.00 KiB)하다.
- `hasFocusedPlace`는 대화 중 마지막으로 참조·선택된 장소(`focusedPlace`)를 기준으로 판단했다. 장소 상세 다이얼로그의 전역 `selectedPlace` 상태(`app/planner/page.tsx`)까지 연결하면 더 정밀하지만, 그러려면 `PlannerAssistant`의 props 계약을 변경해야 해서(명세가 금지한 새 화면·진입점 추가는 아니지만 범위를 넘음) 이번 작업에서는 대화 내부에서 이미 추적하던 `focusedPlace`만 사용했다.

## 검증

- `npm run lint`: 0 errors, 14 warnings(기존과 동일한 이미지·location.assign 경고, 새 경고 없음).
- `npm run typecheck`: 통과.
- `npm test`: 1267개 중 1265 pass, 2 fail — `tests/assistant-photo.test.mjs`(Python admission 게이트)와 `tests/assistant-runtime.test.mjs`(로컬 모델 기동 대기). 이 머신에 Python이 없어 발생하는 기존 실패이며 main에서도 동일하게 실패한다. 이번 변경과 무관하다.
- `tests/naru-hub.test.mjs`(신규, 5개): 모든 `tool` 값이 `ASSISTANT_TOOLS`에 있는지, 조건 미충족 항목이 완전히 제외되는지(비활성 아님), 상한이 지켜지는지 확인. 통과.
- `npm run build:vercel`: 통과.
- `npm run check:performance`: 통과. CSS gzip 70.00 → 70.00 KiB(변화 없음), plannerInitialJsGzipKiB 206.26 → 205.45 KiB(측정 오차 범위 내), 예산 내.
- e2e: `e2e/naru-help-hub.spec.ts`(신규, 4개) 전부 통과 — 도움 모음 노출과 조건 필터링, 항목 클릭 시 대화 닫힘·도구 초점 이동, 닫으면 나루 버튼으로 초점 복귀, 모델 미가용 상태에서도 동작(직접 이야기하기만 숨김), 키보드만으로 조작, `.naru-panel` axe 위반 0건.
- 기존 나루 대화 회귀 확인: `e2e/simple-naru-conversation.spec.ts`(9개), `e2e/naru-availability-recovery.spec.ts`(4개), `e2e/naru-persona-actions.spec.ts`(10개), `e2e/naru-followup-intents.spec.ts`(3개) 모두 통과.
- `server/assistant/handler.ts`를 코드 검토로 확인: 이 작업에서 수정하지 않았고 `현재 위치는 제공되지 않습니다` 문장과 좌표 미수신 계약이 그대로다.
- `npm run test:e2e`(전체 스위트)는 실행하지 않았다. 로컬에서 전체 스위트를 순차 실행하기엔 시간이 오래 걸려, 나루 대화 관련 스펙과 신규 스펙만 선택 실행했다. 1440px·960px·390px 실제 브라우저 렌더링 확인은 수행하지 않았다(수동 브라우저 세션 미실행). 이 두 가지는 실행하지 못했다고 정직하게 기록한다.

## 완료 기준 대조

- 대화를 입력하지 않고 도구를 바로 열 수 있다: 충족.
- 조건 미충족 항목이 화면에 남지 않는다: 충족(단위 테스트로 고정).
- 모델을 쓸 수 없는 상태에서도 도움 모음이 동작한다: 충족(e2e로 확인).
- dialog 겹침 0, 초점 복원 항상 동작: 충족(e2e로 확인, 기존 `goToTool`/`close` 경로 재사용).
- 나루 요청에 위치 필드 없음: 충족(handler.ts 미수정, 코드 검토로 확인).
- 검증 명령·e2e 통과, axe 위반 0건: 위 "검증" 절 참고. 전체 `test:e2e` 스위트와 1440/960/390 수동 렌더링은 실행하지 못했다.

## PR

- PR 링크: (push 후 채움)
