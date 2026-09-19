# 명세 23 — 색 구분이 어려울 때의 표시

- PR: https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/555
- 선행 PR: https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/554 (설정 패널 초점 계약을 컨트롤 개수에 무관하게 검사). 이 작업은 #554 브랜치 위에 쌓였고 PR base도 그 브랜치다.
- 근거 명세: `specs/23-color-vision-mode.md`
- 사용한 AI 도구: Claude Code

## 사람이 직접 결정한 것

- CSS gzip 예산 상쇄를 위해 제거할 "죽은 선언"의 범위. 뒤에 오는 스타일시트가 같은 문맥·같은 선택자로 무조건 덮어써 계산된 값에 쓰이지 않는 선언만 골랐고, 선택자 그룹의 다른 대상이 남는 경우는 제외했다.
- 혼잡도에 모양 구분을 넣지 않기로 한 판단. 명세가 혼잡도에 요구한 것은 글자를 항상 함께 보여주는 것이고, 지도 혼잡 범례는 이미 그 낱말을 접을 수 없이 보여준다.
- 회색조 확인을 Playwright 임시 CSS 주입으로 수행하고 캡처를 눈으로 검토.

## 구현

- `features/preferences/types.ts`: `ColorAssist` 타입과 `PreferencesValue` 확장(`colorAssist`, `setColorAssist`).
- `features/preferences/storage.ts`: 저장 키 `wave-color-assist-v1`. 접근성 설정이므로 `presentationOptionsEnabled()` 게이트 밖에서 읽고 쓴다. 읽기·쓰기 모두 `try/catch`.
- `features/preferences/context.tsx`: 상태와 `document.documentElement.dataset.colorAssist` 갱신. 기존 `theme` 흐름을 따른다. 설정 변경에 게이트를 적용하지 않는다.
- `features/preferences/PreferenceControls.tsx`: `색 구분 보조`(끄기/켜기, 기본 끄기) 항목 하나. 기존 `.preference-row` 패턴을 그대로 쓰므로 조작 영역 44px 이상이 유지된다. `aria-live="polite"`로 `색 구분 보조를 켰어요./껐어요.`를 알린다.
- `app/layout.tsx`: 부팅 인라인 스크립트에 한 줄. 기존 `try/catch` 안, `data-motion` 옆.
- `lib/status-shape.js` + `.d.ts`: 상태값 → 모양 이름과 한국어 낱말. React·CSS·DOM 참조 없음.
- `components/AccessIcons.tsx`: 같은 규격(24×24, `fill="none"`, `stroke="currentColor"`, `strokeWidth={1.8}`)의 상태 모양 아이콘. 항상 `aria-hidden="true"`이며 뜻은 함께 있는 글자가 전달한다.
- 상태 표시 보강: `PlaceFacilitySummary`(확인·부재·미확인 칩), `PlaceEvidenceSummary`, `MapLayerPanel`·`NearbyPlacesPanel`의 켜짐 표시, `WeatherBoard`의 실패 안내(`실패` 낱말).
- `app/styles/simple-wave.css`: `[data-color-assist=on]` 하위 규칙. 새 CSS 파일을 만들지 않았고 기존 토큰만 썼다. 지도 마커는 출발지를 마름모로 두어 색만 다른 마커가 남지 않게 했다.

## 하지 않은 것

- 화면 전체 색 필터·채도 변경, 색각 유형 질문, 설정값의 서버·계정 전송, 혼잡도·상태 색 변경, 새 최상위 설정 화면. 위치 권한도 요청하지 않고 `navigator.geolocation`을 호출하지 않는다.
- 테스트 skip, timeout 증가, CI·성능 기준 완화.

## 검증 결과

- `npm run lint` 오류 0(기존 경고 14), `npm run typecheck` PASS, `npm run build:vercel` PASS.
- `npm test` 1264 pass / 2 fail. 실패 2건(`authenticated gateway applies image admission independently`, `dedicated AI runtime waits for startup and never repeats model loading`)은 이 기기에 Python이 없어 생기는 기존 실패로 main에서도 실패한다.
- `npm run check:performance` PASS. 전체 CSS gzip: main 기준 70.00 KiB → 변경만 얹었을 때 70.21 KiB(초과) → 죽은 선언 제거 후 69.99 KiB. 예산 기준은 건드리지 않았다.
- e2e 선택 실행: `color-assist` 3+3 PASS(desktop/mobile), `preferences-*`와 `accessibility-final` 42 PASS, 대비 계열 7개 spec 중 `landing-theme-contrast`의 어두운 케이스가 배치 실행에서 불안정하게 실패. 같은 배치를 main에서 2회 돌렸을 때도 동일하게 실패하므로 기존 불안정이며 이 작업에서 고치지 않았다.
- 회색조 확인: `html { filter: grayscale(1) }`를 주입해 1440·960·390px 캡처. 끈 상태에서도 `승강기 없음`/`장애인 화장실 정보 없음`/체크+`접근로`로 세 상태가 구분되고, 켠 상태에서는 사선·물음표·체크 모양이 더해진다.

## 남은 일

- 호스팅 CI 결과 확인, #554 병합 뒤 이 PR의 base를 `main`으로 변경, PR #552(글자 크기)와의 충돌 정리는 사람이 한다.
