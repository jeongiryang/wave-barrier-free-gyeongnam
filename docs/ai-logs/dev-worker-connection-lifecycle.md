# 개발 서버 내부 연결 종료 회귀 복구

- 관련: #357, main CI #838 (run 34189842167)
- 기준 main: `4d65a5c0be00b093051b4a8b07aecd2e5eec0a13`
- 작성: Repository Owner가 위임한 Codex Engineering
- 상태: 구현 및 로컬 검증 완료. CI/독립 QA/Production 완료 주장이 아님.

## 원인과 변경

CI838 모바일은 385 pass, 2 flaky, 기존 skip 1로 실패했다. `/planner`가
`socket hang up` HTTP500을 반환했고 Vite의 오류 전파가 동시에 열려 있던 다른
테스트에도 overlay를 표시했다. 해당 화면/trace/error-context와 전체 로그,
다섯 artifact를 별도 증거 디렉터리에 보존했다. 제품 포커스 assertion 실패는
이 overlay의 결과이며 포커스 코드를 다시 수정할 근거는 없었다.

설치된 Nitro 3.0.260610-beta → env-runner → httpxy 0.5.5의 내부 HTTP hop은
keep-alive 연결을 공유한다. 별도 Node worker가 idle 연결을 닫은 동안 호출자
event loop를 지연시킨 제한된 재현에서 `reusedSocket=true`, `ECONNRESET`을
확인했다. CI 로그 자체에는 reusedSocket 진단이 없으므로 정확한 idle-close
순간까지 관찰했다고 주장하지 않는다. 동일 실패 경로의 재현 및 방지 검증이다.

`scripts/vite-dev-connection.mjs`는 Vite `serve` 전용 pre middleware에서
일반 요청의 내부 전달 Connection 헤더를 `close`로 정규화한다. Nitro worker가
응답 후 연결을 닫으므로 다음 요청에서 오래된 내부 socket을 재사용하지 않는다.
WebSocket upgrade 헤더는 보존한다. Production 빌드에서는 적용되지 않는다.
재시도, 오류 응답 변환, HMR overlay 비활성화 또는 브라우저 assertion 변경은 없다.

근거: [Node HTTP reusedSocket 문서](https://nodejs.org/download/release/latest-v22.x/docs/api/http.html#requestreusedsocket).

## 검증

- 설치 완료: `npm ci` (618 packages). 설치 완료 전에 시도한 lint는 eslint 미설치로 실패했으며 별도 로그 보존; 완료 후 아래 재검사 성공.
- 실제 httpxy TCP 계약: 수정 미적용 비교 1 pass/1 fail (`1 !== 3` worker sockets); 적용 후 `node --test tests/vite-dev-connection.test.mjs` 2/2 pass.
- TCP 검사에는 GET/POST 본문·URL 보존, 서로 다른 worker 연결 3개, upgrade 헤더 보존, 진짜 HTTP500·본문 보존과 요청 1회(자동 재시도 없음)가 포함된다.
- 독립 worker idle-close 재현: 기본 연결 풀 ECONNRESET, Connection close 200. 최초 짧은 20ms/100ms 시도는 재현되지 않았고 5s+1s idle/6.1s event-loop 지연 시 재현됐다. 테스트 timeout을 바꾼 것이 아니다.
- `npm run lint`: 성공, 기존 warning 2개/오류 0.
- `npm run typecheck`: 성공.
- `npm test`: 635 pass, fail/skip 0.
- `npm run build:vercel`: 성공.
- `npm run check:performance`: 성공. CSS gzip 69.95/70 KiB, planner gzip 269.97/270 KiB. 예산 변경 없음.
- `npm audit --omit=dev --audit-level=high`, `npm audit --audit-level=moderate`: 모두 취약점 0.
- `CI=true npm run test:e2e -- e2e/search-result-focus.spec.ts e2e/accessibility-final.spec.ts`: desktop/mobile 합계 52 pass, fail/flaky/skip 0 (2.0분). 기존 workers=2, retries=1, failOnFlaky, timeout/assertion 그대로. 별도 경로의 HTML report/results/log 보존.
- 최신 HEAD 전체 hosted CI/Preview/독립 QA: PR에서 확정 결과를 연결한다.

## 보존 및 한계

기존 테스트 삭제·skip 추가·locator/assertion·timeout·workers·retry 기준 변경 없음.
dependency/lockfile, sandbox, 모델/API false gate, DB/CD 동작 변경 없음.
기존 사용자 10파일, 원본 40 worktree 및 기존 실패 증거는 유지한다.
새 main의 full CI 및 기존 CD의 실제008/Production 검증 전에는 #357을 닫지 않는다.
ODsay 제공처 제한 관련 상태는 별도 외부 운영 문제로 남고 이 변경의 성공으로 세지 않는다.
