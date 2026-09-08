# #347 출발 전 날씨 근거 링크

- 관련 Issue: [#347](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/347), 전체 Issue를 종료하는 변경은 아님
- 기준 main: `9caca69fd5db24ed0bc741ad68ffef0d00ffe3ee` (#375, Production 반영 확인)
- 작성: Codex Engineering. Owner가 승인한 기존 제품 결함 수정이며 독립 검토자는 구현에 참여하지 않았다.
- 상태: 로컬 수정·관련 검증 완료. 이 문서 작성 시점에는 새 변경의 CI·Preview·병합·Production 검증 대기. 후속 결과는 해당 PR과 #288 원장에 기록한다.

## 원인과 변경

출발 전 카드의 날씨·관광 집중률 링크는 `#layers`로만 이동했다. 닫힌 패널은 React 상태에 의해 내용이 마운트되지 않아, 링크를 눌러도 실제 예보를 읽을 수 없었다. 기존 별도 날씨 버튼은 패널을 여는 상태 변경을 수행했다.

두 진입점이 같은 열기 동작을 사용하도록 연결했다. 사용자가 활성화한 링크의 대상과 단계 이동을 기존 `usePlannerStageView`에 전달해, 패널 열기와 초점을 함께 처리한다. 패널을 닫고 같은 해시에서 다시 Enter를 눌러도 기존 layout effect가 대상에 초점을 준다. 새 타이머·효과로 나중에 초점을 빼앗지 않는다. 수정키를 누른 링크와 다른 근거 링크의 기본 동작은 보존했다.

- `app/planner/page.tsx`: 공통 열기 동작, 기존 버튼과 카드 연결.
- `features/planner/components/DepartureReadinessCard.tsx`: 일반 `#layers` 활성화만 공통 동작에 연결.
- `features/planner/hooks/usePlannerStageView.ts`: 단계와 해당 단계의 세부 대상을 구분. 기존 호출의 기본 대상은 기존 단계 그대로다.
- `e2e/weather-language.spec.ts`: 실제 닫힌 내용, 포인터·Enter, 같은 해시 재열기, 대상 초점, 조회 수, 저장 장소 보존을 검사한다.

## 실패와 검증 근거

- 독립 사전 재현: 원래 링크는 `details.open=false`, WeatherBoard 0. 별도 날씨 버튼은 정상. 이전 `f4d5d9`부터 존재한 P2이며 #375 회귀가 아니다. [재현 기록](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/347#issuecomment-5588930331).
- 새 회귀를 수정 전 실행: desktop **1 FAIL**, 패널 열림 assertion에서 8초 후 실패. 이 실패의 스크린샷·문맥·trace를 보존했다.
- 첫 수정은 실제 내용 **2기기 PASS**였지만, 동일 해시에서의 키보드 대상 초점 assertion을 추가하자 **2 FAIL**. 이 근거를 보존하고 기존 단계 이동의 초점 처리를 연결했다. assertion은 제거하지 않았다.
- 최종 포커스 회귀: **desktop/mobile 2 PASS**, 3.4초.
- `node scripts/run-playwright.mjs e2e/weather-language.spec.ts e2e/planner-navigation-language.spec.ts`: **22 PASS**, 25.1초. 두 기기의 날씨·키보드·확대 뷰포트·axe·언어 전환·단계 이력을 포함한다. 정상 원격 provider 성공이 아니라 기존 신뢰 fixture 회귀다.
- `npm test`: **696 PASS**, fail/skip/cancel 0.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS, 오류 0·기존 경고 5. 중간 callback 의존성 경고 1건을 명시적 안정 함수 참조로 수정했다.
- `npm run build:vercel`, `npm run check:performance`: PASS. 로컬 gzip CSS 69.98/70, landing 119.85/155, planner 269.83/270, largest 95.92/110 KiB. 최종 CI에서 같은 기준을 다시 검사한다.
- 데스크톱·모바일 실제 회귀 캡처에서 열린 예보를 직접 확인했다. 테스트 삭제·skip 추가·timeout 증가·assertion/locator 약화·강제 클릭·재시도/worker/성능 예산 변경 없음.

원본 로그·trace·스크린샷은 `D:/wave-db-binding-preflight-20260908/weather347-*`에 보존했다. 첫 2 PASS 실행은 PowerShell의 stderr 경고 처리로 외부 셸이 1을 반환했으며 이를 PASS exit로 바꾸어 기록하지 않았다. 이후 명령은 실제 자식 종료 코드를 명시적으로 반환하고 22 PASS/exit 0을 확인했다.

## 범위와 남은 확인

날씨를 새로 조회하지 않고 이미 받은 내용을 연다. 패널을 열 때 기존 주변 정보 조회는 동작할 수 있으므로 전체 제공처 호출 0이라고 주장하지 않는다. 직접 URL/브라우저 이력으로 `#layers`에 진입했을 때 자동으로 패널을 여는 정책은 이번 명시적 클릭 수정의 완료 조건에 포함하지 않는다.

새 변경의 exact-HEAD Full CI·Preview·독립 QA와 실제 Production 확인은 별도 Gate다. 기존 ODsay 계정 제한과 #372 hold를 해제하거나 추가 실호출하지 않는다. 전체 #347/#353·공모전 제출 완료 또는 Release GO를 선언하지 않는다.
