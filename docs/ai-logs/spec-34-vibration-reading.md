# PR #557 AI 작업 로그

- PR: https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/557
- 제목: feat: 진동으로 확인하는 읽기 보조
- 작성자: jeongiryang
- 최종 상태: 열림 (base `fix/preferences-disclosure-focus-contract`)
- AI 도구: Claude Code

## 목적

명세 34 `[P3][접근성] 진동으로 확인하는 읽기 보조`를 구현한다.

원문 아이디어는 점자 대신 진동으로 글을 전달하는 것이었으나 명세의 판단대로 하지 않았다. 휴대폰 진동 모터는 한 곳에서만 떨려 점자처럼 여섯 점의 위치로 글자를 구분할 수 없고, 사용자가 새 부호 체계를 배워야 하며, `navigator.vibrate`는 iOS Safari에서 동작하지 않고 Android에서도 기기마다 세기가 다르다. 대신 시끄러운 현장이나 화면을 보기 어려운 상황에서 "무언가 반응했다"를 알리는 짧은 확인 신호로만 쓴다.

## 역할 구분

- 사람: 요구사항(명세 34), 분기점과 base 결정, 최종 승인
- AI: 코드·테스트·문서 변경, `lib/haptics.js` 모듈 설계, 검사 실행, PR 작성

## 변경 파일

- `lib/haptics.js`, `lib/haptics.d.ts` (신규): 지원 확인·신호 패턴·실행. `navigator.vibrate` 호출은 이 파일 한 곳뿐이다. 네트워크·브라우저 저장소·위치 API를 참조하지 않는다.
- `features/preferences/types.ts`: `Haptics = "off" | "on"` 과 컨텍스트 값 추가.
- `features/preferences/storage.ts`: `wave-haptics-v1` 읽기·쓰기. 기존 `try/catch` 형태를 유지하고 `presentationOptionsEnabled()` 게이트 **밖**에 둔다.
- `features/preferences/context.tsx`: 상태와 `setHaptics`. 게이트를 적용하지 않는다.
- `features/preferences/PreferenceControls.tsx`: `진동 알림` 항목. 미지원이면 그리지 않는다.
- `features/planner/components/OnTripGuide.tsx`: `이곳 방문 완료` 기록 성공 시 `confirm`, 저장 실패 시 `alert`.
- `features/account-travel/CloudSaveAction.tsx`: 계정 저장 성공 시 `confirm`, 실패 시 `alert`.
- `tests/haptics.test.mjs`, `e2e/haptics.spec.ts` (신규).

## 명세와 다르게 구현한 부분

- 명세의 진동 순간 표 1행 `현장 의사소통판에서 직원이 답을 고름`은 구현하지 못했다. `features/planner/components/OnsiteCommunicationBoard.tsx`와 #528이 아직 이 저장소에 없다. 저장소 전체에서 기존 `navigator.vibrate` 호출은 0건이었으므로 옮길 호출도 없었다.
- 명세의 2행 `다녀왔어요`에 해당하는 실제 버튼 이름은 `이곳 방문 완료`다. 기존 문구를 바꾸지 않고 그 버튼에 연결했다.
- `이번에는 건너뛰기`는 정해진 네 순간이 아니므로 성공·실패 어느 쪽도 진동하지 않는다.

## 검증

실행한 명령과 결과:

- `npm run lint` — 통과 (0 errors, 14 warnings). 경고 14건은 분기 전 기준선과 동일하다.
- `npm run typecheck` — 통과.
- `npm test` — 1272건 중 1270건 통과, 2건 실패. 실패는 `authenticated gateway applies image admission independently`, `dedicated AI runtime waits for startup and never repeats model loading`이며 이 머신에 Python이 없어 생기는 기존 문제다. main에서도 실패한다. 이 변경과 무관하다.
- `npm run build:vercel` — 통과.
- `npm run check:performance` — 통과. `cssGzipKiB` 70.00 / 예산 70, `cssRawKiB` 367.99. **분기점과 완전히 동일하다.** 기존 `.preference-row`를 재사용해 새 선택자를 만들지 않았으므로 CSS가 늘지 않았고, 상쇄를 위해 제거한 선언도 없다.
- `npm run test:e2e -- e2e/haptics.spec.ts --project=desktop-chromium` — 신규 5건 모두 통과.
- `npm run test:e2e -- e2e/preferences-disclosure-focus.spec.ts e2e/preferences-help-language.spec.ts e2e/preferences-picker-recovery.spec.ts e2e/trip-day-tools.spec.ts --project=desktop-chromium` — 기존 14건 모두 통과.

실행하지 않은 검사:

- `npm run test:e2e` 전체는 돌리지 않았다. 지시에 따라 신규 spec과 관련 기존 spec만 선택 실행했다.
- `--project=mobile-chromium`은 돌리지 않았다.

수동 확인 내용:

- 코드 검토로 `navigator.vibrate` 호출이 `lib/haptics.js` 밖에 없음을 확인했고, 같은 내용을 `tests/haptics.test.mjs`가 `app` `components` `features` `lib` `server` `worker` 전체를 훑어 자동으로 검사한다.
- **실기기 확인은 하지 못했다.** 이 작업 환경에 진동 모터가 있는 기기가 없다. e2e는 `navigator.vibrate`를 가로채 호출 인자만 검증한 것이므로 실제 진동 세기와 체감은 확인되지 않았다.

## 결과와 제한

- 병합 커밋: 없음. 열린 PR이다.
- 이 PR은 #554(`fix/preferences-disclosure-focus-contract`) 위에 쌓았다. 설정 패널에 컨트롤을 더하는 변경이라 컨트롤 개수에 무관해진 초점 계약이 선행이어야 한다. main에는 아직 아무 PR도 병합되지 않았다.
- 남은 위험: 실기기 미확인. `navigator.vibrate`는 브라우저 정책상 사용자 조작 없이는 무시될 수 있으나 명세대로 오류로 처리하지 않는다.
- 후속 작업: #528 현장 의사소통판이 들어오면 답변 확정 시 `confirm` 신호를 같은 모듈로 연결한다. 그때도 진동 호출은 `lib/haptics.js` 한 곳으로 유지한다.
