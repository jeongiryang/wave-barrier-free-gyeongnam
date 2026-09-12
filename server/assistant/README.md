# WAVE 나루 — 자체 운영 추론

나루는 여행 요청을 제한된 작업 제안으로 변환한다. 시설·날씨·이동 수치를 생성하지 않는다. 실제 장소 ID, 현재 조건, 일정 제약을 다시 확인하고 사용자의 적용 버튼으로 실행한다. 모델이 없거나 응답에 실패해도 같은 대화창에서 기존 여행 도구와 명시적으로 표시한 간편 명령을 사용할 수 있다.

## 실행 구조

브라우저 → 동일 출처 `/api/assistant` → 인증된 HTTPS 게이트웨이 → 루프백 Ollama.

- `handler.ts`: 출처·24 KB 본문·최근 6개 메시지 검사, 실제 장소 ID와 18개 작업/20개 도구 허용 목록, 요청별 provider requester. 개인 대화는 URL 기반으로 병합하거나 캐시하지 않는다.
- `gateway.py`: 표준 Python 3.10 이상. `127.0.0.1:18765`에만 바인딩하며 32자 이상 비밀 토큰을 상수 시간으로 비교한다. 연결 16개, 추론 동시 1개, 분당 12회, 업스트림 40초, 응답 320토큰으로 제한한다. 앱이 덧붙이는 시스템/문맥을 포함한 게이트웨이 본문 상한은 36 KB다.
- 질문·답변·토큰·여행 조건은 로그나 DB에 저장하지 않는다. 선택 지역, 요청 편의, 활동, 날짜, 공개 장소 ID/이름만 문맥으로 전달한다. 계정 정보나 현재 위치 좌표는 포함하지 않는다.
- 기본 `WAVE_OLLAMA_GPU_LAYERS=0`은 공유 실행기에 연결할 때 CPU로 검증하기 위한 값이다. GPU 사용은 전용 프로세스에 장치를 지정한 후 `999`로 변경해 모든 모델 레이어를 GPU에 올린다. 이 값은 GPU 장수가 아니다. Ollama 0.34.0에서 `-1`은 이 호스트의 주 모델을 CPU에 남겼으므로 실제 VRAM 사용을 검증했다. 다른 사용자의 프로세스를 중단하거나 공용 Ollama 설정을 바꾸지 않는다.

## DSW에서 확인한 구성

Ubuntu 22.04.5 / RTX A6000 4장. 기존 작업을 보존하고 한 장의 여유 VRAM만 사용하는 WAVE 전용 실행기를 사용자 디렉터리에 설치한다. Gemma 4 26B는 약 26B 파라미터 중 약 4B를 활성화하는 MoE 모델로, Q4_K_M 파일은 약 19 GB다. 8K 문맥과 짧은 구조화 응답을 사용한다. 모델 용량을 늘리기 전에 실제 한국어 의도 변환 품질·응답 시간·사용 가능한 VRAM을 측정한다.

작업 의도 구조화의 응답 변동을 줄이기 위해 API 요청과 전용 게이트웨이의 모델 옵션을 `temperature: 0`으로 맞춘다. 게이트웨이는 요청의 온도를 그대로 전달하지 않으므로 `gateway.py`의 고정값과 전용 서비스 재시작까지 확인해야 실제 추론에 반영된다. 온도 설정만으로 정확성을 보장하지 않으며 명시한 조건 검증과 사용자 확인 절차를 함께 유지한다.

공용 Ollama 0.24.0은 현재 배포되는 모델 manifest를 받지 못했다. 따라서 전용 Ollama 0.34.0 바이너리를 별도 경로에 설치한다. 공용 바이너리는 그대로 둔다.

공식 패키지: `https://github.com/ollama/ollama/releases/download/v0.34.0/ollama-linux-amd64.tar.zst`

SHA-256: `cf95886728959aa09910bb34de5cca1cc5a8f68003b5597197d3f2c2d57c0804`

운영 계정의 `~/wave-naru/runtime`에 검증한 아카이브를 풀고, 다음 `runtime.env`를 권한 600으로 만든다. `GPU-...`는 사용 가능하다고 확인한 장치 UUID로 설정한다. 모델 저장 공간은 최소 25 GB와 호스트의 기존 작업 여유를 확보한다.

```dotenv
OLLAMA_HOST=127.0.0.1:18764
OLLAMA_MODELS=/home/OPERATOR/wave-naru/models
CUDA_VISIBLE_DEVICES=GPU-...
OLLAMA_VULKAN=0
GGML_VK_VISIBLE_DEVICES=1
OLLAMA_NO_CLOUD=1
OLLAMA_DEBUG=0
OLLAMA_NUM_PARALLEL=1
OLLAMA_MAX_LOADED_MODELS=1
OLLAMA_MAX_QUEUE=2
OLLAMA_CONTEXT_LENGTH=8192
OLLAMA_KEEP_ALIVE=3m
```

Vulkan을 사용하는 환경이면 `GGML_VK_VISIBLE_DEVICES`도 실제 같은 장치에 맞춘다. CUDA만 사용할 때는 Vulkan을 끈다. `nvidia-smi`로 실제 모델 PID가 지정한 장치에만 올라갔는지 반드시 확인한다.

`gateway.py`, `warm-model.py`와 세 AI service 파일을 `~/wave-naru`에 복사하고 service 파일은 `~/.config/systemd/user/`에도 설치한다. 시작 전에 `gateway.env`를 권한 600으로 만든다. 토큰은 `secrets.token_urlsafe(48)` 등으로 생성하고 화면·명령 인수·저장소에 출력하지 않는다.

```dotenv
WAVE_GATEWAY_TOKEN=<무작위 비밀 토큰>
WAVE_GATEWAY_MODEL=gemma4:26b
WAVE_GATEWAY_PORT=18765
WAVE_OLLAMA_URL=http://127.0.0.1:18764
WAVE_OLLAMA_GPU_LAYERS=999
```

```bash
systemctl --user daemon-reload
systemctl --user enable --now wave-naru-ollama.service
# /api/version이 응답한 뒤 모델을 한 번만 받는다.
OLLAMA_HOST=127.0.0.1:18764 ~/wave-naru/runtime/bin/ollama pull gemma4:26b
systemctl --user enable --now wave-naru-model.service wave-naru-gateway.service
loginctl enable-linger "$USER"
```

`wave-naru-model.service`는 게이트웨이 시작 전에 모델을 미리 올린다. 먼저 최대 30초 동안 Ollama 준비를 확인하며, 전체 180초 한도 안에서 모델 예열은 한 번만 요청한다. 예열과 요청 모두 `keep_alive=-1`, `draft_num_predict=0`, `num_batch=256`을 사용한다. `/v1/health`는 설치 여부뿐 아니라 `/api/ps`의 실제 모델 상주 상태를 확인한다. DSW에서 주 모델 VRAM 약 17.4 GB와 한국어 조건 해석 응답 약 7.3초를 확인했다. 다른 사용자의 기존 프로세스는 실행 상태를 유지했다.

`npm test`는 Python 3으로 시작 지연·기한 초과·예열 실패를 외부 통신 없이 검사한다. 기본 Python 실행 파일을 찾지 못하면 `WAVE_TEST_PYTHON`에 설치된 Python 3의 경로를 지정한다.

## 별도 계정으로 연결하기

공용 DSW Tailscale 계정에 의존하지 않도록 `wave-naru-network.service`를 사용자 service로 설치한다. 별도의 state, socket, UDP 41642와 userspace 모드로 실행하며 OS의 라우팅과 DNS 설정을 변경하지 않는다. 해당 service는 시스템의 `/usr/sbin/tailscaled` 실행 파일을 사용한다.

```bash
systemctl --user enable --now wave-naru-network.service
tailscale --socket="$HOME/wave-naru/tailscale/tailscaled.sock" up \
  --hostname=wave-naru-dsw --accept-dns=false --accept-routes=false --ssh=false
```

표시된 장치 등록 링크를 WAVE 운영자 본인의 계정으로 연다. 이후 Funnel 권한도 이 전용 네트워크에서 설정한다. 모든 후속 명령에 위 전용 socket을 명시한다. 호스트의 기본 Tailscale을 로그아웃하거나 재설정하지 않는다.

2026-09-12에 별도 계정 등록과 Funnel HTTPS 연결을 확인했다. 인증 없는 공개 요청은 401, 인증한 준비 상태와 합성 한국어 조건 요청은 200이었다. 공개 주소를 사용한 조건 응답 한 건은 약 2.1초였다. 전용 네트워크 서비스 재시작 뒤에도 연결 설정이 유지됐다. 로컬 기관 DNS에서 신규 주소 전파가 늦어 공개 DNS로 확인했으며, 배포 서버의 실제 연결은 배포 후 별도로 검사한다.

초기 장치 인증 만료 예정은 **2027-03-11 07:28 UTC**다. 운영자는 만료 전에 본인 계정의 장치 관리 화면에서 재인증하거나 해당 서비스 장치의 만료 정책을 검토해야 한다. 정책을 바꾸지 않은 상태를 무기한 연결로 설명하지 않는다. 이 날짜는 인증 당시의 상태이며 재인증 후에는 전용 socket의 `tailscale status --json`에서 `Self.KeyExpiry`를 다시 확인한다. 인증 상태와 비밀값은 저장소에 복사하지 않는다.

## 웹 배포 연결과 검증

호스팅 서버가 도달할 수 있는 고정 HTTPS 주소가 필요하다. Tailscale Funnel을 쓰는 경우 tailnet 소유자가 해당 노드에 Funnel을 허용해야 한다. 이것이 설정되지 않은 상태에서 운영 AI 연결 완료로 보고하지 않는다. 허용 후 `tailscale --socket="$HOME/wave-naru/tailscale/tailscaled.sock" funnel --bg --https=443 http://127.0.0.1:18765`로 이 게이트웨이만 연결한다. 파일 경로나 SSH, 공용 Ollama 포트를 노출하지 않는다.

배포 환경의 `WAVE_AI_BASE_URL=https://HOST/v1`, `WAVE_AI_MODEL`, `WAVE_AI_TOKEN`을 서버 환경 변수로 설정한다. 토큰은 해당 게이트웨이와 정확히 같아야 한다. 브라우저용 `NEXT_PUBLIC_*` 변수에 넣지 않는다. 로컬 SSH 포워딩은 개발 검증에만 사용하며 운영 연결의 대체물이 아니다.

검증 순서: 인증 없는 게이트웨이 요청 401 → 인증된 `/v1/health` → 배포의 `/api/assistant` 가용 상태 → 실제 한국어 조건 요청 → 확인 버튼 적용 → 공식 여행지 검색 → 실제 ID 일정 추가 → 편의 근거 확인. 생성 모델 결과와 공식 관광 데이터 응답을 별도로 검증한다. 요청·응답 본문을 운영 로그에 수집하지 않는다.

중지: WAVE 전용 AI·예열·네트워크 사용자 service만 `systemctl --user stop`한다. Funnel은 해당 HTTPS 포트에 `off`를 적용한다. 토큰 교체 시 서버와 게이트웨이를 함께 변경한다. 공용 service, 다른 사용자의 GPU 작업, 다른 Funnel 설정에는 손대지 않는다.

공식 근거: [모델](https://ollama.com/library/gemma4:26b), [Ollama GPU](https://docs.ollama.com/gpu), [Chat API](https://docs.ollama.com/api/chat), [Funnel 명령](https://tailscale.com/docs/reference/tailscale-cli/funnel).
