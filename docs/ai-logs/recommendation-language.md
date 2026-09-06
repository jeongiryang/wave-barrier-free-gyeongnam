# 추천 상세의 원문·후기·제보 안내와 접근성

- 작성자: jeongiryang / AI: Codex Engineering·QA Executor
- Base: #319 `fix/preferences-help-language`. Refs #251, #265, #269, #271, #274, #282, #284, #285, #286.
- 사람: 요구사항·필수 리뷰·운영·최종 Release 판단. AI: 코드 수정, 브라우저·테스트·문서 검증.

## 근본 원인과 변경

- 추천 카드와 공식 편의 근거는 일부 영어화되어 있었으나 상세의 커뮤니티·제보 버튼과 상태는
  한국어로 남았다. 시설 항목의 서비스 문구를 번역하고 관광공사 원문·지명·주소·사용자 글은
  그대로 보존한다. 한국어 원문에 `lang=ko`, 영어 화면에 번역 범위 안내를 제공한다.
- 후기 HTTP 실패와 잘못된 성공 응답이 모두 빈 후기처럼 표시됐다. 실제 `posts: []`와 실패를
  분리하고 명시적 재시도를 제공한다. 재시도 중 중복 실행을 막고 완료 후에도 버튼과 초점을
  유지한다. 장소 ID 필터·AbortController와 공식 점수 제외 계약을 유지한다.
- 제보 실패 시 입력 보존·재시도 안내와 성공 live status를 제공한다. 성공해도 공식 편의 근거는
  바뀌지 않는다고 안내한다. 카카오 외부 링크에는 새 창·한국어 원문 가능성을 명시한다.
- 출처·조회 시각 대비 2.69:1, 어두운 화면의 흰 dialog 배경·커뮤니티 링크 대비 결함을 실제
  axe와 캡처로 재현했다. dark surface와 텍스트를 맞추고 placeholder 대비도 보강했다.
- 초기 planner JS 270.07 KiB로 기존 270 KiB 예산을 넘었다. 장소 상세의 후기 코드를 동적
  import로 분리했다. 파일 로딩 실패에도 시설 근거와 일정 추가, 커뮤니티 대체 링크는 유지한다.

## 검증

- 최초 새 E2E 10 pass/4 fail(출처 대비), 1차 보정 후 12 pass/2 fail(dark dialog 대비).
- 관련 `recommendation-language` + `launch-integrity`: 56/56 PASS.
- 실제 캡처에서 화면 아래 dark 커뮤니티 링크가 흐린 점을 발견해 상단·하단 스크롤 각각 axe
  검사하도록 보강했다. 최종 새 회귀 16/16 PASS (한국어·영어, 데스크톱·모바일, light/dark).
- lint/typecheck PASS, unit/contract 280/280 PASS. Vercel production build PASS.
- 성능 예산: CSS gzip 69/70 KiB, landing JS gzip 112.83/155 KiB,
  planner JS gzip 268.25/270 KiB. 기준 변경 없음.
- 320/390/960/1440px × light/dark × 상세 근거/하단 조작 16개 캡처: 콘솔 오류 0,
  document/dialog overflow 0, dialog 화면 밖 배치 0, 실제 theme 불일치 0.
- 전체 Playwright·axe: **295 pass / 기존 skip 1 / 실패 0 (6.7분)**. 시각 결함 수정 전 실행은
  중단했고 성공으로 기록하지 않았다. CI artifact용 상·하단 캡처도 새 테스트에 추가했다.
- 이 브랜치 npm audit: 기존 전이 취약점 3건(high 2, moderate 1). 별도 #309의 해결 변경을
  포함하는 통합 후보에서 0건을 재확인한다. audit 0만으로 안전성을 단정하지 않는다.
- 기존 source 계약은 한국어 문구와 영어 counterpart를 둘 다 요구하도록 변경했다.
  테스트 삭제·새 skip·timeout 증가·assertion 삭제·성능 기준 완화는 없다.

## 결과와 남은 범위

모의 API의 실제 UI 검증이며 Production API 성공 증거가 아니다. main/Production은 `34e6021`이고
필수 사람 리뷰·008 운영 확인·Preview/Production QA가 남는다. 추천 원문 데이터 자체를 번역한
것이 아니며 일정·경로·인증 폼·정책 본문의 영어 범위는 별도 미완료다. 추가 과금 모델 API나
새 서비스는 사용·활성화하지 않았다. Issue 완료/Release GO/최종 제출을 선언하지 않는다.
