# 나루 동작 추가 절차 고정 (명세 19)

- 작성자: 사용자 요청에 따른 Claude Sonnet 5
- AI 도구: Claude Code, 로컬 명령
- 기준: `feat/spec-12-naru-help-hub` (base `main` `5ffa800`)
- 브랜치: `feat/spec-19-naru-action-expansion` (base `feat/spec-12-naru-help-hub`)
- 상태: 구현 및 로컬 검증 완료. 병합·배포는 하지 않았다.

## 목적과 범위

`specs/19-naru-action-expansion.md`를 구현했다. 이 작업은 동작 하나를 만드는 것이 아니라, 앞으로 나루의 동작을 안전하게 늘릴 때 지켜야 할 절차를 코드와 문서로 고정하고, 예로 든 동작 두 개가 이미 있는 것으로 충분한지 먼저 판단하는 작업이다.

## 판단: 새 동작을 추가하지 않았다

두 후보 모두 검토 결과 기존 것으로 충분해 **화이트리스트에 아무 값도 추가하지 않았다.**

1. **`facility-filter`(편의 조건 바꾸기)**: `lib/assistant-actions.js`의 `settings` 분기를 읽어보니 `region` 없이 `profiles`만 보내도 통과한다(`Object.keys(result).length === 1`인 경우만 막는다). `lib/assistant-grounding.js`의 `groundAssistantProposal`도 이미 발화에서 언급된 시설을 `resolveFacilityKeys`로 뽑아 `action.profiles`에 병합한다. 새 동작을 추가하면 같은 결과를 내는 두 번째 경로가 생겨 화이트리스트만 넓어지고 얻는 것이 없다.
2. **`tool: "communication"`(현장 의사소통판)**: 저장소 전체를 검색했지만 전용 의사소통판 화면(#528)이 아직 구현돼 있지 않다. main이 `5ffa800`에서 멈춰 있고 관련 PR이 병합된 적이 없어서다. 이미 있는 `inquiry` 도구가 직원에게 보여줄 문의 카드를 큰 글자로 열고 복사까지 지원해 "현장에서 말이 통하지 않을 때"라는 요구를 지금 화면 안에서 충족한다. 존재하지 않는 화면을 여는 도구 이름을 먼저 화이트리스트에 넣지 않았다. #528이 실제로 구현되면 이 절차로 다시 판단해야 한다.

두 판단 모두 `docs/naru-service.md`의 새 절 "나루 동작 추가 절차 (명세 19)"와 `tests/assistant-actions.test.mjs`에 기록·고정했다.

## 구현

- `lib/assistant-actions.js`: 파일 상단에 동작 추가 7개 조건(되돌릴 수 있다 / 화면에 이미 있다 / 매개변수가 닫혀 있다 / 위치가 필요 없다 / 바깥으로 나가지 않는다 / 검증 함수가 있다 / 실패해도 안전하다)을 주석으로 적었다. **화이트리스트 값·`validateAssistantAction`의 분기·검증 규칙은 한 글자도 바꾸지 않았다.**
- `docs/naru-service.md`: 같은 7개 조건과 이번에 검토한 두 동작을 추가하지 않은 판단 근거를 "나루 동작 추가 절차 (명세 19)" 절로 기록했다.
- `tests/assistant-actions.test.mjs`(신규): 기존 `ASSISTANT_ACTIONS`(23개)·`ASSISTANT_TOOLS`(23개) 값이 하나도 사라지지 않았음을 배열 비교로 고정하는 회귀 테스트, 화이트리스트에 없는 동작·도구 이름이 버려지는 것, `placeId`가 호출자 목록 밖이면 버려지는 것, `settings`가 `region` 없이 `profiles`만으로 통과하는 것(=`facility-filter` 요구를 이미 충족), region/themes/날짜 7일 상한/`time` 정규식 검증이 기존과 같은 것을 확인한다.
- `server/assistant/handler.ts`, `lib/assistant-grounding.js`, `server/assistant/gateway.py`, `warm-model.py`, systemd 단위 파일: **수정하지 않았다.**

## 검증

- `npm run lint`: 0 errors, 14 warnings(기존과 동일).
- `npm run typecheck`: 통과.
- `npm test`: 1275개 중 1272 pass. 실패 2건은 `tests/assistant-photo.test.mjs`·`tests/assistant-runtime.test.mjs`로 이 머신에 Python이 없어 발생하는 기존 문제이며 main에서도 동일하게 실패한다(이번 변경과 무관).
- `tests/assistant-actions.test.mjs`(신규, 8개) 전부 통과.
- `npm run build:vercel`: 통과.
- `npm run check:performance`: 통과. 이번 작업은 UI·CSS를 전혀 바꾸지 않아 CSS gzip은 70.00 KiB로 그대로다.
- e2e 회귀(선택 실행, desktop-chromium): `e2e/simple-naru-conversation.spec.ts`(9), `e2e/naru-persona-actions.spec.ts`(10), `e2e/naru-followup-intents.spec.ts`(4), `e2e/naru-availability-recovery.spec.ts`(3), `e2e/naru-help-hub.spec.ts`(4) 총 30개 모두 통과.
- 새 동작을 추가하지 않았으므로 `e2e/naru-action.spec.ts`를 새로 만들지 않았다. 기존 제안 카드 승인/취소/되돌리기 흐름은 위 회귀 e2e가 이미 검증한다.
- **하지 못한 검증**: "대표 요청 10건 이상으로 새 동작이 실제 모델 응답에서 올바르게 검증되는지 측정"은 이 머신에서 나루 로컬 모델(DSW Ollama 게이트웨이)에 접근할 수 없어 실행하지 못했다. 새 동작을 추가하지 않았으므로 측정 대상 자체가 없다는 점도 함께 밝힌다. 합성 응답을 품질 증거로 쓰지 않았다.
- `npm run test:e2e`(전체 스위트)와 1440px·960px·390px 수동 렌더링 확인은 시간 관계상 실행하지 못했다.
- `server/assistant/handler.ts`를 코드 검토로 확인: 컨텍스트 재구성·입력 크기 제한·동시 실행 제한·응답 크기 제한·사진 경로 분리·`현재 위치는 제공되지 않습니다` 문장이 모두 그대로다.

## 완료 기준 대조

- 동작 추가 7개 조건이 `lib/assistant-actions.js` 주석과 `docs/naru-service.md`에 적혀 있다: 충족.
- 기존 동작 목록에서 사라진 값 0개, 회귀 테스트로 고정: 충족.
- 추가한 동작은 없다(둘 다 기존 것으로 충분): "기존으로 충분해 추가하지 않기로 한 경우 판단 근거를 PR에 적는다" 조건 충족.
- 검증 규칙이 완화된 곳 0건: 충족(화이트리스트·검증 함수 미변경).
- 나루 요청에 위치 관련 필드 없음: 충족(handler.ts 미수정).
- 검증 명령·e2e: 위 "검증" 절 참고. 전체 test:e2e 스위트, 1440/960/390 수동 렌더링, 대표 요청 10건 모델 측정은 실행하지 못했다.

## PR

- PR 링크: (push 후 채움)
