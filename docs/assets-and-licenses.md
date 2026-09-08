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
