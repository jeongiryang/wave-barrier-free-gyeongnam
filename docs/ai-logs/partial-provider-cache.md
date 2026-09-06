# 부분 제공처 실패 캐시 수정 AI 작업 로그

- 작성자: jeongiryang / Codex Engineering·QA
- 범위: Refs #282. HTTP 200의 제공처 실패가 재시도를 막는 결함.
- 상태: 구현·로컬 검증, 미병합·미배포. 사람 승인 규칙을 유지한다.

## 근거와 변경

2026-09-06 08:36 UTC Production `34e6021`의 route는 Kakao·ODsay 성공과
KORAIL·TAGO timeout을 함께 반환했다. 응답은 `x-vercel-cache: HIT`, `age: 1100`,
`cache-control: public, max-age=300`이었다. 공통 helper는 HTTP 상태만 판단해
실패 상태를 포함한 HTTP 200도 CDN에 최대 1800초 저장하도록 지시했다.

`lib/http-cache.js`가 API 봉투의 error/status/providers/statuses만 확인하고,
부분 실패를 no-store로 만든다. 정상 경로 데이터·빈 결과·미설정의 의미는 보존한다.
`server/shared/http.ts`가 응답 봉투를 helper에 전달한다.

## 실제 검사

- 추가 회귀: 수정 전 3 pass / 1 fail → 수정 후 4/4 pass.
- 전체 단위·계약 281/281, lint, typecheck, Vercel production build, 성능 예산 PASS.
- 전체 Playwright·axe: 237 pass / 2 fail / 기존 skip 1. 실패는 인증 폼이
  hydration 전에 기본 GET 제출되는 별도 보안 결함이다. trace/error-context를
  보존했고 다음 독립 변경으로 수정한다. 이 결과를 전체 성공으로 표시하지 않는다.
- #309 보안 override는 이 브랜치에 포함하지 않았다. 전체 통합 후보의 audit 0과
  이 브랜치의 의존성 상태를 혼동하지 않는다.

## 제한과 재개

상류 timeout 원인 자체를 해결한 변경은 아니다. 새 배포 뒤 동일 route의 응답 헤더와
실패→복구 재시도를 실호출로 확인해야 한다. 과거 CDN 항목은 새 코드 배포 전까지 남을 수 있다.
API Secret·모델 API를 사용하거나 유료 실행을 활성화하지 않았다.
