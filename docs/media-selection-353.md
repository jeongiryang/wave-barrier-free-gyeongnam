# #353 전체 화면 Intro / Landing 미디어 선택

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
