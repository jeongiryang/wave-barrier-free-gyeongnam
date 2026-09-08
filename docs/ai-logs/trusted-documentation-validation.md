# 승인된 문서 작업의 중복 전체 검증 제거

Refs #288 #289 #294. Owner의 2026-09-08 RC 범위 지시를 따른다.

현재 Production은 `0116ef9e90cfe06330739e6c1950a1033494f207`로 배포됐고 008은
기존 CD213에서 적용됐다. 운영 DB 사후 읽기 전용 집계는 전체8/공개1/잔여대상0,
독립 로컬 Production browser/axe8PASS다. 원래 API 검사는 ODsay route 계약에서
실패했으며 [#359 근거](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/359#issuecomment-5581821522)를 유지한다.
이는 자동화 활성화나 전체 Release GO 근거가 아니다.

## 원인과 변경

일반 hosted CI의 중복 sandbox shard는 이미 RC gate에서 제외됐지만 문서 worker의
`validateDocumentation`은 아직 `validateInSandbox`를 통해 전체 제품 검사를 네 번
요구했다. CI827/828의 장시간 runtime 실패는 역사적 인프라 근거로 보존하고 다시
반복하지 않았다.

활성 문서 경로는 기존 boundary probe와 승인된 tracked Markdown 데이터 검증으로
좁힌다. 범위 밖 파일·untracked 추가·빈 변경·기존 금지 실행 문구는 거부한다.
파일별 SHA256과 경계 receipt를 보존하며 제품 검증은 `pending-exact-head-ci`로
표시한다. atomic push, 기존 exact-HEAD CI 확인, 별도 QA, 소유권·시도 제한은 유지한다.
전체 shard 함수와 테스트, Python boundary, immutable bootstrap과 12파일 목록은
변경하지 않는다. 대상 npm 코드는 문서 데이터 검증 중 실행하지 않는다.

## 검증

- 새 문서 검증 회귀5개: 구현 전 신규 진입점 부재로5FAIL → 구현 후5PASS.
  이것은 과거 runtime timeout의 새 재현이 아니라 새 경계 계약 검사다.
- 기존 sandbox/tick/publish 포함 관련23PASS, 실패/skip0.
- lint 성공(기존 경고2, 오류0), typecheck 성공, 전체 unit/contract649PASS,
  실패/skip0. 운영·전체 의존성 audit 각각0, Vercel build와 성능 예산 성공.
  CSS69.96/70KiB, planner JS269.97/270KiB로 예산은 변경하지 않았다.
- 전체784개 browser/axe 실행은 기존 CI 설정(workers2, retry1, flaky 실패)을
  그대로 사용해 진행 중이다. 완료 결과와 exact HEAD hosted CI는 PR에 기록한다.
- 기존 테스트 삭제·skip 추가·assertion/timeout/workers/성능 예산 완화 없음.
- 모델 호출, 새 외부 설치 pin, 예약 등록, queue tick, #294 시도 초기화 없음.

### CI 고정 배포 갱신

초기427c982의 CI845는 기존 CI bootstrap이 바뀐 두 실행기 파일의 해시를
거부해 즉시 실패했다. runtime/browser timeout 재발이 아니라 의도한 immutable
검증이었다. 실행기 소스427c982의 두 해시를 고정한 배포c7ec533을 별도 커밋으로
게시하고, active CI는 그 파일의 정확한 SHA256을 확인한 뒤 사용하도록 갱신한다.
과거 archive와 모든 probe는 보존한다. 계약 테스트는 active와 archive의 차이를
해당 고정 SHA·해시 두 값으로만 허용하고 나머지 job 전체 동일성은 계속 확인한다.
로컬 자동화 설치 pin과 예약은 바꾸지 않는다.

## 재개 경계

최신 HEAD full CI·독립 QA를 확보한 후 검토된 새 외부 설치를 추가해야 한다.
기존 설치를 덮어쓰지 않는다. 실제 로컬 경계와 구독 인증/포함 한도, Production
운영 gate가 충족되기 전 활성화하지 않는다. 실제 canary·QA·Notion 환류는 미완료다.
