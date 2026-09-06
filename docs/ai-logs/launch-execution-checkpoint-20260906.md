# W.A.V.E 실행 체크포인트 — 2026-09-06

전체 요청은 미완료다. 커밋/CI/문서 존재를 운영 반영으로 세지 않는다. Release GO는 PM 판단이며
현재 Production의 핵심 관광 추천 실패와 미배포 보안 수정 때문에 기술 상태는 NO-GO다.

## 보존한 브랜치와 결과

| Worktree / 원격 PR | 현재 변경 | 상태 |
| --- | --- | --- |
| wave-barrier-free-gyeongnam / #287 | b803b80, 런칭 흐름·008 등록 | CI 성공, Ready, 승인 0/3, 미병합 |
| 보존된 #311 | 93d1058, 질문 Gate·EN 접근성·대비 | unit 280, 관련 E2E 50, 전체 247 pass/기존 skip 1 |
| wave-ui-regression / #314 | 6f9fc54, hydration 전 인증 보호·위치 처리 안내 | 관련 단위 16, 인증 E2E 40, lint/typecheck/build/performance PASS |
| 보존된 #312 | 7af38df, 부분 제공처 실패 캐시 차단 | CI 성공, 미배포 |
| 보존된 #315 | a62886a, 실제 인트로 다시보기·focus 유지 | CI 34025137035 성공, 미배포 |
| 보존된 #316 | a4ce81e, 공공교통 키·미조회 상태 | CI 34024622262 성공, 미배포 |
| wave-submission-docs / #313 | 4a9bccb 이후 최신 실행표·운영 응답 보완 | CI 34033195363 성공. 이 체크포인트는 후속 문서 변경 |
| 보존된 #317 | 6f4d999, 영어 조건·저장/검색 안내 | unit 280, 전체 253 pass/기존 skip 1, CI 34028553188 성공 |
| 보존된 #318 | 7e6c1ed, 내비게이션 언어·추천 상태 | #314 포함. unit 280, 전체 267 pass/기존 skip 1, CI 34029670552 성공 |
| 보존된 #319 | 8eb38c5, 설정·도움말 언어/접근성/성능 | #315 포함. unit 280, 전체 279 pass/기존 skip 1, CI 34030742378 성공 |
| wave-transport-integrity / #321 | 272bf681a2a7c41fdd66eca0360d29b272998498, 추천 상세·후기 실패·대비 | #319 기반. unit 280, 전체 295 pass/기존 skip 1, CI 34032622064 성공·Ready |
| wave-landing-compact / #320 | bfeda5f54206a66d7d97ae1532df5854760ecc00, 팀원 변경과 도식·시각 보완 | 로컬 fix/compact-landing-visual-audit → 원격 feat/compact-landing-content push. unit 280, 전체 251 pass/기존 skip 1, CI 34034203872 성공·Ready |
| wave-integration-audit / #289 | acb7dab, 기존 예약 receipt·비용 문서 | 단위 287/287; API workflow 활성화 없음 |
| wave-automation-stack / #306 | d78b2e2, 자동화 stack 보존 | 기존 green, 미병합/미활성 |
| wave-launch-integration | a4e6b61d7731ae0325170dc1f8787c44970259ed | #320/#321·#309/자동화 전체와 최신 문서를 merge 합성, 원격 push |

최신 원격 확인 후 재개한다. 다른 작업자가 추가한 커밋은 보존한다. 개별 브랜치를 force push하지 않는다.
통합 브랜치는 검증용이며 거대 대체 PR을 만들거나 기존 PR을 닫지 않았다. 사람 리뷰 비용을 줄이려고
보호 규칙을 바꾸지 않는다. 부모 PR squash 병합 후 자식에 최신 main을 병합하고 diff·CI를 다시 확인한다.

## 확인한 기술·운영 경계

- 이전 통합 **3bc4abe8dacbf57d55784baddd93aec01022ebb5**: lint/typecheck, unit/contract **313/313**,
  Vercel production build·성능 예산 PASS, 전체 audit **0**, 전체 Playwright·axe **279 pass / 기존 skip 1** (2.3분).
  CSS gzip 68.81/70 KiB, landing JS gzip 112.82/155 KiB, planner JS gzip 268.55/270 KiB.
  E2E fixture와 실제 Production 실호출 결과는 아래처럼 분리한다. 검사 범위를 줄이지 않았다.
- 최신 #321 포함 통합 **5fdd1e6c82aa0ff3f5c018ba00485277b5289dbb**: lint/typecheck,
  unit/contract **313/313**, Vercel production build·성능 예산 PASS, 전체 audit **0**.
  전체 Playwright·axe **295 pass / 기존 skip 1 / 실패 0 (6.8분)**. 모든 검사는 이 SHA 기준이다.
- #321 단독 전체 295 pass/기존 skip 1, 관련 56/56, 최종 새 회귀 16/16. 상·하단 각각 axe와
  CI artifact 캡처가 있다. 실제 320/390/960/1440px × light/dark × 근거/제보 16화면의
  콘솔/document·dialog overflow/화면 밖 배치 0. 초기 JS 270.07→268.25/270 KiB.
- 12:12:45 UTC 운영 부분 응답 확인: Kakao/ODsay 경로는 연결, KORAIL/TAGO 일부 timeout.
  KO 추천 HTTP 200/cache MISS는 장소 0개·8개 제공처 error의 fallback. 전체 성공 재검증이 아니다.
- 최신 #320 합성 **a4e6b61d7731ae0325170dc1f8787c44970259ed**: unit 313/313,
  lint/typecheck/build/performance PASS, audit 0. CSS gzip 69.38/70 KiB, landing JS 114.19/155 KiB,
  planner JS 268.26/270 KiB. 전체 Playwright·axe **299 pass / 기존 skip 1 / 실패 0 (7.1분)**.
- #320 단독 전체 251 pass/기존 skip 1. 원격이 진행 중이어서 507c85e·b1eb3c0을 먼저 보존했다.
  충돌한 대비 selector는 두 쪽 모두 유지했다. 기존 비주얼을 숨기는 검사만 두지 않고 새 도식 7개의
  의미·caption 대비·5개 폭·44px·포커스 가림·axe·20개 고유 화면을 추가했다. PM 디자인 재검토는 남는다.
- 이전 5db27a2의 요청된 11개 viewport 랜딩/중립 플래너 22화면: 콘솔/넘침/자동 추천 0, h1 폭 안에 표시.
  320/768/2560 대표 화면 직접 확인. 전체 상태/200%/실기기 검수는 계속 필요하다.
- **최신 Production 재진단 11:36:55 UTC: 20/27**, 실패 7건(route, KO/EN 추천, 보강, 지역/장소 사진, 집중률).
  아래 23/27은 08시 이전 이력이다. 사진·집중률도 정상으로 제출하지 않는다. 기능설명서와 API 감사에 반영했다.
- #318 12개 폭(11개 요구 + 960)×light/dark 영어 중립 24화면은 콘솔/넘침/44px/제목 잘림/자동 검색 0.
  #319 320/390/960/1440×light/dark×설정/도움말 16화면은 패널 경계/콘솔/넘침/한국어 잔여 0.
  390px 패널 x=-1을 발견해 수정했다. 환경설정·도움말 16화면은 전체 영어 여행 완료를 의미하지 않는다.
- #318 첫 전체에서 인증 준비 전 GET 제출 2건과 개발 서버 ECONNRESET 1건을 보존한 뒤,
  기존 #314를 merge하고 전체 267 pass/기존 skip 1로 검증했다. #319는 270.82 KiB 성능 초과를
  도움말 지연 import로 해결했다. 파일 로딩 실패 → 설명 → 새로고침 복구를 포함해 관련 56/56.

- 이전 통합 eee1208: unit/contract 313/313, Playwright·axe 249 pass/기존 skip 1,
  lint/typecheck·Vercel build·performance·actionlint PASS, shellcheck 47 scripts/0 fail, audit 0.
- #311 첫 전체 246 pass/1 fail/기존 skip 1의 실패는 Chromium ERR_NO_BUFFER_SPACE였다.
  trace를 보존하고 자체 브라우저 작업을 정리한 뒤 동일 범위 전체 247 pass/기존 skip 1을 확인했다.
- 기존 Production SHA 34e6021265b16d046dca24feaa3ec2101fc977e2, deployment 6278499275.
  /api/health HTTP 200은 configuration 범위다. 실제 API·페이지 진단 23/27, route·KO/EN 관광 추천·보강 실패.
  신규 캐시 MISS 관광 요청도 0개/제공처 error였다. 키 오류·rate limit·상류 장애 중 원인은 미확정이다.
- #309의 image-size-next fork는 출처/유지보수/호환성과 악성 입력을 검토했다. audit 0을 장기 안전성 보장으로
  해석하지 않는다. 실제 Preview 함수 동작과 추후 upstream 전환 검토는 남는다.
- 008 migration: 코드상 등록/트랜잭션/적용 경계 확인. 실제 운영 스키마·영향 행 수·백업/복원 접근 미확인,
  적용하지 않았다. Production CD를 Preview 대용으로 실행하지 않았다.
- 구독 local read-only smoke와 공식 Scheduled #294 receipt는 확인했다. 현재 구독 Executor의 GitHub→Notion
  기록도 실제 수행·재조회했다. 예약 queue→구현→독립 QA 종단간 자동화는 미검증이다.
  API workflow 3개 disabled_manually, 모델 API/새 과금 자원/인증 복사 없음. 청구 내역은 확인하지 못했다.

## 정확한 재개 순서

1. 현재 main, 23 PR/47 Issue 수의 변동, 최근 CI, Production SHA, 다른 작업자 댓글과 worktree status 재조회.
   #311 93d1058, #314 6f9fc54, #289 acb7dab의 새 CI와 통합 5db27a2 검증 결과를 먼저 확인한다.
   #314 CI 34026490814, #311 CI 34026760202, #289 CI 34026711165는 모두 성공했다.
   wave-transport-integrity의 #321 fix/recommendation-language는 272bf68로 clean/push 상태다.
   같은 SHA에서 로컬 fix/itinerary-language를 준비했으나 아직 수정하지 않았다.
   #321 CI 34032622064는 성공·Ready다. #319/#313(4a9bccb) CI도 성공했다.
   #320은 팀원 변경과 P1 보완을 같은 PR에 보존했다. bfeda5f의 CI 34034203872는 성공했다. 추가 원격 커밋과
   PM 디자인 재검토를 확인한다. 이 보완 이후 합성에 포함했으며 이전 P1 미해결 이력과 구분한다.
2. #317~#319/#321의 조건·내비게이션·설정·도움말·추천 상세를 중복 구현하지 않는다.
   다음 영어 범위는 일정·모든 이동 구간 → 인증 폼·정책 본문이다. 원문 관광 데이터가
   한국어만 제공되는 경우 UI 번역과 구분하고 그 사실을 표시한다. 전체 언어 여정을 완료 처리하지 않는다.
3. 200% 검증은 CSS zoom 숫자만으로 통과 판정하지 않는다. 현재 CSS zoom 진단의 잘림을 실제 브라우저
   확대/레이아웃 viewport와 구분해 320~2560 요구표에 기록하고 수정한다. 기본 390/1366 새 Gate는 콘솔/넘침 0.
4. Preview·Neon 관리 접근이 확보되면 안전한 운영 사전 조회 → 008 영향·복구 확인 → Preview 핵심 여정 검증.
   필수 리뷰 3건이 충족된 PR만 dependency 순으로 병합하고 main CI/CD·Production을 SHA로 연결한다.
5. 관광 추천/KORAIL/TAGO 실호출 실패 원인을 운영 로그에서 확인한다. 테스트 timeout 증가나 가짜 결과로 숨기지 않는다.
6. 기존 공식 Scheduled 목록·현재 상태를 확인할 관리 도구가 없으므로 중복 예약을 만들지 않는다.
   기존 queue의 실제 안전 작업 하나를 구현→별도 QA→GitHub/Notion 기록까지 검증할 실행 경로를 연결한다.
7. 공식 ① 양식의 최종 운영 캡처·실제 낭독기 검수·사람 확인 후 제출본을 완성한다. 최종 제출 버튼은 사람이 실행한다.

현재 PR 소유자가 아닌 팀원 unknownamed의 #311도 수정·검증했고 GitHub 기존 댓글과 Notion을 갱신했다.
이 구독 Executor의 실제 왕복 기록은 확인했지만 예약 queue의 무인 구현·독립 QA 완료는 아니다.
자체 임시 개발 서버는 검수 후 종료했다. 다른 사용자의 Code/ChatGPT/Codex 프로세스는 종료하지 않았다.
위치 경계: GPS 경로 API는 차단, 공개/직접 고른 출발·도착은 서버 경유, 지도 화면/IP·주변 검색은
외부 처리 가능. CLAUDE의 포괄적인 기기 내 처리 안내를 실제 코드/개인정보 안내에 맞췄다.

## 사람만 처리할 사항

필수 사람 리뷰(요청 reviewer syt83/unknownamed/ginaginaring), 접근 권한이 필요한 Preview/운영 스키마와
백업 확인, 기존 Scheduled 관리 화면, 참가 팀명 WAVE/접수 메일 W.A.V.E 차이와 최종 팀원/이력,
법적 위치정보 확인, 실제 메일 수신·Neon 사용자 삭제/백업/PITR/복원, 운영자·연락처, 당사자/실기기/낭독기,
최종 제출·접수 증빙. 이 항목들은 코드가 있다는 이유로 완료 처리하지 않는다.
