# PR 생성 예정 · 현장 음성 글자 표시

- PR: 생성 후 이 문서에 연결
- 제목: feat: 현장 음성을 큰 글자로 표시
- 작성자: Codex
- 최종 상태: 검증 완료, PR 준비
- AI 도구: OpenAI Codex

## 목적

현장 직원이나 동행인의 정해지지 않은 말을 청각장애 여행자가 큰 글자로 확인할 수 있게 한다. 수어 번역을 추정하지 않고 브라우저 음성 인식 결과를 메모리에서만 표시한다.

## 역할 구분

- 사람: 요구사항·개인정보 경계 승인, 최종 병합 판단
- AI: 기존 의사소통판 조사, 메모리 전용 음성 인식 구현, 정책·API 기록 갱신, 단위·브라우저·접근성·성능 검증, PR 작성

## 검증

- `npm run typecheck` 통과
- 변경 파일 `eslint` 통과
- `node --test tests/speech-capture.test.mjs tests/public-policies.test.mjs tests/onsite-communication.test.mjs` 9/9 통과
- `playwright e2e/speech-capture.spec.ts` 데스크톱 3/3, 모바일 3/3 통과; 고지 전 미시작, 서버 요청 0건, 숨김 중단, 닫기 초기화·초점 복귀, 미지원·권한 거부, axe 위반 0건 확인
- `npm run build:vercel` 통과
- `npm run check:performance` 통과: CSS gzip 69.21KiB / 70KiB

## 결과와 제한

- 음성과 인식 결과는 WAVE 서버·나루·DB·로그·브라우저 저장소로 보내거나 저장하지 않는다.
- 브라우저 제조사가 음성을 서버에서 처리할 수 있어 시작 전 고정 고지를 매번 표시한다.
- 실제 사람의 음성 정확도나 제조사별 권한 UI는 합성 `SpeechRecognition` 더블로 대체했으며, 배포 후 지원 브라우저별 확인이 필요하다.
- 수어 아바타·수어 번역·녹음 파일은 범위에서 제외했다.
