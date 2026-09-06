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

#314 인증 보호·#312 캐시·#309 보안 및 자동화 stack을 합친 최종 후보를 별도로 검증한다.
필수 사람 리뷰 3건과 운영 배포·재검증 전에는 완료/GO를 선언하지 않는다.
