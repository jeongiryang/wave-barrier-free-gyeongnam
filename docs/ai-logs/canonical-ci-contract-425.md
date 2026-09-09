# PR #425 AI 작업 로그

- PR: https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/425
- 제목: canonical CI 계약을 실제 workflow와 독립시킨다
- 작성자: W.A.V.E AI Release Owner (Repository Owner 위임)
- 최종 상태: Draft · CI/독립 QA/Preview 대기
- AI 도구: ChatGPT Codex · GitHub connector

## 목적

현재 CI 계약 테스트가 실제 browser install run을 expected에 복사하고 실제 APT preparation step을 비교 전에 제거해, 해당 명령의 변조를 독립적으로 검출하지 못하는 P1을 최소 범위로 수정한다.

## 역할 구분

- 사람: Repository Owner의 기존 운영 위임과 RC 범위 결정. Secret·비용·규칙 변경은 없음.
- AI: 최신 main·#288 작업 잠금·저장소 계약 확인, 자기참조 재현, 테스트 코드 최소 변경, Draft PR 작성, CI·독립 QA handoff.

## 검증

- 기준: `main@9b473a2703980f33787774f65d517d3748bcf66a`
- 원본 대조: `.github/workflows/ci.yml`, `tests/ci-completion-gate.test.mjs`, 보관된 pre-RC workflow
- 고정 계약: browser install 전체 run, sandbox-boundary APT preparation의 이름·shell·전체 run·정확한 위치
- negative regression: browser command 추가, browser install 교체, APT step 재정렬, 추가 host preparation
- GitHub 전체 CI: 새 로그 커밋이 포함된 최종 HEAD에서 확인 예정
- 독립 QA·공개 exact-head Preview: 대기

## 결과와 제한

- 실제 workflow, immutable bootstrap, sandbox boundary, 제품 suite, assertion, skip, timeout, workers, performance budget은 변경하지 않았다.
- Draft 상태를 유지한다. 최신 HEAD의 필수 CI 전체 성공, 공개 Preview, 독립 `wave-ai-qa:v2 PASS` 전에는 Ready/병합하지 않는다.
- #372 외부 provider hold와 POST-RC 범위는 이 PR에서 다루지 않는다.
