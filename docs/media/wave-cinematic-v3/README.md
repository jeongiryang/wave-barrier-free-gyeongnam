# WAVE Cinematic v3 · 한화오션 녹화 기반 자체 제작 소재

2026-09-07 · Refs #353 #257 #259 #270

사용자 제공 한화오션 녹화에서 확인한 **여백 속 작은 영상 프레임→화면 폭 확장, 대형 사진과 짧은 문구, 단계별 대표 장면 교체**를 WAVE 전용 자산과 실행 가능한 적용 예제로 만들었다. 한화오션·카카오의 원본 사진/영상/코드/로고는 포함하지 않는다.

이 경로는 **소재 전달 패키지**다. `app/`, 기존 제품 기능, 인증, CI/CD, Production은 수정하지 않았다. 현재 실행 중인 에이전트는 #288의 소유권과 #334 안정화 순서를 확인하고 필요한 파일·패턴을 기존 소유 PR에 적용한다. 이 자산 브랜치 전체를 최신 제품 브랜치에 병합하지 않는다.

## 결과물

| 요소 | 파일 | 적용 위치·구도 |
| --- | --- | --- |
| 해안 히어로 | [hero-coast.webp](images/hero-coast.webp) | 1672×941. 왼쪽 제목/CTA, 오른쪽 해안·산책로. HTML 스크림 필요 |
| 화면 확장 | [ocean-expand.webp](images/ocean-expand.webp) | 1672×941. 왼쪽 해안, 오른쪽 메시지. 작은 창에서 전체 폭으로 확대 |
| 편의·동행 | [travel-together.webp](images/travel-together.webp) | 1672×941. 오른쪽 인물 구도. 사진/카피 비대칭 섹션 |
| 여행지 발견 | [garden-discovery.webp](images/garden-discovery.webp) | 1122×1402. 세로형 정원 장면, 대형 이미지/사진 패널 |
| 마무리 CTA | [harbor-closing.webp](images/harbor-closing.webp) | 1672×941. 왼쪽 제목, 오른쪽 항구의 따뜻한 조명 |
| 히어로 영상 | [hero-water-loop.mp4](video/hero-water-loop.mp4) | 8초·1280×720·24fps·무음. 생성 해안 이미지의 바다 영역만 변위/명암 애니메이션 |
| 바다 루프 | [ocean-surface-loop.mp4](video/ocean-surface-loop.mp4) | 8초·1280×720·24fps·무음. 수학적으로 생성한 파면/반사광, 추상적 대양 장면 |
| 일정→경로 | [journey-sequence.mp4](video/journey-sequence.mp4) | 12초·1280×720·24fps·무음. 날짜 선택→세 장소→순서 연결, 마지막 상태 유지 |
| 기능 정적 대체 | [journey-poster.webp](images/journey-poster.webp) | 위 영상의 마지막 상태 |
| 바다 정적 대체 | [ocean-poster.webp](images/ocean-poster.webp) | 절차적 바다 영상의 첫 프레임 |
| 웹 전환 예제 | [preview/index.html](preview/index.html) | 실제 DOM 카피/CTA, 프레임 확대, 단계 선택, 재생/정지, 동작 감소, 테마 전환 |

5종 사진에는 각각 `-small.webp` 변형이 있다. 이름의 `small`은 축소 해상도이며 별도 모바일 재구도 사진을 의미하지 않는다. 모바일 구도는 `object-position`, 실제 피사체 보존과 별도 세로 흐름으로 처리한다. 사진에는 제목/CTA를 합성하지 않았다.

## 미리보기

GitHub의 HTML 파일 보기는 웹 실행 화면이 아니다. 다운로드한 이 디렉터리에서 다음과 같이 실행한다.

```bash
python -m http.server 8765
# 브라우저: http://localhost:8765/preview/
```

기본 화면에는 포스터를 표시한다. 단계 버튼으로 날짜/일정/이동을 바꾸거나 `과정 재생`을 누르면 Canvas 장면이 움직인다. `바다 영상 재생`을 누른 경우에만 MP4 source를 연결한다. `동작 줄이기`와 OS 감소 설정, 데이터 절약 설정에서는 영상을 불러오지 않는다. 위쪽 확장 장면은 영상 재생 없이도 스크롤에 따라 프레임 크기가 바뀐다.

## 구현 담당자가 가져갈 소스

- [preview/cinematic.css](preview/cinematic.css): 큰 사진·여백·반응형·프레임 확대 레이아웃. 기존 Deep Ocean 색상값을 사용한 독립 시안이며, 통합 시 기존 토큰/클래스 체계에 맞춘다. 전역 CSS를 제품에 통째로 import하지 않는다.
- [preview/cinematic.mjs](preview/cinematic.mjs): 스크롤 프레임 업데이트, 수동 단계/재생, 미디어 지연 연결·정지·실패 대체·환경설정 처리. 기존 React effect 안에 옮길 때 이벤트/observer/RAF의 해제 및 Strict Mode 재실행을 검증한다.
- [source/journey-scene.mjs](source/journey-scene.mjs): `drawJourney(ctx, progress, {font, images})`. 0..1 진행률로 같은 날짜/장소 상태를 그리는 공용 원본. Node 렌더와 브라우저 예제가 함께 사용한다.
- [source/render-journey.mjs](source/render-journey.mjs): 위 장면을 MP4와 포스터로 다시 렌더링한다.
- [source/render-ocean.py](source/render-ocean.py): 파면 법선·빛 반사로 매 프레임 바다를 계산한다. 영상/사진 입력 없이 제작했다.
- [source/render-coast.py](source/render-coast.py): 생성 해안 사진의 해안/하늘을 고정하고 바다 영역만 애니메이션 처리한다.
- [source/build-preview.py](source/build-preview.py): 소스 모듈을 의존성 없는 `preview/cinematic.js`로 묶는다. 코드 수정 후 다시 실행한다.
- [PROMPTS.md](PROMPTS.md): 내장 이미지 생성으로 만든 5종의 실제 프롬프트.
- [manifest.json](manifest.json): 파일별 byte 크기와 SHA-256, 제작/표현 범위.

## 생산·사용 범위

**이미지:** 내장 이미지 생성으로 제작한 사진풍 가상 장면. 실제 경남 관광지의 이름/좌표/시설 안내에 증거 사진으로 붙이지 않는다. 여행지 추천 기능에서 실제 장소를 표시할 때는 해당 장소의 적법한 실제 사진으로 바꾼다. 브랜드 소개에 사용할 경우 가상 콘셉트라는 사실을 알아볼 수 있는 설명을 유지한다.

**영상:** 직접 작성한 Python/Canvas/FFmpeg 소스로 제작했다. 실사 촬영, 드론 촬영, 영상 생성 모델의 결과물이 아니다. 히어로는 이미지 기반 수면 애니메이션이고 바다는 절차적 렌더링이다. 한화오션 영상과 같은 실제 파도·항해 촬영 품질을 달성했다고 주장하지 않는다. 영상 분위기와 웹 연출을 함께 활용하는 소스이며, 인물의 실제 이동 영상은 포함하지 않는다.

**기능 장면:** UI 녹화나 실제 지도/경로 데이터가 아닌 설명용 도식. 샘플 날짜 `12일`, 장소 1/2/3과 곡선 연결을 사용한다. 이를 실제 경남 경계·추천/길찾기 성공 화면으로 표현하지 않는다. 최종 제품 소개에는 검증한 실제 UI/데이터 계약과 연결하고 문구를 정합화한다.

**폰트:** 미리보기용 Noto Sans KR 부분집합은 [Google Fonts 원본](https://github.com/google/fonts/tree/main/ofl/notosanskr)에서 가져왔다. [OFL](source/OFL-NotoSansKR.txt)을 함께 보존한다. 사진/영상에는 외부 브랜드 로고나 음원은 없다. 추가 유료 API·영상 크레딧을 사용하지 않았다.

## 재렌더링

Python: NumPy, SciPy, Pillow; Node: `@napi-rs/canvas`; 시스템: FFmpeg. 제작 도구 의존성을 WAVE 런타임 의존성에 추가하지 않는다.

```bash
python source/render-ocean.py
python source/render-coast.py
WAVE_FONT_PATH=/path/to/licensed-static-korean-font.ttf node source/render-journey.mjs
python source/build-preview.py
```

바다/히어로는 8초 주기의 수학적 루프다. 마지막 프레임은 8초 바로 전 프레임이며 첫 프레임을 중복 삽입하지 않는다. 일정 영상은 9초에 완성되고 3초간 최종 상태를 유지한다. 자동 반복을 기본으로 하지 않는다.

## 적용·검수 조건

1. 자료 제작→코드 통합→Preview→Production을 별도 상태로 기록한다. 이 패키지 업로드만으로 #353을 닫지 않는다.
2. 신규 자산은 선택한 것만 `public/`의 기존 미디어 관리 경로에 옮기고, 배치표·출처 원장·번들/자산 예산에 등록한다. 모든 영상을 초기 다운로드하지 않는다.
3. 대표 프레임 확장 1개와 날짜→일정→동일 장소 연결 장면을 먼저 적용한다. 모든 섹션에 강제 100vh나 sticky를 반복하지 않는다.
4. 인트로 시청·영상 로딩으로 CTA를 잠그지 않는다. HTML 제목/본문/링크는 영상에 종속하지 않는다.
5. 320/390px에서는 큰 이미지와 세로 설명으로 재구성한다. 작은 Canvas 글씨에 정보 접근을 의존하지 않는다. 예제의 별도 모바일 단계 설명을 유지/개선한다.
6. 키보드, 200% 확대, KO/EN, 두 테마, reduced-motion, 데이터 절약, 오프라인/영상 실패/재생 거부를 검증한다.
7. 실제 브라우저의 확장 전/중/후 캡처와 정/역방향 스크롤·기능 시연 녹화를 PR에 첨부한다. MP4 렌더 파일은 브라우저 검증 녹화가 아니다.
8. 기존 기능/관광 데이터/지도/저장/인증을 변경하지 않고 통합한다. 카카오 로그인·클라우드 저장을 출시 기능처럼 추가 홍보하지 않는다.

## 검증 상태

파일 규격·디코딩·대표 영상 프레임·원본 이미지·스크립트 문법과 참조 경로는 제작 환경에서 검사한다. 실제 결과는 [VALIDATION.md](VALIDATION.md)에 기록한다.

**브라우저의 로컬 HTTP/파일 열기가 보안 정책에 의해 차단되어 이 예제의 실제 스크롤·키보드·모바일 DOM 검증은 미완료다.** 차단을 우회하지 않았다. Preview와 Production의 기능/접근성/성능 통합 검증도 미완료이며 담당 에이전트가 실제 사이트 환경에서 확인해야 한다.
