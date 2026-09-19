# 나루 응답 스트리밍과 말·실행 분리 (명세 51)

- 작성자: 사용자 요청에 따른 Claude Opus 5
- AI 도구: Claude Code, 로컬 명령
- 기준: `feat/spec-42-naru-support-style` (계보: `main` `5ffa800` → #588 → #589 → #592 → 이번 작업)
- 브랜치: `feat/spec-51-naru-streaming` (base `feat/spec-42-naru-support-style`)
- 상태: 구현 및 로컬 검증 완료. **실제 모델로는 검증하지 못했다.** 병합·배포는 하지 않았다.

## 목적과 범위

`specs/51-naru-streaming-split.md`를 구현했다. 나루가 다 생각한 뒤에 한꺼번에 말하는
방식을 말하면서 생각하는 방식으로 바꾼다. 말할 것(구분자 앞 평문)과 실행할 것(구분자 뒤
JSON 제안)을 분리해 말이 먼저 흐르게 한다. **이 작업은 글자까지다.** 음성·오디오·WebSocket은
다루지 않았다.

## 근거로 삼은 실측 (배포 사이트)

2026-09-19, `scripts/evaluate-naru.mjs`를 `WAVE_EVAL_BASE`로 배포에 겨눠 측정한 값이다.

| 항목 | 현재(비스트리밍) |
| --- | --- |
| 나루 응답 전체 | 2.3초 |
| 일정 생성까지 추가 | 4.2초 |

이 2.3초 동안 화면에 아무 글자도 뜨지 않는 것이 이 작업의 근거다. 이 측정은 사람이
배포 환경에서 수행했다. **이 머신에서는 로컬 모델에 접근할 수 없어 스트리밍 후의 첫 토큰
시간과 초당 토큰은 측정하지 못했다.**

## 구현

### 새 파일

- `lib/assistant-stream.js` / `lib/assistant-stream.d.ts`: 말·실행 분리 순수 로직.
  - `NARU_PROPOSAL_DELIMITER = '\n<<<PROPOSAL>>>\n'`, `NARU_STREAM_LIMIT = 6000`.
  - `createNaruStreamReader()`: 도착한 조각에서 흘려보낼 글자만 돌려준다. 청크 경계에
    걸친 구분자를 놓치지 않도록 구분자의 접두사가 될 수 있는 접미사만 보류한다.
    첫 비공백 글자가 `{` 또는 백틱이면 기존 `{reply, proposal}` JSON으로 보고 **아무것도
    흘려보내지 않는다**(되돌아갈 길). 구분자가 두 번 이상이면 첫 번째만 구분자로 보고
    나머지는 제안 본문에 남긴다. 누적 6,000자를 넘으면 거기서 끊는다.
  - `naruStreamDelta(line)`: SSE(`data: {...}`)와 줄 단위 JSON 양쪽에서 글자 조각만 꺼낸다.
    알 수 없는 줄과 제공처 원본 오류 문자열은 빈 문자열이다.
- `features/planner/services/naru-stream.ts`: 클라이언트 NDJSON 리더. `isNaruStream`,
  `readNaruStream`. `done` 프레임이 와야만 제안을 돌려주고, 끊긴 스트림은 오류 없이
  받은 글자만 돌려준다.
- `tests/assistant-stream.test.mjs`(신규 14개), `e2e/naru-stream.spec.ts`(신규 4개).

### 서버

- `server/assistant/handler.ts`
  - `WAVE_AI_STREAM`이 `1`/`true`/`on`일 때만 켜진다. **기본값은 꺼짐.** 꺼진 경로는
    요청 본문(`stream:false`, `response_format:{type:"json_object"}`)과 응답이 그대로다.
  - 켜졌을 때만 시스템 프롬프트 뒤에 `streamFormat` 한 덩어리를 덧붙인다. 기존
    `instructions` 문장은 **하나도 지우거나 바꾸지 않았다.** 덧붙인 내용은 출력 형식과
    "`<<<PROPOSAL>>>`를 답변 본문에 쓰지 마세요." 한 줄이다.
  - 제공처 스트림을 읽으며 구분자 앞을 NDJSON으로 흘려보낸다:
    `{"type":"text","value":"..."}` → `{"type":"done","reply":...,"proposal":...,"source":"local-llm"}`.
    `server/assistant/planning.ts`의 진행 프레임(`{type,...}` 줄 단위 JSON, `application/x-ndjson`)과
    같은 형식 규칙을 따랐다. `ReadableStream`만 쓰고 WebSocket은 쓰지 않았다.
  - 제안은 **전부 도착한 뒤** `groundAssistantProposal` → `validateAssistantAction`
    순서로 검증한다. 기존 비스트리밍 경로와 같은 `finalize()` 하나를 공유한다.
    사진 경로는 `streaming = !photo && ...`로 아예 스트리밍하지 않는다.
  - 스트리밍 중에는 동시 실행 슬롯(`active`)과 45초 타이머를 스트림이 끝날 때 해제한다
    (`handedOff`/`release`). 제한을 완화하지 않았다.
- `server/shared/provider-request.js` / `.d.ts`: `context.stream === true`이면 본문을
  버퍼링하지 않고 그대로 넘긴다. 실패 분류(429→rate_limited 등)와 회로 상태 갱신은
  동일하게 유지한다. 스트림 본문은 읽는 쪽이 하나뿐이라 in-flight 공유에서 제외했다.
- `server/assistant/gateway.py`: 스트리밍 통과 경로(`relay_stream`)를 더했다.
  기존 비스트리밍 경로와 `FORMAT`·`PHOTO_FORMAT` 스키마는 **지우지 않았고**, 사진 요청은
  `stream`을 보내도 항상 기존 스키마 경로로 간다. `BoundedSemaphore(1)`, 속도 제한,
  입력 크기 한계, 로그를 남기지 않는 규칙을 그대로 두었다. `warm-model.py`와 systemd
  단위 파일은 수정하지 않았다.
- `worker/index.ts`: **수정하지 않았다.** 스트리밍 응답도 같은 `/api/assistant`로 나간다.

### 클라이언트

- `features/planner/components/PlannerAssistant.tsx`
  - 응답 Content-Type이 `x-ndjson`일 때만 스트림을 읽는다. 아니면 지금 코드 그대로다.
  - 도착 중인 글자는 기존 `.naru-message.assistant` 마크업을 그대로 쓰고 본문 `<p>`에
    `aria-hidden="true"`를 둔다. 대화 로그는 `aria-live="polite" aria-relevant="additions"`
    이므로 **도착 중에는 읽히지 않고**, 완료된 답변이 대화에 추가될 때 한 번만 알려진다.
  - `답변 읽어주기`는 도착 중에도 누를 수 있고 자동 재생하지 않는다.
  - 제안 카드는 `done` 뒤 기존 경로에서만 그린다. 도착 중에는 그리지 않는다.
  - 중간 취소는 기존 `AbortController`(`중단` 버튼, 새 질문)를 그대로 쓰고 도착 중 글자를 지운다.
  - 스트림이 끊기면 받은 글자를 대화에 남기고 `답변이 끊겼어요. 다시 물어봐 주세요.` 한 줄만
    보여준다. 새 오류 코드를 만들지 않았다.
  - **CSS를 한 줄도 추가하지 않았다.** 깜빡이는 커서·점 애니메이션 없음. 기존 스크롤 추종
    로직에 도착 중 글자를 포함시켜 대화 영역이 튀지 않게 했다.
- `docs/naru-service.md`: 응답 형식, 플래그, NDJSON 형식, 되돌아갈 길, 화면 규칙을 적었다.

## 명세와 다르게 구현한 부분

1. **구분자 금지 문장은 스트리밍 프롬프트에만 붙였다.** 명세는 "시스템 프롬프트에 구분자를
   답변에 쓰지 말라고 한 줄 적는다"고 했지만, 꺼진 상태의 요청 본문이 변경 전과 **완전히
   같아야 한다**는 상세 계약 1번과 충돌한다. 기존 프롬프트에 문장을 더하면 꺼진 상태의
   요청 본문이 달라진다. 두 요구 중 "꺼진 상태 동일"을 우선했고, 그 문장은 구분자를 실제로
   쓰는 스트리밍 프롬프트에만 붙였다. 테스트가 두 조건을 모두 단언한다.
2. **`done` 프레임에 확정 `reply`를 함께 싣고 클라이언트가 표시 글자를 교체한다.**
   기존 코드는 `create-itinerary`·`adapt-itinerary`·`set-dates`·`recalculate-route`
   제안에서 모델의 `reply`를 **버리고 정해진 안내 문장으로 바꾼다**(통행 보장·보존 범위를
   약속하는 문장이라 안전 규칙의 일부다). 스트리밍에서 모델 글자만 남기면 이 규칙이
   사라지므로, 완료 시 같은 `finalize()`가 계산한 확정 문장을 보내 화면을 맞춘다.
   결과적으로 최종 화면 상태는 꺼진 상태와 같다.
3. **검증 실패 처리가 두 경로에서 다르다(의도).** 꺼진 경로는 지금처럼 `invalid-action`으로
   503을 내고, 켠 경로는 이미 글자를 보낸 뒤이므로 503을 낼 수 없어 상세 계약 4번·오류 처리
   절에 따라 **제안만 버리고 대화는 남긴다.** 부분 적용은 없다.
4. **스트리밍 요청도 등록된 제공처 경계(`requestProvider`)를 지난다.** 저장소의
   `tests/provider-budget-inventory.test.mjs`가 서버 코드의 직접 `fetch`를 금지하므로,
   경계 파일 자체에 "버퍼링하지 않는" 모드를 추가하는 쪽을 택했다. 회로 차단·실패 분류는
   그대로다.
5. **스트리밍 도우미는 동적 `import`로 불러온다.** 정적 import를 추가하면 기존
   `tests/planner-assistant.test.mjs`의 의존성 주입 맵(건드리면 안 되는 기존 테스트)이
   깨진다. 켜졌을 때만 불러오므로 꺼진 경로의 동작도 더 정확히 보존된다.
6. **0단계 측정(첫 토큰 시간·초당 토큰·가용 VRAM)은 수행하지 못했다.** 명세가 "구현자는
   수행 불가"로 지정한 항목이며, 이 머신에서 DSW 박스에 접근할 수 없다.

## 검증

- `npm run lint`: 0 errors, 14 warnings(기준선과 동일).
- `npm run typecheck`: 통과.
- `npm test`: 1294개 중 1292 pass. 실패 2건(`authenticated gateway applies image admission
  independently`, `dedicated AI runtime waits for startup and never repeats model loading`)은
  이 머신에 Python이 없어 생기는 기존 문제이며(`spawnSync` 종료코드 9009) base 브랜치에서도
  동일하게 실패한다. 두 테스트는 각각 `server/assistant/test-photo-gateway.py`(게이트웨이의
  `validate_photo_messages`만 호출)와 `server/assistant/test-warm-model.py`(`warm-model.py`)를
  실행한다. 이번 변경은 `validate_photo_messages`와 `warm-model.py`를 건드리지 않았고,
  `gateway.py`의 모듈 수준 코드·상수도 그대로여서 두 테스트의 검사 대상에 영향이 없다.
  **다만 Python이 없어 실제 실행으로 확인하지는 못했고, `gateway.py`의 새 코드도 구문 실행
  검증을 하지 못했다.**
- `tests/assistant-stream.test.mjs`(신규 14개) 전부 통과.
- `npm run build:vercel`: 통과.
- `npm run check:performance`: 통과. **CSS gzip 70.00 KiB(예산 70 KiB)로 전후 변화 없음**
  (`cssRawKiB` 367.99도 동일). CSS 파일을 수정하지 않았다.
- e2e(desktop-chromium, 선택 실행, 나루 관련만): `e2e/naru-stream.spec.ts`(신규 4) +
  `naru-guidance`(4) + `simple-naru-conversation`(9) + `naru-persona-actions`(10) +
  `naru-followup-intents`·`naru-availability-recovery`·`naru-help-hub`·`naru-photo`·
  `naru-photo-recovery`·`planner-conversation`(19) = **46개 모두 통과**. 새 spec의 axe
  위반 0건(도착 중·완료 후·끊김 후 각각 `.naru-panel` 검사). 전체 `test:e2e` 스위트는
  돌리지 않았다.
- **실제 모델(DSW Ollama 게이트웨이) 검증은 이 머신에서 불가능해 수행하지 못했다.**
  모든 스트리밍 검증은 합성 fixture다. 추측한 동작을 검증했다고 적지 않았다.

## 완료 기준 대조

- `WAVE_AI_STREAM`이 꺼진 상태의 동작이 변경 전과 동일하고 테스트로 고정: 충족.
- 켠 상태에서 글자가 점진적으로 나타난다: 합성 fixture로 충족(실제 모델 미검증).
- 제안 검증 경로와 화이트리스트가 변경 전과 동일: 충족(`lib/assistant-actions.js` 미수정).
- 사진 경로가 스트리밍되지 않는다: 충족(서버·게이트웨이 양쪽에서 차단, 테스트 고정).
- 시스템 프롬프트의 안전 규칙이 하나도 사라지지 않았다: 충족(회귀 테스트).
- CSS 용량이 늘지 않았다: 충족.
- 기본값이 꺼짐이다: 충족.
- 검증 명령 통과·axe 위반 0건: 위 "검증" 절 참고. 실제 모델 검증은 미수행으로 기록.

## PR

- PR 링크: (작성 후 기록)
