# 소개 페이지 실제 지역 경계 연결 — #258

- 담당: 위임된 Engineering/QA, ChatGPT 구독 세션. 사람 리뷰·배포/Release GO는 별도다.
- 브랜치: `fix/landing-region-boundaries`, 부모 #320 `bfeda5f54206a66d7d97ae1532df5854760ecc00`.
- 원격 main 재확인: `34e6021265b16d046dca24feaa3ec2101fc977e2`. 부모와 다른 작업자의 변경을 보존했다.
- 상태: 로컬 검증 완료, CI·사람 리뷰 대기. 미병합·미배포이며 #258을 닫지 않는다.

## 변경과 근거

기존 가상 600×433 도형과 HTML 표식 좌표를, 플래너가 이미 사용하던 SGIS 2020 경계 18개로 교체했다.
대한민국 17개 시도 실루엣에서 경남을 강조하고 출처·연도를 표시한다. 원본·MIT·변형·재생성 방법은
[자산 문서](../assets-and-licenses.md)에 연결했다. 최신 2025 경계를 적용했다고 주장하지 않는다.
별도 SDK·키·GIS 의존성·모델 API·유료 자원을 추가하지 않는다.

경계 면적은 포인터로 선택하고, 44px 이상 지역 목록은 터치·키보드 대안이다. 두 표현은 같은 지역 ID,
선택 상태, 이야기/사진과 `/planner?region=...` 링크를 사용한다. 한·영 지역명과 영어 원문 사진 안내를 제공한다.
작은 화면에 18개 이름을 지도 위에 겹쳐 놓지 않는다. 선택/미리보기 지역만 지도에 표시한다.
전국 이미지 실패나 경계 모듈 실패에서도 목록·지역 설명·여행 시작 링크를 유지한다.

경계 코드는 섹션에 가까워질 때만 읽는다. 지역명 사전을 순수 모듈로 분리해 첫 화면이 경계 모듈까지
불러오던 의존성을 없앴다. 기존 GyeongnamRegionPicker의 사전 export는 호환성을 위해 보존했다.
스크롤을 가두는 확대 애니메이션 대신 대한민국 위치 → 실제 경남 경계를 정적으로 연결한다.

## 실패 재현과 수정

- 기존 화면은 실제 경계 18개 검사가 desktop/mobile 모두 FAIL이었다.
- 호버 미리보기 높이가 늘면서 가운데 정렬된 왼쪽 설명이 이동했고, Chromium scroll anchoring이
  `scrollY=1713↔1812`처럼 99px씩 왕복했다. 그 사이 클릭 대상이 경계를 벗어났다. 두 열을 위쪽 정렬해
  레이아웃 원인을 수정했다. 포인터 좌표를 다시 찾아 클릭하도록 테스트를 회피하지 않았다.
- 새 위치 assertion의 첫 6 FAIL은 SVG 강조선의 외곽까지 포함한 Playwright boundingBox를 측정한 오류였다.
  실제 fill geometry의 getBoundingClientRect로 측정하고 1px 기준·preview·click·aria-pressed assertion을 유지했다.
- 기존 compact 시각 테스트는 첫 스크롤 전에 서버 DOM만 확인했고 초기 mount와 겹쳐 detach가 발생했다.
  기존 motion-ready 효과 설치를 추가 assertion으로 확인한 뒤 같은 5개 폭·키보드·대비·axe 검사를 수행한다.
  theme 테스트의 임의 1500ms 대기도 실제 data-theme 일치 assertion으로 바꿨다. timeout을 늘리지 않았다.
- 전국 이미지에 hidden 속성만 쓰던 첫 구현은 CSS와 초기 hydration 이전 실패에 취약했다. 실패 상태와
  이미 실패한 이미지의 complete/naturalWidth 확인으로 텍스트 대안을 렌더링한다.
- 이전 fake 좌표·도형 비율 검사는 실제 경계 viewBox/18개 동일 ID·위치 관계·선택 동기화로 변경했다.
  테스트 삭제·skip·assertion 제거로 실패를 숨기지 않는다. 실패 로그·trace·스크린샷을 TEMP에 보존했다.

## 검증

- `npm run lint`, `npm run typecheck`, `npm test`: PASS, 단위/계약 282/282, skip0.
- `npm run build:vercel`, `npm run check:performance`: PASS.
  gzip CSS68.95/70, 첫 랜딩 JS114.96/155, 플래너 JS264.51/270KiB. 실제 Web Vitals 완료를 뜻하지 않는다.
- `npm audit`: exit1, 기존 개발 의존성 high2/moderate1. 의존성 변경은 이 PR에 없으며 #309 미포함 원본 상태다.
  #309를 포함한 통합8e33414의 audit0과 구분하고, 새 지도 합성 뒤에도 다시 검사한다.
- 경계·compact desktop/mobile 3회 반복: 54/54 PASS(1.4분).
- 경계·compact·지역·theme 대비·performance 관련 회귀: 34/34 PASS(42.2초).
- 첫 전체 Playwright/axe: 263 PASS/기존skip1/2 FAIL(5.7분). 캘린더 테스트의 고정4173 URL과 격리 서버4203이 달랐다.
  통합 후보에 이미 있는 a62886a의 baseURL 검증 방식을 재사용했다. 파일 URL·날짜·시간대 assertion을 모두 유지했다.
  수정 후 관련4/4(5.3초), 전체265 PASS/기존skip1/실패0(5.7분). 최종 lint/typecheck도 다시 통과했다.
- 별도 390/1366px 브라우저: 각각 18개 touchscreen.tap 선택, 동일 경계/링크, 오류0·가로 overflow0.
  이 검사는 정상 빈 사진 fixture이며 실제 API 성공 증거가 아니다. 그 전에 로컬 키 미설정 사진 API의
  18개503을 확인했고, 지역 선택18개와 overflow0은 유지됐지만 console-error 검사는 FAIL이었다.
  사진 API 오류를 200으로 바꾸거나 성공으로 보고하지 않았다. Production 호출 검증은 별도다.
- 실제 viewport 캡처를 렌더링 이후 직접 검토했다. 모바일 이름 겹침·영어 버튼 내부 overflow를 고쳤고,
  1366px의 대한민국 위치/경남 형태/설명/CTA, 390px의 카드와 단일 열 흐름을 확인했다.

## 다음 검증 경계

전체 로컬·CI 결과를 현재 HEAD와 연결한 뒤 리뷰를 요청한다. 통합 후보에 합친 뒤 전체 검사와 성능 예산을
다시 실행한다. 부모 병합 후 최신 main/diff/CI/필수 승인을 재확인한다. Preview·Production·실물 기기·낭독기
검증은 아직 없으므로 이슈와 최종 릴리스 Gate는 열어 둔다.
