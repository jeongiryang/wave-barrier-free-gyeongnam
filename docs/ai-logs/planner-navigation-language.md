# 여행 내비게이션의 언어·요청 상태

- 작성자: jeongiryang / AI 도구: Codex Engineering·QA Executor
- Refs #251, #254, #265, #272, #280. #317 영어 조건과 #314 인증 보호를 선행 변경으로 포함한다.
- 최종 상태: 후보 구현·로컬 회귀 완료, 미병합·미배포. 사람 리뷰·운영 검증을 대체하지 않는다.

## 목적과 구현

영어 조건 화면에서도 헤더·여정 레일·단계 이동·푸터가 한국어였으며, 추천 0건을 모두
‘불러오는 중’으로 표시했다. 실제 검색 전/검색 중/실패/빈 결과/조건 변경과 맞지 않았다.

- 내비게이션·단계 설명·접근 가능한 이름·모바일 메뉴·로그인/계정 메뉴·정책 링크를 KO/EN으로 제공한다.
- 추천 요약은 `usePlanRequest.requestState`를 그대로 사용한다. ID, 단계 잠금, 완료 조건,
  동작 감소·모바일 메뉴 Escape 초점 복귀, 인증 요청·중복 로그아웃 잠금은 유지한다.
- 긴 단계 설명·추천 상태는 줄바꿈한다. 모바일의 4개 하단 버튼과 기존 요약 숨김 구조를 유지한다.
- 도움말/환경설정 본문, 인증 폼 본문, 추천·일정·경로·정책 본문 번역은 아직 남는다.

## 검증과 수정 중 발견 사항

- 최초 관련 E2E 12 pass/6 fail: 추가한 status role이 dd 의미를 덮어쓴 axe 오류를 span 내부로
  고쳤다. 새 테스트의 모바일 숨김 요약·footer role·보기 방식 history 가정을 실제 DOM/계약과 맞췄다.
  기존 테스트를 삭제/skip하거나 assertion·timeout 기준을 낮추지 않았다. 관련 E2E 최종 18/18 PASS.
- GitHub 링크의 기존 한국어 literal source 계약은 KO/EN 두 접근 가능한 이름을 모두 요구하도록
  갱신하고, 실제 브라우저에서 영어 이름과 정확한 저장소 URL을 추가로 검사한다.
- 첫 전체 256 pass/3 fail/기존 skip 1: 인증 복구/재설정에서 준비 전 기본 GET 제출 2건과 개발 서버
  ECONNRESET 1건. error-context/trace/스크린샷을 임시 증거 폴더에 보존했다. 준비 전 제출은
  #314의 알려진 결함으로 확인해 기존 `6f9fc54`를 merge했다. 임의 대기나 테스트 완화로 감추지 않았다.
- 최종 lint/typecheck PASS, unit/contract **280/280**, Vercel production build·performance budget PASS.
- 전체 Playwright·axe **267 passed / 기존 skip 1 / 실패 0** (2.5분).
- 요청된 11 viewport에 960px을 추가한 12개 폭 × light/dark, 영어 중립 화면 24개 캡처:
  콘솔 오류·가로 overflow·내비게이션 44px 미달·버튼 제목 잘림·자동 추천 요청 모두 0.
  320px dark·960px light·1440px light/dark 화면을 직접 확인했다. 200%/실기기 전체 상태 검증은 아니다.
- 새 브라우저 회귀는 영어 단계 잠금/진행률, 모바일 Enter·Escape 초점 복귀, 단계 URL 뒤로가기,
  명시적 검색·loading/empty/error·조건 변경 무효화, 정책/GitHub 링크와 axe를 검사한다.
- React 검토: 현재 locale에서 상태 문구를 파생한다. 새 API 요청·저장 schema·라이브러리 없음.
  context 사용 공통 링크에는 client 경계를 명시했다. locale은 steps memo의 의존성에 포함한다.

## 역할과 제한

사람은 요구·필수 리뷰·최종 운영 판단을 담당하고 AI는 코드·fixture 테스트·브라우저 검수를 수행했다.
모의 API 성공을 실제 제공처 정상으로 세지 않는다. Production `34e6021`과 10:25 UTC 진단 20/27을
유지하며 Preview·008 운영 사전 확인·필수 리뷰 3건이 남았다. 유료 API/새 예약/Secret 복사 없음.
