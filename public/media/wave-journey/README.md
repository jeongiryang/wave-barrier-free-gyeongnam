# 실제 W.A.V.E 여행 화면

실제 공개 Production 화면을 정수 영역으로 자른 무손실 WebP입니다. UI 내용·시설 상태·날짜·워터마크를 합성하거나 변경하지 않았습니다. **원본 촬영 당시 배포와 이 파일을 사용하는 소개 UI의 배포 상태를 구분합니다.** 현재 새 날짜·지도3상태 소개는 로컬 미커밋 구현이며 Production 검증은 아직 없습니다.

## 같은 세션의 날짜·일정·지도 — 새 로컬 소개 자산6개

원본은 canonical Production `eab2442f90b72441fd311db13dd8bb935723527f`, 배포 `dpl_GVGVzh2TahHEDKDJHUp6vCN9FaGJ`의 비회원 공개 세션입니다. 촬영 범위는2026-09-09 06:55:25.855–06:58:13.668 KST입니다. 한 번의 창원 검색에서 주남126117 다음 대산2758443을 담고, 대산만9월10일로 옮겼습니다. [timeline-manifest.json](timeline-manifest.json)에 각 촬영 시각·원본 SHA·crop·파일 SHA·날짜/ID/순위·뷰포트·출처를 보존합니다. 6개 총978,798 bytes이며 원본 crop과 픽셀 동일한 무손실 변환으로 기록했습니다.

| 촬영 상태 | 일정 / 지도 파일 | 실제 장소·순위 |
|---|---|---|
| 변경 전9월9일 | `timeline-before-itinerary.webp` / `timeline-before-map.webp` | 주남126117 1번 → 대산2758443 2번 |
| 변경 후9월9일 | `timeline-after-day1-itinerary.webp` / `timeline-after-day1-map.webp` | 주남126117 1번 |
| 변경 후9월10일 | `timeline-after-day2-itinerary.webp` / `timeline-after-day2-map.webp` | 대산2758443 1번 |

이6개는 같은 공개 세션의 실제 기록을 선택해서 보는 소개 자료입니다. 새 live planner나 시설 갱신일의 증거가 아닙니다. 원본 지도는 실제 Kakao SDK/날짜별 사진·순위 표지를 확인한 화면이며, 모든 혼합 경로 요청은 ODsay hold 때문에 전달 전에 차단했습니다. 표시된 시간은 직선거리 추정이고 실제 길찾기 성공이 아닙니다. 큰 원본 촬영 viewport1366×1800/2000과 일반1366×900/390×844 조작 검수는 구분합니다.

## 이전9caca 공개 화면7개 — 원본과 이력 보존

`manifest.json`의7개는2026-09-09 KST canonical Production `9caca69fd5db24ed0bc741ad68ffef0d00ffe3ee`에서 촬영한 이전 자료입니다. 개별 크기·해시·촬영 시각은 [manifest.json](manifest.json)을 따르며 새 eab 확인 시각으로 바꾸지 않습니다.

- `map-matching-itinerary`와 `map-two-desktop`는 같은03:08 기록의9월9일 일정, 주남저수지126117 → 대산플라워랜드2758443 순서입니다.
- `date-before`와 `date-after`는 별도02:29 기록의 날짜 이동 전후입니다. 변경 전 대산→주남, 변경 후 대산9/10·주남9/9입니다. 앞의 지도나 새 eab 자료와 한 번의 연속 실행으로 제시하지 않습니다.
- 장소/사진/편의 근거는 당시 조회 기록입니다. 대산 자료 조회02:26:57은 시설 갱신일이 아니며, 새 eab 타임라인이 이 편의정보를 다시 upstream 조회·검증했다는 뜻이 아닙니다.

## 출처와 실제 검증 범위

- 장소·사진·편의정보 출처: ⓒ한국관광공사 / 한국관광콘텐츠랩. 공식 기재 내용과 W.A.V.E 조건별 판단을 구분하며 접근성 인증/현장 안전을 보증하지 않습니다. 원본 워터마크·제공자 표시를 유지합니다.
- 지도 출처: Kakao. 로고·축척·제공자 표시를 유지합니다. 검증 도구가 앱의 자동 경로 시도를 전송 전에 차단했으며, 사진 표지/직선 미리보기는 실제 경로 제공처 성공 증거가 아닙니다.
- 촬영 상태는 실시간 응답이 아닙니다. 최신 정보는 실제 플래너에서 확인하고 영어 화면에서도 한국어 원본임을 안내합니다. 사진·지도에 대한 새 소유권/이용허락을 주장하지 않습니다.

이전 [9caca 지도·날짜 QA](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/347#issuecomment-5589728501)의 모바일 표지 가림과 [첫 소개 배포 기록](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/353#issuecomment-5589377534)은 역사적 원본으로 보존합니다. 후속#378 eab의 [독립 Production 검증 범위](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/353#issuecomment-5592520788)에서는 실제 Kakao 날짜별 사진/순위 표지를1366×900·390×844에서 확인했고 날짜 왕복 때 toolbar 가림·넘침·uncaught pageerror가 없었습니다. **옛 가림을 계속 미해결이라고 쓰지 않되, 옛 사진이 수정의 증거라고 하지도 않습니다.** 이 결과는 새 Leaflet fallback 재검수나 모든 경로/제공처 PASS가 아닙니다.

현재 코드/새 로컬 소개/최종 제출의 상태는 [실행 기록](../../../docs/launch-readiness-status.md)을 따릅니다. 새 웹 자산6개를 등록한 사실만으로 공식 부분 PPTX의18/26 반영·8대기가 바뀌거나 최종 제출이 완료되지는 않습니다.
