# 인증 폼 초기 제출 보호 AI 작업 로그

- 작성자: jeongiryang / Codex Engineering·QA
- 범위: Refs #267 #285. 기존 전체 회귀에서 재현된 보안 결함.
- 상태: 로컬 검증 완료, 필수 사람 리뷰·병합·운영 검증 전.

## 근본 원인

화면의 HTML이 보인 뒤 React 이벤트 연결 전까지 복구/재설정 폼을 제출할 수 있었다.
전역 hydration 시각은 개별 폼의 이벤트 준비를 보장하지 않는다. form의 method도
없어 브라우저 기본 GET 제출이 입력을 URL에 넣었다. 실제 재현은 로컬 fixture만
사용했으며 실제 사용자 정보의 유출 이력이 있다고 주장하지 않는다.

## 변경

`HydratedAuthForm`의 서버 snapshot은 준비 전 상태다. 네 인증 컴포넌트가 이 폼을
사용해 fieldset 전체를 이벤트 연결까지 비활성화한다. 기본 method는 POST로 고정한다.
JavaScript가 꺼지거나 지연되면 입력 준비 안내·비회원 대안을 보여 준다.
계정 API·검증·중복 요청 잠금·포커스 오류 안내는 기존 handler를 그대로 사용한다.

## 실행 결과

- 기존 전체 회귀: 237 pass / 2 fail / 기존 skip 1. 복구·재설정 기본 제출 재현.
- 추가 JavaScript 미실행 8건과 기존 인증 관련: 36/36 PASS.
- 전체 Playwright·axe: **247 pass / 기존 skip 1**, 실패 0 (5.7분).
- 전체 unit·contract **280/280**, lint·typecheck, Vercel production build, 성능 예산 PASS.
- 실제 로컬 390·960·1440px 재설정 화면: 입력·버튼·포커스 렌더 확인,
  콘솔 오류 0, 가로 넘침 0, form method POST. 합성 입력만 사용.
- React 검토: hook 순서 고정, 외부 구독 snapshot 안정, 추가 API/의존성 없음,
  기존 입력/label/aria 상태·Enter 동작과 화면 낭독기 관계를 axe/회귀로 확인.

## 남은 조치

#311/#312/#309 및 자동화 stack에 합성한 새 후보를 검증한다. 기존 Production에는
아직 반영되지 않았다. 보호 규칙·필수 리뷰 3건을 유지한다. 실제 메일 수신·Neon 삭제
관리 설정은 별도 Human Gate이며 이 수정의 로컬 인증 fixture 성공과 구분한다.
