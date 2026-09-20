# 기능 45 AI 작업 로그 — 쓰레기통 위치 편의지도 레이어

## 목적과 범위

기존 편의 표시 패널에 독립 복수선택 `쓰레기통` 레이어를 추가했다. 사용자가 레이어를 켠 뒤에만 공개 관광지 `contentId`로 서버에 요청하며, KTO의 공식 경남 장소·공개 좌표를 다시 확인한다. 사용자 GPS 좌표·정확도·이동 이력은 요청, URL, 캐시, 로그, 저장소에 넣지 않는다.

## 데이터 검증과 운영 연결

- 공공데이터포털 검색에서 광주 광산구 데이터(91행, 좌표 있음)와 대구 달서구 데이터(9행)를 확인했지만 경남 표본은 모두 0건이다.
- 이 작업 환경에서는 경남 위경도 표본을 가진 단일 공식 API와 승인 키를 확인하지 못했다. 실제 호출을 성공으로 기록하지 않는다.
- 사용자 지시에 따라 승인을 기다리지 않고 공식 JSON 계약을 구현했다. 운영자는 `WASTE_BIN_API_URL`에 승인된 경남 지자체 HTTPS JSON endpoint를, `WASTE_BIN_API_SOURCE`에 정확한 데이터셋 이름을 설정한다. 인증은 기존 `TOUR_API_SERVICE_KEY_ENCODED`를 재사용한다.
- 파서는 공공데이터포털 응답 봉투와 지자체의 한국어/영어 공개 필드명을 정규화하지만, 좌표·기준일·경남 근거가 없는 행은 제외한다. 주소 지오코딩과 위치 하드코딩은 없다.

## 구현

- `server/tourism/trash-bin.ts`: 쿼리 allowlist, 숫자 `contentId`, KTO 경남 장소 재검증, 공식 제공처 요청, 성공 전용 bounded FIFO 캐시, available/empty/invalid-request/provider-error/location-unconfirmed 상태.
- `lib/trash-bin.js`: 좌표·경남·기준일 검증, 중복 제거, 직선거리 정렬, 최대15개.
- 편의 표시 패널: 제공처 종류·위치 설명·여행지 기준 직선거리·기준일·제공처, 설치 여부 미확인 문구, 오류/빈/좌표 미확인 문구와 재시도.
- 지도: 44px 조작 영역을 유지한 28px 사각 시각 핀. 도착지 선택은 제공하지 않는다.
- 전체 마커가 60개를 넘으면 쓰레기통을 먼저 줄여 다른 레이어 결과를 보존한다.
- 장소 변경·패널 닫기·레이어 끄기에서 진행 중 요청을 취소한다.

## 검증 구분

- 합성 fixture: 정규화, 좌표 없는 행 제외, 거리 정렬/15개 상한, 개인정보 필드 부재, 상태 판별, 60개 상한 우선순위, UI 메타데이터, 공존, 44px, axe, 390/960/1440px.
- 실제 제공처: 승인된 경남 endpoint가 없어 실행하지 못했다. 운영 연결 뒤 데이터셋 이름·경남 표본 건수·필드·기준일을 다시 기록해야 한다.
- 새 유료 API, 지오코딩, 저장, 배포는 추가하지 않았다.

## 실행 결과

- `npm run lint` 통과(오류 0, 기존 경고 14).
- `npm run typecheck` 통과.
- Python bundled runtime을 PATH에 둔 `npm test` 1,510건 통과.
- `npm run build:vercel` 통과.
- `npm run check:performance` 통과: CSS gzip 68.97KiB/70KiB, 플래너 초기 JS 223.86KiB/270KiB. 새 CSS는 기존 파일 안 2줄이며 예산을 넘지 않았다.
- 독립 개발 서버와 단일 worker로 `npx playwright test e2e/trash-bin.spec.ts --workers=1` 10건 통과(desktop/mobile 각 5). 390/960/1440px, 44px 조작 영역, 작은 내부 도형, axe 0건을 포함한다.
- 첫 e2e 실행은 다른 worktree의 4173 서버를 재사용해 새 버튼이 없는 코드로 실패했고, 두 번째 병렬 실행은 Vite `nitro` 환경 초기화 오류로 실패했다. 현재 worktree의 독립 4196 서버에서 단일 worker 재실행해 모두 통과했다. 제품 assertion이나 timeout은 완화하지 않았다.
