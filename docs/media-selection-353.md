# #353 전체 화면 Intro / Landing 미디어 선택

## 현재 선택 — Owner 두 번째 시각 피드백, 2026-09-09

현재 로컬 시각 후보에 적용한 결정이다. 아래 첫 체크포인트의 선택은 역사 기록이며, 현재 사용 여부는 이 표가 우선한다. 자산을 제작·복사한 사실과 Production 배포를 구분한다. **이번 후보는 아직 미배포다.**

원본 v1/v2/v3 tree와 이미지를 다시 확인했다. v2 원본 영상의 2·8·15초 프레임에는 영어 copy와 과거 카드 구성이 있어 그대로 사용하지 않았다. 원본 브랜치와 파일은 보존했다.

| 원본 자산 | 현재 결정 | 실제 배치 / 제외 이유 |
| --- | --- | --- |
| v1 `wave-plan-together.webp` | USE NOW | `planning-together-v1.webp` → 필요한 편의 장면의 큰 동행·계획 그림 |
| v1 `wave-coast-hero.webp` | KEEP AS SOURCE ONLY | 현재 v3 해안과 역할 중복. 새 레이아웃 후보용 원본 보존 |
| v1 `wave-coast-loop.mp4` | KEEP AS SOURCE ONLY | Intro/Hero의 같은 해안 흐름에 또 다른 해안 loop를 겹치지 않음 |
| v2 `garden-discovery.webp` | USE NOW | 큰 정원 장면 + 선택 재생 영상. 실제 추천 장소의 사진과 별도 구역, 상상 풍경 명시 |
| v2 `harbor-night.webp` | USE NOW | 마지막 CTA 배경 + 선택 재생 영상의 마지막 장면 |
| v2 `coast-dawn.webp` | USE NOW | 선택 재생 영상의 첫 장면. 첫 화면에 별도 이미지 요청은 추가하지 않음 |
| v2 `wave-intro-film.mp4` | BETTER IF EDITED/RE-RENDERED | 영어 글자·옛 카드 레이아웃 대신 같은 세 이미지의 20초 무음 crossfade를 새로 렌더. `story-film-v2.mp4`로 실제 사용 |
| v2 `wave-hero-motion.mp4` | KEEP AS SOURCE ONLY | 3MB 카드 회전 영상은 현재 Hero와 역할 중복 |
| v2 `wave-route-motion.gif` | REJECT | 이번 UI에서는 사용하지 않음. 실제 일정·지도 기록 대신 가상 경로를 반복하는 GIF를 넣지 않음. 파일은 보존 |
| v2 `hero-poster.webp`, `intro-poster.webp`, `route-poster.webp` | KEEP AS SOURCE ONLY | 원본 영화/레이아웃의 포스터. 새 장면에는 정원 이미지 사용 |
| v2 `intro.ko.vtt`, `render-motion.mjs`, 원본 제작 문서 | KEEP AS SOURCE ONLY | 원본 증거. 새 remix에는 음성·영상 내 문구가 없고 의미·조작은 한국어 우선 HTML로 제공 |
| v3 `hero-coast.webp`, `hero-coast-small.webp` | USE NOW | 전체 화면 Intro와 Hero가 공유하는 해안. viewport에 맞는 srcset |
| v3 `hero-water-loop.mp4` | USE NOW | 같은 자산으로 Intro의 첫 무음 장면 → Hero의 명시적 선택 재생을 연결 |
| v3 `ocean-expand.webp`, `ocean-expand-small.webp` | USE NOW | 기존 스크롤 프레임 확장 장면 유지 |
| v3 `ocean-surface-loop.mp4` / 로컬 `intro-ocean.mp4` | KEEP AS SOURCE ONLY | 첫 후보의 영상은 보존하지만 현재 UI 참조 없음. Intro/Hero를 같은 해안으로 통일 |
| v3 `travel-together.webp`, `travel-together-small.webp` | KEEP AS SOURCE ONLY | 이번 편의 장면은 v1의 함께 계획하는 이미지로 교체 |
| v3 `harbor-closing.webp`, `harbor-closing-small.webp` | KEEP AS SOURCE ONLY | 이번 closing은 v2 항구로 교체. 원본 삭제 없음 |
| v3 `garden-discovery.webp`, `garden-discovery-small.webp` | KEEP AS SOURCE ONLY | v2 정원 선택. 실제 관광사진으로 혼용하지 않음 |
| v3 `journey-poster.webp`, `ocean-poster.webp` | KEEP AS SOURCE ONLY | 원본 장면 보존, 새로운 다운로드 없음 |
| v3 `journey-sequence.mp4` | REJECT | 이번 UI에서는 실제 같은 여행의 날짜·일정·지도 기록을 우선. 원본 삭제 없음 |
| v3 preview HTML/CSS/JS, source 렌더러·글꼴·라이선스 | KEEP AS SOURCE ONLY | 참고 소스 보존. 전역 CSS/JS 복사나 별도 글꼴 적용 없음 |
| 기존 `WaveField` 파도 → 무장애 형상 → 워드마크 | USE NOW | Hero의 작은 패널에서 전체 화면 Intro로 승격. 같은 작은 패널을 Hero에 반복하지 않음 |

새 remix는 `scripts/media/render-story-remix.mjs`로 기존 v2 이미지 세 장과 설치된 FFmpeg만 사용해 재현된다. 960×720 / H.264 / 24fps / 20초 / 오디오 없음 / 1,429,568 bytes. SHA-256 `d2f19c5dfcb69fba2916c95a7e28619d6b719d0831893e9b342384e659c67944`. 별도 출력에 재렌더한 해시도 동일했다. 유료 API나 package 변경은 없다.

새 그림·영상은 `상상 풍경 · 실제 관광지나 편의시설 정보가 아닙니다`로 표기한다. 실제 관광지 discovery, 공식 사진의 출처, 같은 여행의 날짜·지도 기록은 보존한다. 첫 화면에 새 20초 영상을 자동 다운로드하지 않으며, OS 동작 감소·Save-Data에서는 정적 이미지·설명·CTA가 유지된다. 자동화/제출 시연의 실동작 증거로 사용하지 않는다.

## 첫 체크포인트 선택 기록 — 아래는 대체된 역사 기록

2026-09-09 KST. 현재 `feat/fullscreen-story-353`의 시각 체크포인트. **Production 적용 기록이 아니다.** 원본 브랜치·렌더 소스·미사용 자산은 보존한다. 세 원본의 GitHub tree를 조회하여 경로와 크기를 확인했다. 자산 브랜치 전체나 예제 CSS/JS는 통합하지 않는다.

원본:

- v1: `0de3ce4128ae9db405d6c66c02910dcbc2f4d871`, `docs/media/wave-coast-v1/`
- v2: `be1347fd62d821f4c7ff0622a0c9481c5fc2ab98`, `docs/media/wave-motion-v2/`
- v3: `d908bd9de2f484a8ef5c1f6fab3441c33f96bf88`, `docs/media/wave-cinematic-v3/`

| 원본 자산 | 결정 | 이번 화면에서의 역할 / 이유 |
| --- | --- | --- |
| v1 wave-coast-hero.webp / wave-plan-together.webp | KEEP AS SOURCE | v3 해안·동행 파생 이미지로 역할을 정리. 이전 원본 보존 |
| v1 wave-coast-loop.mp4 | KEEP AS SOURCE | 유사 해안 영상을 여러 섹션에서 반복하지 않음 |
| v2 coast-dawn.webp / harbor-night.webp | KEEP AS SOURCE | v3 Hero·closing 이미지와 역할 중복 |
| v2 garden-discovery.webp | REJECT | 이번 실제 여행지 discovery에는 가상 정원을 쓰지 않음. 실제 Production 관광사진을 표시 |
| v2 hero-poster.webp / intro-poster.webp / route-poster.webp | KEEP AS SOURCE | 현재 짧은 첫 장면과 실제 일정·지도 기록의 포스터로 혼용하지 않음 |
| v2 wave-intro-film.mp4 / intro.ko.vtt / render-motion.mjs | EDIT/RENDER AGAIN | 제출 시연용으로 활용 가능. 20초 영상 전체를 첫 방문 대기로 강요하지 않음. 이번에는 새 렌더를 수행하지 않음 |
| v2 wave-hero-motion.mp4 | KEEP AS SOURCE | 3,029,129 bytes. 기존 v3 선택 재생 영상과 중복되어 추가 전송하지 않음 |
| v2 wave-route-motion.gif | REPLACE | 1,446,792 bytes GIF 대신 날짜·장소가 일치하는 실제 기록과 키보드로 고르는 장면 사용 |
| v3 images/hero-coast.webp / hero-coast-small.webp | USE | 기존 Hero 배경 유지. 화면별 srcset, 가상 풍경 표기 |
| v3 video/hero-water-loop.mp4 | USE | 기존 Hero에서 명시적 재생 시에만 요청. Intro와 다른 영상 |
| v3 video/ocean-surface-loop.mp4 | USE | `public/media/wave-story/intro-ocean.mp4`로 636,140 bytes 복사. 전체 화면 첫 장면에만 자동 재생 |
| v3 images/ocean-expand.webp / ocean-expand-small.webp | USE | Intro 정적 대체 및 기존 프레임 확장 장면. 확대는 스크롤 CSS이며 영상 중복이 아님 |
| v3 images/travel-together-small.webp | USE | 편의 소개의 큰 비대칭 동행 장면. 가상 장면임을 caption/alt에 명시 |
| v3 images/harbor-closing-small.webp | USE | 마지막 CTA의 항구 배경. 밝은 글자·스크림·가상 장면 표기 |
| v3 images/travel-together.webp / harbor-closing.webp | KEEP AS SOURCE | 작은 파생 이미지로 현재 역할 충족, 원본 추가 다운로드 없음 |
| v3 images/garden-discovery.webp / garden-discovery-small.webp | REJECT | 실제 장소·편의정보의 근거로 생성 이미지를 쓰지 않음 |
| v3 images/journey-poster.webp / ocean-poster.webp | KEEP AS SOURCE | 현재 Intro fallback과 실제 날짜별 화면이 별도로 존재 |
| v3 video/journey-sequence.mp4 | REPLACE | 가상 일정/지도 대신 `public/media/wave-journey/`의 같은 Production 여행 기록 사용 |
| v3 preview/index.html / cinematic.css / cinematic.js / cinematic.mjs | KEEP AS SOURCE | 참고 구현만 보존. 현재 React 구조·접근성·번역 구조에 직접 구성 |
| v3 source/의 렌더러·글꼴·라이선스 | KEEP AS SOURCE | 필요 시 후속 렌더 근거. 전역 글꼴 교체나 예제 JS 실행 없음 |

신규 영상의 Git blob은 원본과 `5639387265a8f5cd275d5d03486eebb1f11c5d7d`로 동일하다. SHA-256: `960c26cac1a89d6b32c230ed3507d72be17926134aedc218a4c7a12cf64bd1d1`.

실제 관광지·추천·날짜·지도 장면은 기존 `wave-journey` 기록과 출처 표시를 유지한다. 생성 풍경을 한국관광공사 자산이나 경남의 실제 무장애 시설 검증으로 표현하지 않는다. 출처·촬영 시점은 장면의 접근 가능한 상세보기에서 확인한다.
