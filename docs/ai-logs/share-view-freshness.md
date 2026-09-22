# 공유 일정 보기 최신 상태 확인

- 작성자: unknownamed
- AI 도구: Codex
- 상태: 독립 QA 승인 후 최신 main 반영 완료, 별도 PR의 필수 CI·병합·배포 확인 대기.

## 목적과 근거

PR #682의 CI35686558145 mobile shard8에서 자동차 공유 생성 응답을 기다리는 동안 자전거로 편집한 경우를 조사했다. 저장된 여행은 자전거였지만 자동차 생성 응답이 돌아오자 `공유 일정 보기`가 먼저 활성화됐다. 기존850ms 자동 갱신이 끝나기 전 이전 공유 내용을 열 수 있었다. trace의 최종 assertion402730ms 뒤 자전거 갱신 POST가402884ms에 시작했다. 단순히 테스트의 request-array 검사를 기다리도록 바꾸면 실제 링크 노출 문제가 남는다.

이 수정은 최신 main26e8561에서 별도 `codex/wave-share-view-freshness` 브랜치로 분리했다. 사용자는 PR 검토 후 수정·적용을 승인했고 관리 담당이 병합을 수행한다.

## 변경

- 서버 응답 또는 기존 확인된 snapshot hash와 일치하는 공개 내용을 반응형 상태로 기록한다. 현재 일정과 일치하고 갱신/오류 상태가 아닐 때만 `shareIsCurrent`를 제공한다.
- 비동기 대기, 이전 응답, 연속 편집, 충돌·갱신 실패에서는 보기 링크의 href를 제거하고 aria-disabled 및 tabIndex=-1로 표시한다. 갱신 성공 후 같은 공유 ID의 링크를 복원한다. 이미 확인된 링크는 클립보드 전용 `copy-error` 상태에서도 사용할 수 있다.
- 카카오 공유 버튼도 같은 준비 조건을 확인한다. 링크 복사의 기존 ensureShareUrl 대기, 갱신·종료, 공개 payload/개인정보 제외, API·DB·850ms debounce는 유지한다.
- 실패했던 이동수단 회귀는 자동차 생성·자전거 갱신 응답을 각각 제어해 갱신 전/중의 비활성 링크와 반영 후 링크를 검사한다. 이 케이스는 직접 여행 설정과 저장 상태를 사용하며 나루 도구를 열지 않는다. 기존 직접 공유 회귀에는 연속 편집, 충돌 후 과거 값으로 되돌리기, 복구와 reload hash 경계를 보강했다.

## 실제 실행한 검사

- ASCII worktree `C:/Users/user/Documents/wave-audit-20260922/share-freshness`, 자체 Vite :4193 ready 확인 후 실행.
- Node `C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`; 브라우저 override `E2E_EXECUTABLE_PATH=C:/Users/user/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe`.
- 수정 전 main 제품에 새 직접 회귀를 실행: mobile1개 의도한 실패. 자동차 응답 후 view anchor가8초 동안 enabled/href를 유지했다. 증거 `C:/Users/user/Documents/wave-audit-20260922/share-freshness-author-before`에 보존했다.
- 수정 후 `playwright test e2e/trip-transport-restoration.spec.ts e2e/simple-live-share.spec.ts --grep 'changed travel mode updates pending|갱신 응답을 기다리며|snapshot hash|409 충돌' --workers=2`: desktop/mobile8개 통과(20.6초).
- 오류 guard를 보완한 뒤 `playwright test e2e/simple-live-share.spec.ts --workers=2`: 직접 공유 desktop/mobile22개 통과(1분). 동일 ID, 복사, 명시적 생성, 현재 일정 갱신, 충돌 복구, 공유 종료와 뷰어 무효화를 포함한다.
- `npm test`:1,632개 통과, 실패/skip0(16.2초). 외부 로그 `C:/Users/user/Documents/wave-audit-20260922/share-freshness-unit.log`.
- `tsc --noEmit`, 변경한 hook/component/spec4개의 ESLint, `git diff --check` 통과.
- 브라우저 API 응답은 합성 fixture다. Production 공유를 생성하거나 나루 UI·실제 모델을 호출하지 않았다. 전체 build/성능·CI는 최종 PR 검증에서 확인하며 이 로그에서 미실행 검사를 완료로 표시하지 않는다.

## 역할과 남은 확인

- 사람: 현재 요구와 적용 승인, 계정·비밀정보 관리.
- 구현 담당: 원인 조사, 제품·회귀 수정, 위 검사, PR 준비.
- 독립 QA: 별도 main worktree에서 원래 결함을 재현했고 새 후보를 별도 replay한다. 오류 guard 보완 의견을 반영했다.
- 관리 담당: 최신 main 적용 시점 조정, 필수 CI 확인, squash 병합·배포 검증. 이 수정은 환경 변수·DB migration·workflow 변경이 없다.

## 독립 QA 및 최종 main 반영

- 후보 dd41eb4는 독립 worktree의 브라우저6개 검사에서 모두 통과했다(21.2초, skip/flaky0). 오래된 생성 응답과850ms 대기, 진행 중인 현재 갱신,503 실패와 복사 재시도, car→bicycle→walk 연속 편집의 늦은 중간 응답에서 href 차단·aria-disabled·tabIndex를 확인했다. 같은 공유 ID의 최신 revision 복원과 클립보드 복사도 확인했다.
- 독립 소스 검토에서 error 차단과 copy-error 허용을 확인하고 승인했다.
- 최종 origin/main d332175706a086baca7d42e819a1f72d1f53b3e5를 충돌 없이 병합했다. 승인된 두 제품 파일과 두 회귀 spec은 dd41eb4와 내용이 동일하며 `git diff --check`가 통과했다. 외부에서 병합된 나루 설정 변경은 그대로 보존하고 별도 검수·수정하지 않았다. 위 단위1,632개는 dd41eb4 후보에서 실행한 결과이며 최신 병합 tree의 전체 CI 결과로 바꾸어 주장하지 않는다.
