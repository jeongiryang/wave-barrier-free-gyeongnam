# 나루가 근거와 미확인을 먼저 말하기 (명세 55)

- 작성자: 사용자 요청에 따른 Claude Opus 5
- AI 도구: Claude Code, 로컬 명령
- 기준: `feat/spec-51-naru-streaming` (계보: `main` `5ffa800` → #588 → #589 → #592 → #594 → 이번 작업)
- 브랜치: `feat/spec-55-naru-evidence` (base `feat/spec-51-naru-streaming`)
- PR: https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/598
- 상태: 구현과 로컬 검증 완료. 배포 대상 응답과 숫자 일치까지 확인했다. 병합·배포는 하지 않았다.

## 목적

`specs/55-naru-evidence-first.md`를 구현했다. 나루가 개수가 아니라 근거로 답변을
시작하게 한다. **새 데이터를 붙이는 작업이 아니다.** 이미 장소 응답에 들어 있는
편의 상태를 화면이 세어서 말하게 하는 작업이다.

## 근거로 삼은 실측 (배포 사이트, 2026-09-19)

나루에게 `휠체어로 이동하기 편한 통영 당일 여행을 찾아줘`라고 물었을 때 답변은
`현재 불러온 후보 중 12곳을 찾았어요.`가 전부였고 목록에 휠체어 관련 언급이 없었다.

같은 날 `GET /api/wave?action=plan&region=경남 전체&page=1..3` 표본 36곳의 채움률:

| 편의 | confirmed | unknown | negative |
| --- | --- | --- | --- |
| 접근로 | 11 (31%) | 25 | 0 |
| 주차구역 | 10 | 26 | 0 |
| 화장실 | 9 | 27 | 0 |
| 승강기 | 5 | 31 | 0 |
| 음성안내 | 1 | 35 | 0 |
| 안내견 | 0 | 36 | 0 |
| 점자블록 | 0 | 36 | 0 |
| 수어안내 | 0 | 36 | 0 |

확인된 편의가 하나라도 있는 장소는 36곳 중 11곳(31%)이다. 그러므로
`12곳을 찾았어요`는 부정확하다. `negative`가 전 항목 0건이므로 **미확인과 없음의
구분이 실제로 중요하다.**

## 구현

### 새 파일 `lib/naru-evidence.js` / `lib/naru-evidence.d.ts`

순수 함수만 둔다. 시간·무작위값·네트워크·저장소·위치 API를 참조하지 않는다.

- `placeFacilityState(place, key)`: 한 장소의 한 편의 상태. 항목이 없으면 `unknown`이며
  `negative`가 아니다. 항목에 `state`가 없으면 `lib/accessibility-score.js`의
  `accessibilityFieldState(detail)`을 **그대로** 쓴다. 새 판정 규칙을 만들지 않았다.
- `hasAccessibilityEvidence(places)`: 응답에 편의 항목이 하나도 없으면 요약을 그리지 않기
  위한 판정.
- `weakestFacility(places, facilityKeys)`: 가장 적게 확인된 편의를 고른다. 가장 약한 고리가
  실제 제약이기 때문이다. 동점이면 사용자가 먼저 고른 것을 쓰므로 결정적이다. 조건이
  없거나 편의 정보가 전혀 없으면 `null`이고, 그때는 아무 표시도 하지 않는다.
- `tallyEvidence(places, key)`: `confirmed`/`unknown`/`negative` 개수. 세 값의 합은 언제나
  전체와 같다. 점수·등급·추천도·순위 필드는 만들지 않았다(테스트로 고정).
- `groupByEvidence(places, key)`: `확인된 곳`과 `정보가 없는 곳`. 두 묶음의 합이 전체와
  같으므로 정보가 없는 장소를 목록에서 빼지 않는다. `unknown`과 `negative`를 하나로
  뭉개지 않고 각 항목의 상태는 `placeFacilityState`로 그대로 읽힌다.
- `evidenceSentence(tally, region)` / `missingPhrase` / `evidenceGroupTitle` /
  `evidenceStateText`: 한국어 문장. 받침에 맞춰 주격 조사를 고른다.

### `features/planner/components/PlannerAssistant.tsx`

- 장소 목록을 돌려주는 답변에만 요약 한 줄과 두 묶음을 더했다. 다른 답변은 그대로다.
- 확인·미확인 개수와 항목별 상태는 **장소 응답에서만** 계산한다. 모델 출력(`message.text`,
  도착 중인 글자)에서 숫자나 상태를 파싱하지 않는다. 이것을 테스트로 고정했다.
- 답변이 확정되어 `messages`에 들어간 뒤에만 그려진다. 스트리밍(명세 51) 중에 보이는
  블록에는 이 표시가 없으므로 숫자가 도중에 바뀌어 보이지 않는다.
- 답변이 만들어질 때의 편의 조건과 지역을 `evidenceKeys`/`evidenceRegion`으로 메시지에
  함께 굳혀 둔다. 뒤에 조건을 바꿔도 이미 그려진 답변의 숫자가 흔들리지 않는다.
  조건은 서버가 돌려준 `criteria.facilityKeys`를 먼저 쓰고, 없을 때만 사용자가 고른
  편의로 되돌아간다.
- 담기/시설 정보 확인 버튼은 묶음과 무관하게 같은 `resultRow` 하나에서 나온다. 정보가
  없는 곳도 담을 수 있다. 판단은 사용자가 한다.
- 기존 제안 카드·담기 동작·`lib/assistant-actions.js`는 건드리지 않았다. 새 서버 action도
  만들지 않았다.

### `server/assistant/handler.ts`

시스템 프롬프트에 **한 문단만** 더했다. "개수만 말하지 말고 확인된 것과 확인되지 않은
것을 구분해 말할 것, 숫자와 상태는 화면이 채우므로 모델이 세거나 판정하지 말 것,
확인된 곳이 없을 수 있다는 사실을 숨기지 말 것." 기존 문장은 하나도 지우지 않았고 안전
규칙이 마지막에 오도록 마지막 안전 문단 **앞**에 넣었다. 기존
`tests/assistant-guidance.test.mjs`의 안전 규칙 회귀 테스트가 그대로 통과한다.

### `server/assistant/planning.ts`

**수정하지 않았다.** `reasons`는 `lib/naru-journey.js`의 `selectJourneyStops`가 만들고
`server/assistant/planning.ts` → `NaruJourney.stops[].reasons` →
`features/planner/components/NaruJourneyProposal.tsx`(각 stop의 `<p>{stop.reasons.join(' · ')}</p>`)
까지 **이미 이어져 있다.** 끊긴 곳이 없어 새로 만들 것이 없었다. 배포 응답에서도
`"reasons":["접근로 정보 확인","공식 소개에 실내 공간 기록","하루 두 곳 이내, 방문 사이 휴식 제안"]`
이 그대로 돌아온다(아래 확인 기록).

### CSS

**한 바이트도 늘리지 않았다.** 기존 `.naru-result-list`, `.naru-place-name`,
`.access-badge`만 쓰고 묶음 구분은 `data-evidence-group` 속성과 `role="group"`으로
했다. `globals.css`·`design-system.css`는 건드리지 않았다. 새 클래스를 쓰지 않는다는
것을 테스트로 고정했다.

빌드 산출물의 CSS gzip 합계는 **전 71,681바이트 → 후 71,681바이트**로 동일하다
(`npm run check:performance` 기준 70.00 KiB, 상한 70 KiB). 늘지 않았으므로 죽은 선언을
제거해 상쇄할 필요가 없었다.

## 명세와 다르게 한 곳

1. **요약 문장의 고정 형식에 두 갈래를 더했다.** 명세의 형식은
   `… 나머지 {미확인}곳은 정보가 등록돼 있지 않아요.` 하나지만, `negative`가 섞이면
   "미확인"과 "없음"을 한 숫자로 합치게 되어 명세의 절대 불변조건("미확인을 없음으로
   표시하지 마라")과 충돌한다. 그래서 `negative > 0`일 때만
   `{unknown}곳은 정보가 등록돼 있지 않고 {negative}곳은 {편의}가 없다고 적혀 있어요.`로
   갈라 말한다. 실측상 `negative`는 0건이라 평소에는 명세의 형식 그대로 나온다.
2. **전체가 확인된 경우 문장을 따로 뒀다.** 그대로 두면 `나머지 0곳은 정보가 등록돼 있지
   않아요.`가 되어 사실은 맞지만 읽기에 어색하다. `{전체}곳 모두 {편의}가 확인됐어요.`로
   말한다. 숫자를 숨기거나 부풀리지 않는다.
3. **묶음을 기존 목록 컨테이너 안에 넣었다.** 명세는 "목록을 두 묶음으로 나눈다"고만
   했다. `aria-label="대화에서 찾은 여행지"` 컨테이너는 그대로 두고 그 안에
   `role="group"` 두 개를 넣었다. 저장소의 기존 e2e(`naru-persona-actions`,
   `simple-naru-conversation`)가 이 라벨로 목록을 찾고 있어서, 기존 테스트를 고치지 않고
   요구 사항을 만족시키기 위한 선택이다.
4. **`weakestFacility`에 `null` 조건을 하나 더 뒀다.** 응답에 편의 항목이 아예 없으면
   `null`을 돌려 표시를 하지 않는다. 명세의 "장소 응답에 편의 정보가 아예 없으면 요약을
   그리지 않는다"를 함수 안에서 지키기 위해서다.

## 검증 (이 머신에서 실제로 돌린 것)

| 명령 | 결과 |
| --- | --- |
| `npm run lint` | 통과. 오류 0, 경고 14건 — 분기 직후 기준선과 같다(전부 랜딩·플래너의 기존 `<img>` 경고) |
| `npm run typecheck` | 통과 |
| `npm test` | 1,315건 중 1,313건 통과, **2건 실패** |
| `npm run build:vercel` | 통과 |
| `npm run check:performance` | 통과. CSS gzip 70.00 KiB / 상한 70 KiB, 기준선과 동일 |
| `npx playwright test e2e/naru-evidence.spec.ts` | 12건 통과 (desktop·mobile chromium), axe 위반 0건 |
| 관련 e2e 7개 파일 | 84건 통과 (`simple-naru-conversation`, `naru-persona-actions`, `naru-stream`, `naru-guidance`, `naru-followup-intents`, `place-decisions`, `plan-response-integrity`) |

### 실패 2건 (기존 문제, 이 작업과 무관)

- `tests/assistant-photo.test.mjs` — `authenticated gateway applies image admission independently`
- `tests/assistant-runtime.test.mjs` — `dedicated AI runtime waits for startup and never repeats model loading`

둘 다 `Python 9009 !== 0`이다. 이 머신에 Python이 없어서 생기며 `main`에서도 실패한다.
기준을 완화하거나 skip 하지 않고 그대로 뒀다.

### 돌리지 않은 것

- `npm run test:e2e` 전체: 지시대로 돌리지 않고 나루·장소 관련 파일만 골라 돌렸다.
- 실제 로컬 LLM을 띄운 대화 검증: 이 머신에 모델 런타임이 없다. 모델은 이 기능에서
  숫자를 만들지 않으므로 숫자 정확성은 모델과 무관하다.

## 배포 대상 확인 (2026-09-19)

GPU 슬롯이 1개이므로 `scripts/evaluate-naru.mjs`는 **`wheel` 한 건만** 돌렸다.

```
WAVE_EVAL_BASE=https://wave-barrier-free-gyeongnam.vercel.app node scripts/evaluate-naru.mjs wheel
```

```json
{"category":"wheel","status":200,"intentMs":2390,"intentPass":false,
 "proposal":{"action":"create-itinerary","region":"경남 전체","profiles":["route"],"indoor":true,"pace":"relaxed","transport":"car"},
 "journey":{"status":200,"ms":4489,"region":"창원","stops":[{"id":"2784201","name":"해양생물테마파크","date":"2026-09-20","unknown":[],
   "reasons":["접근로 정보 확인","공식 소개에 실내 공간 기록","하루 두 곳 이내, 방문 사이 휴식 제안"]}]}}
```

`intentPass:false`는 이 작업 때문이 아니다. 평가 스크립트가 레거시 묶음 이름 `wheel`이
`proposal.profiles`에 들어오기를 기대하는데 모델이 개별 키 `route`를 돌려주기 때문이며,
배포는 이 브랜치 이전 상태다. `reasons`가 그대로 들어 있다는 점이 이 작업의 전제를 확인해 준다.

**요약 숫자가 실제 응답과 일치하는지**는 같은 배포의 장소 응답을 받아 원자료 상태를 직접
세고 `tallyEvidence`의 값과 대조해 확인했다(모델 호출 없음, GPU 미사용).

`GET /api/wave?action=plan&region=경남 전체&facilityKeys=parking,route,wheelchair,elevator,restroom&page=1..3`, 중복 제거 35곳:

| 편의 | 응답 원자료 (confirmed/unknown/negative) | `tallyEvidence` |
| --- | --- | --- |
| 주차구역 | 9 / 26 / 0 | 9 / 26 / 0 |
| 접근로 | 10 / 25 / 0 | 10 / 25 / 0 |
| 휠체어 대여 | 3 / 32 / 0 | 3 / 32 / 0 |
| 승강기 | 5 / 30 / 0 | 5 / 30 / 0 |
| 화장실 | 8 / 27 / 0 | 8 / 27 / 0 |

전 항목에서 일치했고 세 값의 합은 모두 35였다. 가장 적게 확인된 편의는 `wheelchair`이며
요약 문장은 `경남 전체에서 35곳을 봤어요. 휠체어 대여가 확인된 곳은 3곳이고, 나머지 32곳은
정보가 등록돼 있지 않아요.`, 묶음은 3곳 / 32곳(합 35)이었다. `negative`는 전 항목 0건으로
명세의 실측과 같다.

편의 조건 없이(`facilityKeys` 없이) 같은 경로로 받은 36곳에는 `accessibility` 항목 자체가
없었다. 이때 `weakestFacility`가 `null`이라 요약을 그리지 않는다. 명세의 "장소 응답에 편의
정보가 아예 없으면 요약을 그리지 않는다"와 일치한다.

## 완료 기준 대조

| 기준 | 충족 |
| --- | --- |
| 편의 조건을 고른 상태에서 답변이 확인·미확인 개수로 시작 | 예 (e2e) |
| 숫자가 모델이 아니라 코드에서 나온다는 것이 테스트로 고정 | 예 (`tests/naru-evidence.test.mjs`, 모델 출력 파싱 금지 단언 포함) |
| 확인 0곳일 때 그대로 말함 | 예 (단위·e2e) |
| 정보가 없는 장소도 담을 수 있음 | 예 (e2e에서 담기 클릭까지 확인) |
| 미확인과 부재가 글자로 구분됨 | 예 (`승강기 정보 없음` / `승강기 없음`) |
| 시스템 프롬프트 안전 규칙이 하나도 사라지지 않음 | 예 (신규·기존 회귀 테스트 양쪽) |
| CSS 용량이 늘지 않음 | 예 (71,681바이트 → 71,681바이트) |
| 위 명령 통과, axe 위반 0건 | axe 0건. `npm test`는 기존 Python 실패 2건을 제외하고 통과 |

## 하지 않은 것

- 모델이 숫자를 세거나 상태를 판단하게 하지 않았다.
- 점수·등급·추천도·순위를 만들지 않았다.
- 미확인을 없음으로 표시하지 않았다.
- 정보가 없는 장소를 목록에서 빼거나 담기를 막지 않았다.
- 새 서버 action, 새 제공처, 새 동작을 만들지 않았다. `lib/assistant-actions.js`는 그대로다.
- 시스템 프롬프트의 안전 규칙을 지우거나 줄이지 않았다.
- 유료 LLM API로 바꾸지 않았다. 위치 관련 필드를 만들거나 보내지 않았다.
- CSS를 늘리지 않았다. 소개 화면과 워크플로 파일은 건드리지 않았다.
- 저장소의 기존 테스트를 고치지 않았다. 병합·auto-merge·`main` 직접 push 는 하지 않았다.
