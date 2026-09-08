# #353 서비스 소개·미디어 구현 작업 로그

- 기준 main / 확인한 canonical Production: `f4d5d9757451c5086aabaf78ee6ff31086c37368`
- 구현 브랜치: `feat/service-story-353`
- 작성: 2026-09-09 KST, Codex Engineering. 아래는 병합 전 작업 증거이며 Production 완료 선언이 아니다.
- 사람: Owner의 제품·제출 우선순위, 미디어 선별 지시, Issue 종료 전 아이디어 보존 정책.
- 구현 AI: root와 문구·문서·미사용 CSS 담당. 독립 검토: 구현에 참여하지 않은 `story353_independent_qa`.

## 구현

- 큰 해안 풍경과 짧은 KO/EN 카피, 로그인 없이 시작하는 CTA, 날짜·장소·이동을 설명하는 장면, 펼쳐 읽는 출처·한계 설명을 연결했다. 기존 18개 지역 선택, 여섯 기능 설명, 여행 완료 계약을 유지한다.
- Owner v3 `d908bd9de2f484a8ef5c1f6fab3441c33f96bf88`의 이미지 4개와 무음 MP4 1개만 선별했다. 총 1,043,966 bytes. 별도 브랜치의 예제 코드나 추가 영상은 통합하지 않았다. 다섯 Git blob hash를 독립 검토에서도 대조했다.
- 영상은 처음에는 src가 없고 명시적인 재생 때만 요청한다. 초기/런타임 동작 감소, 앱의 동작 줄이기, 탭 숨김, 화면 밖 이동 때 정지한다. 자동 재개하지 않는다. 실패·동작 감소 시 같은 버튼과 포커스를 유지한다.
- 가상 풍경은 실제 경남 장소·편의시설·경로 근거가 아님을 화면에 표시한다. 원문 한국어 관광사진의 언어를 별도 지정했다.
- 첫 화면과 서비스 소개의 KO/EN 설명을 실제 동작에 맞췄다. 조건 변경의 자동 재검색·재계산을 약속하지 않는다. README·시연 원고·공식 기능설명서 원고에서 미출시 계정 동기화/Kakao 로그인/자동화/Fast Gate를 구분한다.
- 최근 Issue 감사와 원장 갱신은 GitHub를 기준으로 한다. 요구별 네 가지 매핑 및 canonical Open Issue 이관·read-back 규칙을 AGENTS.md에 보존했다. 닫힘은 잔여 아이디어 폐기가 아니다.

## 발견·실패·수정 기록

1. 영문 문구 추가로 소스 계약 두 건이 KO/EN 혼합 배열에서 실패했다. 기존 여섯 KO 항목을 그대로 유지하고 영문 여섯 항목을 추가 검증하는 계약으로 확장했다. 관련 계약 55 PASS.
2. 초기 Vercel build는 성공했으나 CSS gzip 70.72 KiB로 70 KiB 예산을 초과했다. 런타임 참조가 없는 signal/orbit/map-grid/route-line 스타일만 제거했다. 예산은 변경하지 않았다.
3. 초기 새 E2E에서 플래너 CTA 이동 뒤 fixture가 없는 `/api/health` 503 두 건을 console assertion이 탐지했다. 실제 플래너용 기존 fixture setup을 연결했다. console assertion을 유지했다. 관련 네 파일 24 PASS.
4. 확대 관련 실행은 78개 중 76 PASS, 2 flaky로 실패했다. React streaming 중 숨겨진 서버 main과 표시된 main이 잠시 함께 존재했다. main CI856과 같은 준비 상태 race를 재현했으므로, Owner의 허용에 따라 #373 아키텍처 없이 해당 검사만 분리했다. 표시 main, 준비된 main 하나, 전체 main 하나를 모두 기다린 뒤 원래 assertions를 수행한다. 재검사 16 PASS; 셸은 stderr의 NO_COLOR 경고를 NativeCommandError로 기록했으나 Playwright `.last-run.json`은 passed/failedTests=[]였다. 이후 명령은 실제 native exit code를 명시적으로 반환한다.
5. 독립 QA에서 초기 동작 감소 상태의 수동 재생 및 한국어 사진 원문의 언어 상속을 지적했다. 제품 코드를 수정하고 초기 OS/앱 설정·KO/EN 회귀와 새 장면의 dark/light 대비를 추가했다. 관련 30 PASS.
6. 독립 이미지 검토에서 EN 320/390px의 설명/영상 제어가 hero·요약에 가려지는 P1을 발견했다. caption을 높이가 자동 확보되는 정상 흐름에 배치하고 hero의 scroll translate/fade를 제거했다. 9지점 가림 검사 및 정상/감소/미디어 실패의 네 폭 검증을 추가했다.
7. 새 가림 검사의 초기 실패는 부드러운 스크롤 중 화면 밖 좌표를 즉시 측정한 것이었다. diagnostic에서 y=826..865, viewport height=844, hit=null을 확인했다. 위치 준비에 instant scroll을 사용하고 동일한 9지점 판정을 유지했다. 마지막 관련 실행은 24 PASS, 0 failed/flaky (36.0s). 독립 QA가 EN320/390와 KO1366 이미지의 실제 겹침 해소를 확인했다.

## 실행 증거

로컬 경로 `D:/wave-production-validation-20260908`, 증거 보존 위치 `D:/wave-db-binding-preflight-20260908/`.

| 검사 | 명령 / 결과 |
| --- | --- |
| 관련 계약 | `node --test tests/auth-community.test.mjs tests/production-readiness.test.mjs tests/repository-policy.test.mjs` — 55 PASS, 0 fail/skip |
| unit/contract | `npm test` — 696 PASS, 0 fail/skip; `story353-unit-candidate.log` |
| lint / typecheck | `npm run lint`, `npm run typecheck` 성공. lint 0 errors, 4 warnings (기존 2개, 고정 크기·파생 이미지에 대한 native img 권고 2개) |
| 보안 감사 | `npm audit --json`, `npm audit --omit=dev --json` — 취약점 0. 의존성/lockfile 변경 없음 |
| Vercel / performance | `npm run build:vercel`, `npm run check:performance` 성공. 초기 초과 실패는 보존. 마지막 수치는 PR의 최종 candidate 결과에 기록 |
| 브라우저·axe | `CI=true E2E_BASE_URL=http://127.0.0.1:4173 node scripts/run-playwright.mjs e2e/service-story.spec.ts e2e/landing-theme-contrast.spec.ts e2e/compact-landing-visuals.spec.ts` — 24 PASS, 0 fail/flaky; `story353-occlusion-final-report/`, `story353-occlusion-final-results/` |
| 범위 | KO/EN, 320/390/768/1366, dark/light 대비 4.5 이상, 키보드·focus·초기/변경 reduced motion·실패 fallback·가림·overflow·영상 요청·axe |

## 남은 Release Gate와 제한

### Owner의 인트로·한국어 우선 보강 후 시각 체크포인트

- [최신 Owner 결정](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/353#issuecomment-5587540561)을 읽고, #21 일반 모션 약화 제안은 REJECTED로 구분했다. 기존 번역 기능은 보존하되 후속 영문 카피 polish를 하지 않았다.
- 독립 재현에서 f4 Production의 기존 인트로는 카드·마스크·낮은 불투명도에 가려 형태가 불분명했고, 새 WIP는 StoryMedia가 캔버스를 덮는 실제 미표시 회귀가 있었다. 빈 저장값/기존 `wave-intro-seen-v2` 양쪽에서 재현됐으며 현재 코드는 해당 세션 키를 읽지 않는다.
- Hero 안에 독립적인 인트로 영역을 만들어 opacity 1·마스크 없음으로 기존 파도→접근성 형상→W.A.V.E가 보이게 했다. 제목/CTA와 겹치지 않으며 별도 진입 대기·모달·포커스 이동이 없다. 일반 모션의 시각적 임팩트와 동작 감소의 정적 대체를 분리한다. 기존 형상 시간 계약은 유지하고 최종 워드마크를 남기며 4.8초 안에 애니메이션을 멈춘다. 리사이즈로 정지 캔버스가 지워지는 경우 다시 그린다.
- 독립 검토의 새 실제 화면: `intro-arrival-independent-qa-20260909/`에 KO1366/390 normal/reduced 24개 캡처와 관찰 JSON. 450/950/1400ms에서 형상 변화를 확인하고 5200/6300ms 해시가 동일함을 확인했다. overflow 0, MP4 요청 0, API는 fixture, 외부 provider 호출 0. 옛 가림 실패 증거는 `intro-independent-qa-20260909/`에 그대로 있다.
- 가상 바다 이미지 2개(91,608 / 451,372 bytes)를 추가 선별했다. 현재 미디어는 총 7개·1,586,946 bytes이며, 별도 브랜치의 웹 예제는 복사하지 않았다. 실제 웹 프레임이 스크롤에 따라 50%→75%→전체 폭으로 바뀌고 역스크롤에서 돌아온다. 모바일/감소 모드는 정적 전체 장면이다.
- 기능 소개는 수동 네 단계의 큰 DOM 화면으로 구성했다. 편의·추천→날짜/일정→동일한 세 예시 ID·이름·순서의 지도→출발 확인을 연결하고 사용자가 누른 버튼의 포커스를 유지한다. 자동 회전·실제 경로/시설 성공 위장은 없다.
- `landing-first-arrival.spec.ts`: 새 최초 실행의 desktop 2건은 hidden streaming DOM 중복으로 flaky FAIL이었다. 위에서 확인한 동일 준비 상태 계약을 이 새 검사에도 적용했다. 다음 시각 체크포인트는 **8 PASS, 0 failed/flaky, 13.5s**. 정상/감소 인트로·과거 키·확장 정/역스크롤·키보드 단계 연결을 실제 브라우저 video와 캡처로 보존했다(`story353-visual-checkpoint-results/`).
- 새 장면 추가 뒤 CSS 70.42→미사용 규칙 제거 후70.02로 여전히 FAIL이었다. 런타임·테스트 참조가 없는 floating/옛 지역/API preview와 옛 community empty 스타일을 제거한 뒤 build/performance PASS: **CSS69.98/70 KiB, landing119.71/155, planner269.79/270, 최대 JS chunk95.92/110**. 기준·테스트는 유지했다(`story353-scenes-budget*.log`).
- 최종 후보의 관련 브라우저 회귀는 별도 `story353-candidate-browser*` 증거로 기록한다. 이 체크포인트 자체는 최종 Preview/Production/공모전 제출 완료가 아니다.
- 최종 로컬 후보: 관련 7개 E2E 파일 **94 PASS / 0 fail / 0 flaky (2.1m)**, unit/contract **696 PASS / 0 skip**, lint **0 errors / 5 warnings** (native img 3개·기존 경고 2개), typecheck PASS. 의존성 변경 없이 전체/운영 audit 0건. 독립 시각 재검토에서 현재 수정 범위의 새 P0/P1은 발견되지 않았다. 최종 승인 receipt와 배포 검증은 별도다.

- 최종 commit의 hosted Full CI, exact Preview, 독립 QA receipt, 정상 병합, main CI/CD와 canonical Production smoke가 필요하다. 로컬 fixture나 Preview를 실제 provider/Production 성공으로 계산하지 않는다.
- 실제 브라우저 200% 확대 단축키는 현재 제어 경로에서 확대를 적용하지 못했다. viewport 테스트를 실제 확대·장애인 사용자·실물 기기·낭독기 검증으로 주장하지 않는다.
- ODsay #372 quota hold는 그대로 유지하며 계정 상태 확인을 위한 live 재시도를 하지 않았다. #365 최소 운영 증거와 선택적 추가 작업은 분리한다.
- #373 Draft/자동화 OFF/구독 비용 정책/기존 사용자 dirty 10파일·50 worktree·queue generation·artifact·restore 증거를 보존했다.
- 제출 원고는 갱신했으나 기존 PDF와 옛 화면은 최종 제출물이 아니다. #353 Production 반영 뒤 실제 캡처로 교체하고 공식 양식·페이지·태그·폰트·링크를 최종 확인한다. #353의 남은 상세 AC는 Issue별 매핑으로 유지하며 이 로그만으로 전체 Issue를 닫지 않는다.
- 테스트 삭제·새 skip·timeout/retry/workers 변경·성능 예산 증가·force click·기술 gate 우회 없음. 이전 실패는 성공으로 소급 덮어쓰지 않는다.
