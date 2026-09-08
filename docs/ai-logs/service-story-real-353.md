# #353 실제 여행 화면 연결 — 진행 중

기준: `81b88e4f6bf69c4811d458fbe2639a87e885a84b` 이후의 `feat/service-story-real-353`.
관련 Issue는 #353 및 실제 지도 표지 가림을 기록한 #347이다. #375의 정상 첫 방문 인트로·큰 Hero·스크롤 프레임 확장·명시적 영상 재생은 보존한다. #21의 일반 모션 약화는 Owner 비채택이며 OS/앱 감소 모드의 정적 대안은 계속 유지한다.

## 실제 변화

- 가상 세 장소·고정 17일 달력·순서 SVG를 실제 창원 공개 화면으로 바꾼다. 주남저수지126117→대산플라워랜드2758443, 2026-09-09 일정과 지도는 동일 촬영의 장소·순서다. 네 단계 버튼·초점·이름·polite 안내와 일반 모션은 유지한다.
- 편의 선택과 공식 시설 근거, 확인·미확인 상태는 펼쳐 읽는 별도 정보에 둔다. 별도 촬영의 날짜 변경 전후는 기본 지도와 연결된 상태로 오인하지 않도록 접힌 시연으로 분리한다. 이 소개 버튼이 실제 사용자의 여행을 저장·수정하거나 API를 조회하지 않는다.
- 관광사진 워터마크, 카카오 로고·축척, 시설 원문·조회 시각을 변경하지 않은 실제 캡처7개, 549,350bytes를 선별한다. [원본·권리·상태 원장](../../public/media/wave-journey/README.md), [개별 해시](../../public/media/wave-journey/manifest.json). 촬영 당시 Production9caca의 기록이며 실시간 결과나 경로 성공이 아니다.
- 이미지가 실패해도 비율과 공간을 유지하고 읽을 수 있는 오류 안내·장소 이름·플래너 링크를 남긴다. 새 영상 자동재생·SDK·의존성을 추가하지 않는다.
- 큰 이미지 옆 설명이 수직 중앙에 밀려나던 로컬 시각 문제를 시작점 정렬로 고쳤다. 데스크톱 설명은 이동 중에도 보이며 상세를 펼치거나 모바일에서는 정상 문서 흐름을 따른다.
- 지역 선택 안내와 시연 문서를 실제 필요한 편의 중심 문구로 맞춘다. 옛 사람 유형 명칭 두 개 대신 확인된 선택지 ‘접근로와 승강기’1개를 사용한다.

## 지도 표지 가림 P2

[실제 Production 재현](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/347#issuecomment-5589728501)에서 날짜를 옮긴 뒤 사진 표지가 도구막대에 가렸고 390px 사진 일부가 캔버스 밖으로 잘렸다. 원본 실패 캡처를 보존한다.

Kakao 기본 bounds 여백과 Leaflet 고정46px는 도구막대·사진의 실제 크기를 반영하지 않았다. SDK별 원래 장소 bounds를 유지하는 callback으로, 도구막대·연결 상태·사진과 번호표의 실제 DOM 크기를 여백에 반영한다. 기존 relayout 처리를 확장해 화면/도구 크기 변경만 관찰하고 사용자 pan이나 페이지 스크롤에서는 다시 맞추지 않는다. 취소·교체·언마운트 시 callback/observer/timer를 정리한다. [Kakao setBounds 공식 계약](https://apis.map.kakao.com/web/documentation/#Map_setBounds)을 따른다.

이는 로컬 구현·회귀 통과 범위이며 **실제 SDK Preview 및 Production에서 가림이 해소됐다는 최종 증거는 아직 필요하다.** SDK adapter 테스트를 실제 지도 서비스의 응답 성공으로 계산하지 않는다.

## 현재 실행한 검증

2026-09-09 KST, 위 브랜치의 로컬 미커밋 변경 기준.

- `npm run typecheck`: 통과.
- `npm run lint`: 최종 오류0, 기존 경고5. 새 지도 테스트의 별칭 변수2건이 최초 검사에서 실패해 변수명·observer 보관만 수정했다. 최초 실패 로그도 보존했고 관련 지도12건도 다시 통과했다.
- `npm test`: **705 PASS**, 실패·skip·cancel0 (13.806s).
- `node --test tests/map-viewport-fit.test.mjs tests/map-load-recovery.test.mjs`: **12 PASS**, 실패·skip0. 실제 renderer 본문을 제한된 SDK adapter로 실행해 원래 bounds·비대칭 여백·날짜 교체·취소·화면 크기 변경을 검증한다.
- 관련 `landing-first-arrival`, `service-story`, `landing-theme-contrast`: **34 PASS** (24.0s). 이미지 실패 대체의 KO/EN·desktop/mobile 추가4건 **4 PASS** (4.9s). 상태·정확한 두 장소ID·날짜·지도 순서·키보드·모션 감소·대비4.5:1·이미지 실제 decode·실패 공간 유지·추가 여행 API요청0을 검사한다.
- 관련 `map-load-recovery`, `map-save-trip`, `map-tools-reachable`, `region-change-boundary`: **36 PASS** (51.4s). 기존 날짜·지역·저장·복원·키보드·도구 접근 계약을 유지한다.
- `condition-prerequisites`: **8 PASS** (7.8s). main CI864의 실제 첫 시도 대비 실패는 큰 Hero 아래 요약이 일반 모션 전환 중일 때 DOM 이름·문자만 확인하고 axe를 실행한 경합이었다. 정상 스크롤 진입 후 motion-ready·실제 표시·opacity1을 먼저 요구하는 준비 검증을 추가했으며 기존 Hero 전체 axe·이름·번역·넘침 검사는 그대로다. 모션·대비 기준이나 timeout을 바꾸지 않았다.
- `npm run build:vercel` 및 `npm run check:performance`: 이미지 실패 대체까지 포함한 최종 결합본 통과. gzip CSS69.77/70, landing120.88/155, planner269.85/270, largest95.92/110KiB. 예산은 올리지 않았다.
- 로컬 실제 브라우저1280×720와390×844에서 첫 장면·실제 관광카드·날짜 장면·설명 위치와 넘침을 봤다. 자동 테스트의 테마/다국어/axe 결과와 실제 기기·낭독기 결과는 구분한다.

테스트 삭제·새 skip·timeout/worker/retry/성능 기준 완화 없음. 가상 세 장소 계약은 실제 두 장소의 정확한 ID·이름·날짜·지도 동일성과 촬영 구분을 더 직접 검증하도록 바꿨다. 기존 대비·넘침·초점 검사는 보존하고 전 단계 대비 검사를 추가했다.

## 보존 및 남은 Gate

원본 source 브랜치·사용자 dirty10·50worktrees·queue294 generation5/attempts/receipts·PITR/restore·실패 CI와 모든 캡처는 보존했다. 작업 증거는 `D:/wave-db-binding-preflight-20260908/`의 `story353-real-*`, `landing353-real-assets-9caca/`, `map-p2-fit-proposal-81b88e4/`에 있다.

#377은 main81b88e4로 병합됐지만 [main CI864](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34264286393)는 2026-09-09 04:04:11 KST FAILURE로 종료됐다. browser(1)의 기존 EN 요약 대비 검사가 첫 시도 실패→내장 retry 성공으로 flaky Gate에서 실패했다. 실패 대비1.08/1.03:1과 원본 trace·캡처는 독립 기록에 보존했다. 해당 랜딩 CSS·컴포넌트·검사는 #377에서 변경되지 않았으며 날씨 회귀나 인프라 실패로 판정하지 않는다. 별도로 browser(2)는 desktop207·mobile206 PASS+기존skip1 후 화면 artifact 업로드 중 25분 job 한도로 취소됐다. 전체830건은 PASS828·flaky1·기존skip1이며 추가 제품 실패0이다. regression 보고서는 모두 보존됐고 screenshots-2 업로드만 미완료다. CD219/PostDeploy10은 SKIPPED이며 신규 DB 쓰기·배포가 없었다. 04:08:55 KST Vercel canonical metadata는 여전히 Production9caca69fd5db24ed0bc741ad68ffef0d00ffe3ee READY였다.

과거 CI863의 성공이나 이후 재시도로 첫 실패를 덮어쓰지 않는다. ODsay #372 hold를 유지하며 반복 provider 실호출·유료 모델 API·자동화 활성화·#373 확대는 하지 않는다.

다음: 준비 상태를 더 엄격히 확인하는 작은 테스트 수정을 독립 commit으로 보존하고 현재 #353 후보에 포함한다. #373 전체를 가져오거나 main864를 무작정 재실행하지 않는다. #353 후보의 Full CI·정확한 Preview·실제 SDK 가림 확인·독립 QA 뒤 정상 병합, new main CI/CD/Production까지 확인한다. 제출 원고/최종 캡처/README 일치를 다시 확인하기 전 전체 #353 완료나 Release GO를 선언하지 않는다.
