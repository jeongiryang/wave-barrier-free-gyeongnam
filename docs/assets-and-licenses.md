# 이미지와 지도 자산

## 행정경계

- 원본: [StatGarten maps](https://github.com/statgarten/maps/blob/main/svg/simple/경상남도_시군구_경계.svg)
- 원자료: 통계청 SGIS, 2020년 행정구역 경계
- 배포자: StatGarten, MIT License
- 변형: 창원 5개 구를 한 선택 단위로 합침, SVG 경로 추출, 가장 큰 면의 중심 계산. 경계는 지역 선택용이며 측량·길찾기 자료가 아님.
- 저장: `features/landing/region-boundaries.ts` (런타임 GIS나 지도 API 키 불필요)

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
