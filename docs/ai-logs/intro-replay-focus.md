# 인트로 다시보기 포커스 계약 AI 작업 로그

- 작성자: jeongiryang / Codex Engineering·QA
- 범위: Refs #259 #285. 최초 요청의 다시보기·런타임 동작 감소 계약 복원.
- 상태: 로컬 검증, 미병합·미배포.

## 변경 근거

#307/#311에서 첫 화면의 행동을 단순화하면서 다시보기 자체가 사라졌다.
첫 화면의 여행 시작 CTA는 유지하고, 랜딩 환경설정 안에서 다시보기 할 수 있게 했다.
`useLandingExperience`가 replay 숫자를 관리하고 기존 WaveField renderer만 재시작한다.
설정 패널·버튼·현재 키보드 초점은 재생 또는 OS 설정 변경 때 교체하지 않는다.
동작 감소에서는 기존 정적 renderer를 사용한다. 스크롤 이동이나 포커스 강제 이동은 없다.

## 검증

- 관련 launch-integrity/reduced-motion 44/44 PASS.
- 전체 Playwright·axe 241 pass / 기존 skip 1. 추가 포커스·44px·설정 패널 axe 포함.
- unit·contract 280/280, lint·typecheck, Vercel production build, 성능 예산 PASS.
- 첫 단위 검사에서 page에 state를 직접 둔 구조 계약 1건이 실패했다. 상태를 기존 hook으로
  이동해 통과시켰으며 구조 assertion을 삭제하거나 완화하지 않았다.
- 390px/1366px: Enter/Space 재생 → reduced-motion 켜기/끄기 → 같은 버튼 초점 유지,
  설정 닫기 → CTA 키보드 이동 → 실제 /planner 진입, 콘솔 오류·가로 넘침 0.
- 버튼 이름 KO/EN 제공. 전체 영어 번역 완료를 의미하지 않는다.

## 남은 조치

재생 후 실제 완료 안내와 replay 증가까지 추가 검증하자 준비 전 첫 클릭 누락이 드러났다.
환경설정은 자체 이벤트 연결까지 inert/aria-busy로 보호하고, 동작 감소와 무관하게 준비 후
동일 버튼을 유지한다. 숨겨진 SSR 전송용 복제본이 아닌 실제 보이는 패널의 준비 상태를 검사한다.
Enter/Space가 replay를 1→2로 실제 갱신하고 상태 안내를 표시하는 두 프로젝트 검사가 통과했다.
별도 포트 전체 검사에서 캘린더 테스트의 고정 4173 URL 때문에 2건 실패했다.
정확한 origin/path 비교는 유지하고 설정된 baseURL로 기대값을 계산하도록 고쳤다.
추가 수정 후 launch-integrity/departure-readiness **44/44** 통과, unit·contract **280/280**.
직전 별도 포트 전체 결과는 239 pass/고정 URL 2 fail/기존 skip 1로 보존한다.
새 최종 합성 SHA의 전체 실행과 PR 새 HEAD CI가 전체 성공의 최종 근거다.

#314 인증 보호·#312 캐시·#309 보안 및 자동화 stack을 합친 최종 후보를 별도로 검증한다.
필수 사람 리뷰 3건과 운영 배포·재검증 전에는 완료/GO를 선언하지 않는다.
