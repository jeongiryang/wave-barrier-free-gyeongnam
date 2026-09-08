# 이미지와 지도 자산

## 행정경계

- 원본: [StatGarten maps](https://github.com/statgarten/maps/blob/main/svg/simple/경상남도_시군구_경계.svg)
- 원자료: 통계청 SGIS, 2020년 행정구역 경계
- 배포자: StatGarten, MIT License
- 변형: 창원 5개 구를 한 선택 단위로 합침, SVG 경로 추출, 가장 큰 면의 중심 계산. 경계는 지역 선택용이며 측량·길찾기 자료가 아님.
- 저장: `features/landing/region-boundaries.ts` (런타임 GIS나 지도 API 키 불필요)

### 소개 페이지 연결 (#258)

2026-09-06에 [배포자의 소스와 MIT](https://github.com/statgarten/maps/tree/d5f8ea3208f19a73a01f865847d20cc195ae91ba)를 다시 확인했다. 기존 시·군 경계를 소개 페이지에도 재사용하며, 대한민국 위치 안내는 같은 commit의 `svg/simple/전국_시도_경계.svg`에서 17개 path만 추출한 `public/maps/korea-sgis-2020.svg`다. 색상·경남 외곽선을 바꿨고 script/외부 참조/이벤트 속성은 복사하지 않았다.

- 재생성: `python scripts/build-region-overview.py`. 선택적으로 원본을 내려받는 개발 작업이며 앱/CI build가 실행하지 않는다.
- 시·군 도형은 지역 섹션이 화면에 가까워질 때 불러온다. 도형 모듈이나 대한민국 이미지가 실패해도 18개 지역 목록, 지역 설명과 플래너 링크를 사용할 수 있다.
- 표시는 **SGIS 2020** 기준을 명시한다. [공공데이터포털의 2025 경계 자료](https://www.data.go.kr/data/15129688/fileData.do)는 무료·이용허락범위 제한 없음으로 확인했으나 현재 자산에 적용한 것이 아니다. 2020 경계를 최신 경계나 측량·내비게이션 정보로 표시하지 않는다.
- 한국어·영어 지역명은 같은 내부 지역 ID를 사용한다. 사진 제목·소재지는 제공된 한국어 원문임을 영어 화면에 표시하며, 사진은 접근 가능한 시설의 증거로 사용하지 않는다.

### 배포 라이선스

```text
MIT License

Copyright (c) 2022 StatGarten

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 사진·시연

실제 장소 사진은 한국관광공사 API 실호출을 통해 제공하며 출처·촬영자 정보를 유지합니다. 관광사진은 시설 접근성의 증거로 쓰지 않습니다. 캘린더·시설·이동 시연은 자체 작성 SVG/CSS이며 실제 시설이나 현재 경로로 표시하지 않습니다. 외부 기업의 이미지·영상·로고는 복제하지 않습니다.

### #353 상상 풍경과 미디어

Owner가 제작을 지시한 v3 자산의 확정 커밋 `d908bd9de2f484a8ef5c1f6fab3441c33f96bf88`에서 아래 파일만 선별했다. Git blob hash와 크기를 검증해 `public/media/wave-story/`에 복사했다. 해당 브랜치의 HTML/CSS/JS 예제나 렌더러를 앱에 적용하지 않았다.

| 파일 | 바이트 | 사용 |
| --- | ---: | --- |
| hero-coast.webp | 301256 | 큰 화면의 해안 배경 |
| hero-coast-small.webp | 51378 | 작은 화면의 배경·여정 설명 |
| travel-together-small.webp | 46122 | 동행하는 여행의 설명 그림 |
| harbor-closing-small.webp | 23286 | 여정 설명 그림 |
| hero-water-loop.mp4 | 621924 | 사용자가 재생할 때 요청하는 8초 무음 풍경 |
| ocean-expand-small.webp | 91608 | 스크롤 확장 장면의 작은 이미지 |
| ocean-expand.webp | 451372 | 같은 확장 장면의 큰 화면 이미지 |

이는 AI로 제작한 **가상 풍경**으로 특정 경남 관광지·보행로·편의시설을 촬영하거나 조사한 기록이 아니다. 화면에도 이를 표시한다. 실제 관광정보·공식 사진·시설 판단의 근거와 분리하며 한국관광공사의 자산으로 표기하지 않는다. 원 제작 설명은 [v3 README](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/blob/d908bd9de2f484a8ef5c1f6fab3441c33f96bf88/docs/media/wave-cinematic-v3/README.md)에 보존한다.

영상에는 음성이나 본문 정보가 없다. 첫 화면은 정적 이미지와 HTML 설명으로 완성되고, 재생 버튼을 누르기 전 MP4 요청은 0건이다. 동작 감소 전환·다른 탭·화면 밖 이동 때 일시정지하며 자동 재개하지 않는다. 이미지·영상 실패 때도 설명과 플래너 링크를 사용할 수 있다. 작은 파생 이미지에는 고정 크기와 lazy loading을 적용했다.

프레임 확대는 MP4가 아니라 웹 레이아웃의 스크롤 연출이다. 작은 화면과 동작 감소에서는 최종 정적 장면을 사용하고, JS 실행 전에도 설명과 CTA가 보인다. 별도의 인트로 캔버스는 기존 W.A.V.E 자체 렌더러이며 처음 방문할 때마다 파도→접근성 형상→워드마크를 보이고 4.8초 내에 정지한다. 재생/스킵 대기 화면이나 저장값에 따른 영구 차단은 없다. 환경설정의 인트로 다시보기로 다시 표시할 수 있다.
