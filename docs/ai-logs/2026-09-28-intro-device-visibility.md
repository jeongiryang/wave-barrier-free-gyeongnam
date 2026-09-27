# 기기 모션 설정과 인트로 표시

- 작성자: jeongiryang / Codex
- 기준 커밋: `cbfd4266e62b594a87bb4a07240eca72afeffc75` (#738)
- 역할: frontend-fix, 독립 QA; F06 준비·초점, F07 인트로
- 제출 요구 연결: `spec-integrity`의 공개 서비스 소개; 기능설명서 전수 인증과 구분한다.
- 현재 상태: 구현과 로컬 검증. PR의 최종 CI·병합·Production 근거는 해당 PR 본문에서 갱신한다.

## 사용자 요청과 원인

Owner가 동작 줄이기 설정 때문에 일부 휴대폰·노트북에서 인트로가 나오지 않는 문제를 수정하도록 명시했다. 이 후속 지시는 #726 복원 당시 유지했던 모션 감소 시 생략 분기를 변경한다.

`LandingIntro`는 OS `prefers-reduced-motion` 또는 `data-motion=calm`이면 첫 진입과 내부 replay를 생략했다. CSS도 같은 OS 설정에서 dialog를 `display:none`으로 숨겼고, 재생 도중 OS 설정 변경은 강제 종료했다.

## 변경

호스트의 세 가지 표시 차단을 제거했다. 원안의 `features/landing/intro/` 렌더러·타이밍·문구·스타일은 변경하지 않았다. 따라서 기존 입자 운동량 감소와 자막 이동/블러 감소는 그대로 적용되고 같은 인트로가 표시된다. 글로벌 모션 설정도 유지한다.

같은 탭의 완료 후 재방문 생략, hash 직접 이동, 스크롤 위치 보존, 건너뛰기·Esc·초점 복귀, 렌더러 준비 실패 시 8초 내 서비스 복구 계약은 유지한다. 내부 replay 이벤트는 테스트 대상이며 새로운 공개 버튼을 추가하지 않았다.

구버전 테스트의 “모션 감소이면 인트로 생략” 기대를 새 사용자 요구로 이관했다. 첫 방문 검사는 실제 인트로를 확인하고 키보드로 종료한 뒤 기존 검증을 이어간다. 인트로 이후 화면만 검사하는 테스트는 세션 완료 상태를 명시한다. Quick CI의 27개 여정/기기 수와 검증 기준은 유지한다.

## 실행 근거

- lint: 오류 0, 기존 경고 33; typecheck PASS; 단위 1,826/1,826 PASS.
- harness 구조 검사 PASS, npm 전체 의존성 감사 취약점 0.
- Vercel 빌드·성능 예산 PASS: CSS gzip 104.97 KiB, landing 초기 JS gzip 152.28 KiB.
- 인트로/첫 페인트 36개: 최초 35 PASS, 내부 replay 이벤트를 effect 구독 전에 보내던 테스트 준비 경합 1개 발견. `wave-arrival-ready` 신호를 기다리도록 수정 후 해당 여정 desktop/mobile 2/2 PASS. 렌더러 준비 경계를 타임아웃 확대로 숨기지 않았다.
- 390/960/1440px에서 reduce/calm 상태의 실제 canvas·원안 경남 자막·12.731초 자동 완료·초점 복귀 확인. 설정 변경 중 재생 유지·Esc·세션 재방문·내부 replay·8초 준비 실패 복구도 확인했다.
- 독립 QA: Chromium desktop/mobile 각 reduce·normal 4개, Firefox reduce 1개, WebKit reduce 1개 PASS. 실제 재생 시간 증가, 닫기, 재방문, 내부 replay, 초점/스크롤 복귀를 확인했다. QA 설정의 엔진 channel 오류 및 WebKit 정적 manifest fixture 누락은 보정 후 해당 미완료 케이스만 실행했다.
- 로컬 증거: `harness-results/intro-device-visibility/`의 원본 로그·브라우저 결과·독립 보고서. Quick CI 및 주변 계약 검사의 최종 결과는 PR에 기록한다.

## 실제 확인 범위

자동화 브라우저 및 모바일 viewport 검증이다. 실제 휴대폰 하드웨어 전체를 검사한 것은 아니다. WebGL 미지원이나 JS 차단 시 원래의 서비스 복구 동작을 유지하며, 그러한 환경까지 WebGL 인트로가 재생된다고 주장하지 않는다. 관광 사진·공공 API fixture를 이용했고 실제 계정 쓰기나 유료 호출은 하지 않았다. 원안의 기존 사진 대비 제한과 Release Audit 전수 판정은 이번 모션 설정 오류 해결과 별도다.
