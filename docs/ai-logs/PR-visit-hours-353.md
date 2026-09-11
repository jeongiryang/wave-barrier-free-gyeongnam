# 이용시간과 방문 일정

- PR: 생성 전
- 작성자: jeongiryang의 승인 범위를 수행한 Codex
- 최종 상태: 구현 및 필요한 검증 진행 중
- AI 도구: Codex, 기존 로컬 Playwright 및 독립 QA

## 목적

후보1. 일정의 예상 도착과 체류 종료를 한국관광공사에 등록된 이용시간·휴무·입장 마감·행사 기간과 비교한다. 장소 상세 또는 일정의 접힌 ‘이용시간 확인’을 사용자가 열 때만 조회한다. 조건이 분명한 단일 운영시간·정기 휴무에 한해 시간대 일치/충돌을 표시하고, 계절별·공휴일 예외·복수시간·심야 운영은 원문과 확인 필요를 남긴다. 실제 당일 개방·예약 가능성·의학적 안전 보장으로 표시하지 않는다.

## 구현과 근거

공식 `KorService2/detailIntro2` 명세(https://www.data.go.kr/data/15101578/openapi.do)의 콘텐츠 유형별 필드로 매핑한다. 축제 `usetimefestival`은 요금, 숙박 체크인/아웃은 별도 시간이다. 서버는 공개ID만 받으며 `detailCommon2`의 정확한ID/경남 법정동 시도코드 lDongRegnCd=48/좌표/유형을 검증한 뒤 소개정보를 조회한다. 최대2회, 자동 재시도·전체 일정 fan-out없음. 부분/실패/미등록/위치미확인 구분. 사용자 일정 시각·날짜·좌표·프로필은 전송하지 않으며 브라우저에서 비교한다. KTO 데이터 DB·아카이브·공유 복제없음. 브라우저15분100항목/dedupe 및 기존 정상HTTP캐시, 원래조회시각 유지.

기존 Horizon `place-evidence`·`modal-data` 컴포넌트 스타일을 재사용해 별도 전역 CSS를 추가하지 않는다. 하루 시작/체류시간/날짜 변경 시 추가 호출 없이 비교가 바뀌고 기존 시간 수정/순서/다른 날짜 이동으로 조정할 수 있다. `/guide#visit-hours`에 사용법을 추가한다.

## 검증

- 의미 있는 로직/제공처 경계10개 PASS: 정확한 입장·종료 경계, 정기휴일/행사일, 모호한 시간/휴무, 다음날/잘못된 날짜, ID/type/경남위치 검증, 제공처 부분/실패/빈응답, 축제요금/숙박 구분.
- 첫 테스트에서 ‘월요일’의 ‘일’을 일요일로도 인식하는 결함을 찾아 요일 접미사를 제거한 정확한 요일 목록으로 보정했다.
- 신규 이용시간4개 및 기존 체류시간4개 브라우저 PASS. 미조회0→명시조회1, 일정 수정/다시열기 동일1회, 명시 재시도, 조건부 원문,1440/960/390/320·axe·overflow0. 제공처/계정/공유 응답은 fixture, 실데이터 쓰기없음.
- 타입 검사 PASS. 나머지 필수 검사·독립 QA·CI·Production은 후속 기록한다.

## 역할과 제한

Owner가 기능 후보 전체 구현/병합/배포를 승인했다. AI가 현재 단위의 구현과 필요한 검증·GitHub 처리를 수행한다. 전체 조작 검수, 회귀 분석/리팩토링, 제출 전 점검은 최신 Owner 지시로 다음 작업에 보류한다. 다른 후보8/13 등은 별도로 이어서 구현하며 이 PR에 구현됐다고 표시하지 않는다. 비용 발생·개인 메시지·최종 제출은 수행하지 않는다.

## 최종 제한 검증 — 2026-09-11

- 공식 공통정보조회에서 `areacode`는 삭제예정 필드이며 `lDongRegnCd`가 법정동 시도코드임을 직접 확인했다. 경남48만 허용하고, 구코드38만 있거나 다른 법정동 코드인 경우 소개정보 조회를 하지 않는다.
- 두 제공처 요청은 같은17.5초 예산을 공유하며 브라우저20초 안에 끝난다. 요청 병합으로 취소 신호가 공유되지 않는 경우도 응답 예산을 적용했다. 무응답 경계 포함 관련 단위21개 PASS.
- 최신 main #478 (`7a046a7`) 정상 merge 후 `npm run typecheck`, `npm run lint`, `npm test` (821/821), `npm run build:vercel` PASS. 기존 lint 경고12개, 새 오류0. `npm run check:performance` PASS: CSS69.88/70KiB, Planner177.02/270KiB. 별도 CSS 및 예산 상향 없음.
- 변경 기능 및 체류시간 연계 브라우저8/8 PASS. 1440/960/390/320 독립 QA에서 오류·재시도·접기/키보드·상세·체류시간·휴무일 변경, 미등록/조건부정보 PASS. 기본 테마 axe/overflow/pageerror0.
- 독립 QA의 개발용 dark 경고색 대비 지적을 공통 `--ink`로 수정하고 대비13.77:1 및 axe0 재확인. 일반 상세에서는 일정 비교 문구를 제거하고 공식 이용정보임을 표시한다. 같은 공개기록 재사용/추가조회없음/Escape초점 복귀 PASS.
- React 체크: 상세 컴포넌트 lazy 분리, 명시적 펼치기만 조회, pending dedupe·bounded memory cache, 원본시각 보존, unmount 이후 state 쓰기 차단, 일정 변경은 파생 계산. 기존 React/CSS 도구 재사용.
- 증거: `D:/wave-completion-20260911/visit-hours-merged-quality.txt`, `visit-hours-merged-browser.txt`, `visit-hours-qa-ui.json`, `visit-hours-qa-final.json` 및 화면 PNG. 외부 제공처/개인 계정 쓰기 없이 fixture로 검증했다. PR/CI/실제 Production 결과는 병합 후 기록한다.

## Hosted CI 후속

PR #480 CI34590147591에서 `.place-evidence` 스타일 재사용으로 기존 영문 편의 근거 검사2개의 locator가 두 details를 잡았다. source/time/method라는 고유 summary로 해당 출처 상자를 한정했다. 기대 문구·strict 모드·키보드·axe·테마·timeout/retry는 유지한다. 관련 브라우저16/16 PASS 및 독립 코드 QA PASS. 후속 typecheck/lint/unit821/build/performance PASS. 새 HEAD CI로 재검증하며 이전 실패를 우회하지 않는다.
