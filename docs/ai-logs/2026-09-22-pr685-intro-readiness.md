# PR #685 인트로 재생 준비 대기 정정

- PR: https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/685
- 목적: 공유 기능과 무관한 기존 인트로 검사의 반복 CI 실패 원인을 확인하고 검사 의미를 보존한다.
- AI 도구: Codex. QA 담당이 trace 분석·테스트 변경·집중 검증을 수행했고, 관리 담당이 diff를 독립 검토했다. 병합은 관리 담당이 처리한다.

## 근거와 변경

Actions run `35688611478`의 두 실행에서 desktop2의 기존 7개 장면 컨트롤 검사가 최초 실패 후 retry 통과했다. 최신 실패 artifact `10678002181`의 trace에서 `arrivalPlaybackReady`의 첫 조회는 446408.871ms에 시작했다. DOM snapshot은 452055.897ms, 즉 5.647초 후 이미 `data-time-ms="11"`을 기록한다. 그러나 Node `expect.poll`의 마지막 `getAttribute`는 454557.114ms에 `1564`를 반환해 8초 기한을 0.148초 넘겼고, 검사 결과는 이전 조회값 0으로 실패했다. 반복 조회에 약 1.9초가 걸리고 WebGL ReadPixels stall 로그가 동반됐다. 실제 양수 재생 조건은 기한 안에 충족됐다는 근거다.

공유 helper `arrivalPlaybackReady`의 반복 프로토콜 조회만 브라우저 내부 `waitForFunction`으로 바꿨다. 양수 재생 시간 조건, 8초 제한, 이후 시간 정지와 scene/canvas 표시 검사는 유지했다. 컨트롤·제품·워크플로·재시도·전역 timeout은 변경하지 않았다.

해당 helper는 fullscreen-intro, landing-first-arrival, fullscreen-story-visual, simple-landing, core-journeys, launch-integrity에서 사용한다. 이번 집중 실행은 기존 일시정지·7개 장면·키보드 containment·실제 재생 완료·재실행과 legacy marker 두 경우를 선택했다. 나루를 호출하는 시나리오는 실행하지 않았다.

## 검증

기준 commit `2d47303`, 독립 ASCII QA worktree와 Vite 4194, Chromium 1223에서 다음을 실행했다. 공개 shell API와 사진은 기존 fixture를 사용하지만 인트로·WebGL·컨트롤은 실제 구현이다.

```text
npx playwright test e2e/fullscreen-intro.spec.ts e2e/landing-first-arrival.spec.ts --grep "pause, all seven|replaying a completed|a legacy marker" --workers=2 --repeat-each=2 --retries=0
16 passed (35.1s): 4개 시나리오 × desktop/mobile × 2회
npx eslint e2e/landing-contract.ts
npm run typecheck
```

ESLint와 타입 검사는 모두 통과했다. 전체 CI는 관리 담당이 새 commit에서 확인한다. 로컬 집중 통과는 GitHub runner 전체 shard의 성공을 대신하지 않으며, 8초 안에 실제 재생이 시작되지 않는 경우에는 계속 실패한다. Production 동작 변경이나 서버 쓰기는 없다.
