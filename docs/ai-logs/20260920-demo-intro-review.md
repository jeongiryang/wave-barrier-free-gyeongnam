# 시연 여행·입자 인트로·심사 ID 로그인

- 작성자: jeongiryang / Codex
- AI 도구: Codex, 내장 imagegen, 독립 읽기 전용 QA
- 상태: 구현 및 로컬 검증 완료, PR/CI/운영 반영 확인 예정

## 변경

사용자 요청에 따라 PR #466(6aff570)의 기존 입자 엔진·마스크·모델을 복구했다. 기존 native dialog 안에서만 동적 로딩하며 별도 중복 인트로를 만들지 않았다. 파도→무장애 심볼→WAVE 형상을 4개 문구·경남 사진과 연결한다. 총 10.4초, 세션당 한 번, Esc/건너뛰기/다시 보기, 모션 감소·탭 숨김 종료 및 타이머·리스너·renderer 정리를 유지한다. 마지막 문구는 `WAVE가 당신의 발걸음을 응원합니다`다. 카카오 공식 페이지는 큰 메시지와 장면 리듬 참고용으로만 열람했다. 로고·그림·영상·문구를 가져오지 않았다. 기존 관광사진의 원본·저작권 링크를 보존했다.

`/demo`는 바다 산책, 실내 여행, 가족 휴식 3가지 가상 여행이다. 실제 시간표 계산기를 사용하고 변경 미리보기→적용→되돌리기를 제공한다. DB·저장된 여행·공식 관광정보를 변경하지 않으며 시설·운영·이동 가정을 시연값으로 표시한다. 커뮤니티에는 접을 수 있는 예시 글 3개를 제공하고 실제 후기·시설 제보와 구분한다. 생성 삽화는 실재 시설의 증거가 아니다.

Better Auth의 공식 username 플러그인으로 선택 ID 가입 및 ID/이메일 로그인을 제공한다. migration 015는 nullable 열 2개와 unique index만 추가한다. 기존 비밀번호·계정 소유권을 변경하지 않는다. 심사 계정의 실제 생성 및 새 비밀번호 입력은 로컬 fixture 검사와 별개이며 운영 가입 단계에서 사용자에게 전달한다. 계정 비밀번호는 저장소에 기록하지 않는다.

CSS 예산을 늘리지 않고 현재 TS/TSX/JS/JSX에서 사용되지 않는 과거 reference-* 규칙만 제거했다. 사용 중인 planner-reference, reference-info-card, reference-tint, reference-route-details, reference-transport-details 규칙은 보존했다.

## 검증

- npm test: 1,502 통과.
- npm run typecheck: 통과.
- npm run lint: 오류 0, 이미지 관련 등을 포함한 경고 14.
- npm run build / check:performance: 통과. 최종 수치는 PR 기록 참조.
- Playwright: 시연 1440/960/390px의 미리보기·적용·되돌리기·저장 분리·axe, ID 로그인 요청, 기존 가입 검증, 밝은/어두운 사진 위 대비, 기존 스토리 회귀 38건 통과.
- 별도 인트로 테스트: 자동 종료, 최종 문구 유지, Esc, 저장소 read/write 거부, 사진 실패, 모션 감소, JavaScript 미실행 시 사용 가능 확인.
- 브라우저 직접 확인: 입자 인트로 다시 보기, 사진형 hero, 시연 여행 화면.
- 독립 QA: 인증 호환성·migration·시연 분리·인트로 lifecycle 점검. ID 마침표 불일치와 마지막 문구 조기 소멸을 수정했다.

## 운영 나루 확인

2026-09-20 운영 /api/assistant GET 200 available=true(3.10초). 공개 합성 여행 조건과 `자동차로 이동할게.` 요청 POST 200(5.24초), source=local-llm, proposal action=recalculate-route / transport=car를 확인했다. handler가 실제 provider 성공 뒤 source를 반환하는 것도 확인했다. 1회 표본이며 장시간 안정성 전체를 입증하지 않는다. 다른 사용자의 모델·GPU·서버 설정은 변경하지 않았다.

## 역할과 남은 절차

사람: 기능 요구·입자 인트로 기억·공식 안내 제공, 실제 심사 계정의 새 비밀번호 및 약관 확인.
AI: 구현·이미지 생성·로컬 검증·QA·PR 및 승인된 Actions 배포 절차.
공모전 최종 제출이나 운영사 메일 발송은 이 변경에 포함되지 않는다.
