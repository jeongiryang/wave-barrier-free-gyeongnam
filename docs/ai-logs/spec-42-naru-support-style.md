# 고른 도움 방식에 맞춘 나루 안내 (명세 42)

- 작성자: 사용자 요청에 따른 Claude Sonnet 5
- AI 도구: Claude Code, 로컬 명령
- 기준: `feat/spec-19-naru-action-expansion` (base `main` `5ffa800`)
- 브랜치: `feat/spec-42-naru-support-style` (base `feat/spec-19-naru-action-expansion`)
- 상태: 구현 및 로컬 검증 완료. 병합·배포는 하지 않았다.

## 목적과 범위

`specs/42-naru-support-style.md`를 구현했다. 나루가 사용자가 **직접 고른** 두 값(편의 조건, 안내 선호)만 근거로 전달 방식과 안내 내용의 우선순위를 바꾼다. 장애 유형을 묻거나 저장하거나 추론하지 않는다.

## 구현

- `server/assistant/handler.ts`: 시스템 프롬프트에 **한 문단만** 추가했다. "사용자가 고른 편의 조건(context.profiles)에 맞춰 장소 안내의 우선순위만 바꾸세요. elevator나 route가 있으면 승강기·접근로 정보를 먼저 언급하고, audioguide나 bigprint가 있으면 음성안내·큰글자안내 정보를 먼저 언급하세요. signguide가 있으면 수어안내 정보를 먼저 언급하고 확인되지 않았다면 tool:inquiry로 현장에서 직접 문의할 수 있다고 안내하세요. 이 우선순위 때문에 사용자가 고르지 않은 시설 정보를 빼거나, 확인/미확인 표시를 바꾸거나, 다른 사실을 말하지 마세요." 이 문단은 마지막 안전 규칙 문장("실행했다고 말하지 마세요. reply에 시설 이용 가능이나 안전 보장을 쓰지 마세요.") **앞에** 배치했다. 기존 안전 규칙 문장은 하나도 지우지 않았고, `context.guidancePreferences`의 `briefAnswers`/`oneAtATime`/`textFirst` 반영 문장(이미 있던 것)도 그대로 두었다.
- `features/planner/components/PlannerAssistant.tsx`: 대화 화면에 `지금 안내 방식` 한 줄을 추가했다. `lib/guidance-preferences.js`의 `guidancePreferenceText(props.guidance.value)`와, `plan.selected`(편의 조건)에서 `route`/`elevator`/`audioguide`/`bigprint`/`signguide`만 걸러 라벨을 붙인 결과를 이어붙여 **사용자가 실제로 고른 것만** 보여준다. 아무것도 고르지 않았으면 "기본 방식"이라고만 표시한다. `바꾸기` 버튼은 기존 `goToTool('facilities')`(필요한 편의 화면)로 바로 이동시킨다.
- `app/privacy/page.tsx`: "나루 AI 여행 대화" 처리 항목에 안내 선호가 대화 컨텍스트에 포함된다는 사실과, 장애 여부·유형·질병·보조기기 종류는 묻거나 저장하지 않는다는 문장을 추가했다.
- `docs/naru-service.md`: "고른 도움 방식에 맞춘 안내 (명세 42)" 절을 추가해 반영 규칙과, 이번에 하지 않은 것(글자 크기 반영)과 그 이유를 기록했다.
- `tests/assistant-guidance.test.mjs`(신규): `server/assistant/handler.ts`의 `instructions` 템플릿 리터럴을 파일 텍스트에서 정규식으로 추출해(빌드 없이 검사하기 위해) 기존 안전 규칙 9개 문장이 모두 남아 있는지, 새 안내 문단이 마지막 안전 규칙보다 앞에 오는지, 프롬프트가 두 벌로 나뉘지 않았는지(문단이 정확히 1번만 나타남), 우선순위 반영 문장이 "정보를 빼지 않는다"와 "수어안내 미확인 시 tool:inquiry"를 포함하는지, `context` 생성 코드에 좌표·장애 유형 필드가 없는지, `sanitizeGuidancePreferences`가 알 수 없는 값(장애 유형처럼 생긴 값 포함)을 버리는지 확인한다.
- `e2e/naru-guidance.spec.ts`(신규): 아무것도 고르지 않았을 때 "기본 방식"만 보이는 것, 고른 편의·안내 선호만 나타나고 고르지 않은 것(수어·음성)은 나타나지 않는 것, `바꾸기`가 필요한 편의 화면으로 바로 이동하는 것, 답변 읽어주기가 자동 재생되지 않고 눌러야만 읽는 것, 읽어주기가 실패해도 대화가 계속 정상 동작하는 것, `.naru-panel`의 axe 위반 0건을 확인한다.

## 명세와 다르게 구현한 부분(중요)

- **글자 크기("큰 글자") 반영은 구현하지 않았다.** 이 저장소에는 전역 글자 크기 설정(#552, "글자 크게 보기")도, `guidancePreferences`에 이를 나타내는 기존 값도 없다. 명세는 "이미 있는 두 값만 반영하고 새 입력을 요구하지 않는다"고 못박았는데, 없는 값을 새로 만드는 것은 이 제약과 충돌한다. 동시에 지시문은 "나루 영역에서 독자적으로 배율을 곱하지 말고 겹칠 위험을 PR에 적으라"고 명시했다. 두 요구를 함께 만족하는 유일한 방법은 글자 크기를 건드리지 않는 것이라고 판단했다. `docs/naru-service.md`에 이 판단과, #552가 나중에 구현되면 그 전역 설정을 그대로 읽어 반영해야 한다는 후속 작업을 남겼다.
- "읽어주기 버튼 제공"은 안내 선호와 무관하게 이미 모든 나루 답변에 항상 제공되고 있었다(기존 코드). 새 조건부 로직을 추가하지 않고 이 사실을 그대로 유지했다 — 오히려 더 넓게 제공되는 상태라 명세 취지에 어긋나지 않는다고 판단했다.
- "바꾸기"는 편의 조건 화면(`facilities` 도구)으로만 보낸다. 안내 선호(짧은 문장/한 번에 하나씩/문자 우선)를 바꾸는 별도의 설정 화면이 이 저장소에 없고(첫 대화의 1회성 "어떤 도움이 필요할까요?" 선택지만 있음), 명세가 새 설정 화면 추가를 금지하므로 기존 화면 중 가장 관련 있는 진입점을 선택했다.

## 검증

- `npm run lint`: 0 errors, 14 warnings(기존과 동일).
- `npm run typecheck`: 통과.
- `npm test`: 1280개 중 1278 pass. 실패 2건(`assistant-photo`/`assistant-runtime`)은 이 머신에 Python이 없어 발생하는 기존 문제이며 main에서도 동일하게 실패한다.
- `tests/assistant-guidance.test.mjs`(신규, 5개) 전부 통과.
- `npm run build:vercel`: 통과.
- `npm run check:performance`: 통과. CSS gzip 70.00 KiB로 변화 없음(재사용 클래스 `.naru-note`와 인라인 스타일만 사용, CSS 파일 미수정).
- e2e(desktop-chromium, 선택 실행): `e2e/naru-guidance.spec.ts`(신규, 4) + `e2e/simple-naru-conversation.spec.ts`(9) + `e2e/naru-persona-actions.spec.ts`(10) + `e2e/naru-followup-intents.spec.ts`(4) + `e2e/naru-availability-recovery.spec.ts`(3) + `e2e/naru-help-hub.spec.ts`(4) + `e2e/planner-conversation.spec.ts`(6) = 40개 모두 통과.
- **"사실 일치 측정"(대표 질문 10건을 안내 방식별로 실행)은 실행하지 못했다.** 이 머신에서 나루 로컬 모델(DSW Ollama 게이트웨이)에 접근할 수 없다. 합성 응답을 품질 증거로 쓰지 않았다.
- `npm run test:e2e`(전체 스위트), 390px·960px·1440px 실제 브라우저 렌더링 확인은 시간 관계상 실행하지 못했다.
- 코드 검토로 확인: `components/NaruAvatar.tsx` 미수정, `lib/assistant-actions.js` 미수정, 나루 요청 컨텍스트(`server/assistant/handler.ts`의 `const context = {...}`)에 좌표·장애 유형·질병·보조기기 필드가 없음, `guidancePreferences`와 `profiles` 외 새 필드 없음.

## 완료 기준 대조

- 나루 안내가 사용자가 고른 편의 조건과 안내 선호만 근거로 달라진다: 충족(시스템 프롬프트 문단 + "지금 안내 방식" 표시).
- 장애 유형을 담는 필드와 수집 코드 0건: 충족(코드 검토 + 테스트로 확인).
- 안내 방식이 달라져도 사실·확인 표시·제안 동작이 같다: 충족(우선순위만 바꾸는 문구, `validateAssistantAction`은 그대로).
- 안전 규칙이 하나도 사라지지 않았고 테스트가 고정: 충족(`tests/assistant-guidance.test.mjs`).
- 수어 아바타 관련 코드 추가 없음: 충족(`components/NaruAvatar.tsx` 미수정).
- 24번(글자 크게 보기)과 겹쳐 글자가 두 배로 커지지 않는다: 글자 크기 반영 자체를 구현하지 않아 겹칠 코드가 없다. 위 "명세와 다르게 구현한 부분"에 이유를 남겼다.
- 검증 명령·e2e: 위 "검증" 절 참고. 전체 test:e2e 스위트, 수동 렌더링 확인, 대표 질문 10건 사실 일치 측정은 실행하지 못했다.

## PR

- PR 링크: (push 후 채움)
