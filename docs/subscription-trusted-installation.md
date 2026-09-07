# 구독 실행기의 설치 신뢰 경계

Refs #289, #294, [bootstrap P1](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/289#discussion_r3949986253).

저장소의 launcher는 배포용 소스다. 검증 대상 PR의 launcher/helper를 호스트에서 직접 실행해 자기 안전성을 검사하게 해서는 안 된다. 설치와 예약 활성화는 별개이며 현재 `blocked-sandbox`다.

## 신뢰 시작점

운영자는 특정 commit의 실행기 전체를 검토한 뒤 **모든 checkout/worktree 밖의 새 버전 디렉터리**에 복사한다. `.git`, npm 패키지, 인증·설정 파일을 복사하지 않는다. 기존 설치를 덮어쓰지 않는다. 배포할 목록은 `subscription-launch.py`의 `FILES`에 고정된 12파일이며 Node imports는 이 목록 안의 상대 모듈과 Node 내장 모듈만 사용한다. Windows 파일의 CRLF는 LF로 정규화해 각 파일의 SHA256을 계산한다.

외부 `manifest.json`은 `version: 1`, `files`(고정된 상대 경로→SHA256), `node`, `nodeSha256`, `git`, `gitSha256`, `gh`, `ghSha256`를 기록한다. 바이너리는 검토한 시스템 설치물의 실제 절대 경로와 원본 bytes SHA256을 사용한다. Git/Codex 인증 파일을 읽거나 manifest에 넣지 않는다. manifest 자체의 원본 bytes SHA256을 저장소 밖 예약 명령의 `--pin`에 고정한다. 저장소가 manifest나 pin을 생성·갱신하도록 예약하지 않는다.

이 초기 복사·검토와 외부 launcher/manifest의 무결성은 신뢰 시작점이다. 악성 코드가 외부 설치까지 수정할 수 있는 호스트 침해를 자기 hash 검사만으로 막는다고 주장하지 않는다. 대상 코드의 수정 권한은 sandbox snapshot에만 있으며 외부 설치는 마운트되지 않는다. 설치 디렉터리는 운영자와 시스템만 수정할 수 있게 관리한다.

## 실행 전 검사

`python -I <외부 설치>/scripts/subscription-launch.py --manifest <외부 설치>/manifest.json --pin <고정 SHA256> --repository <대상 저장소> --verify-only`

Python `-I`로 현재 디렉터리/PYTHONPATH 모듈 탐색을 제외한다. launcher는 외부 설치 위치, manifest pin, 자신의 bytes를 포함한 12파일, Node/Git/gh binaries, 대상 checkout의 실행기 파일이 검토본과 동일한지 검사한다. 심볼릭 링크·경로 변경·helper/entrypoint 변조는 generic `BLOCKED_SANDBOX`로 실행 전에 거부한다. target은 파일 데이터로만 읽으며 import하지 않는다.

검사를 통과한 실제 실행도 외부 고정 Node entry에서 시작하고 cwd는 외부 설치다. Python bridge도 같은 외부 설치를 가리킨다. 대상 PR은 Git archive로 export한 뒤에만 bwrap 내부에서 실행한다. Node loader 환경 설정을 제거하며 Git/gh는 검증한 절대 경로를 사용한다. 설치 파일이 달라지는 업데이트는 자동 수용하지 않고 새 버전을 검토·pin해야 한다.

## 검증과 활성화 구분

`tests/subscription-bootstrap-boundary.py`는 공개 sentinel, 실제 로컬 수신기와 악성 helper/entrypoint fixture를 사용한다. 정상 외부 설치의 verify-only는 성공하고 대상/설치 helper와 entrypoint 변조 6건 및 manifest 변조는 모두 coordinator 실행 전에 거부해야 한다. fixture는 실행됐을 때 외부 연결을 시도하는 코드지만 실제로는 시작되지 않으므로 파일/localhost/external 연결과 queue 쓰기가 없어야 한다. probe에 실제 인증 파일을 사용하지 않는다.

별도로 `subscription-sandbox-boundary.py`가 실제 namespace와 악성 npm 명령을 검증하고, CI의 `Validation sandbox shard 1/4`부터 `4/4`까지가 기본 제품 검사 5개와 전체 브라우저 검사의 각 shard를 실행하고 protected validate가 네 결과를 모두 요구한다. 동일 HEAD CI와 독립 QA PASS, #294 시도·재개 조건, 로컬 설치 verify-only 확인 뒤에만 기존 예약 연결을 검토한다. fixture 또는 설치 파일 작성만으로 예약 등록·실제 queue 성공·Notion 반영을 완료 처리하지 않는다.
