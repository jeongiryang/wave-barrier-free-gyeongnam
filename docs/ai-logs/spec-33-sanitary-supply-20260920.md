# Spec 33 여성용품 비치 장소

- 작업: Codex
- 브랜치: `codex/spec-33-sanitary-supply`
- 범위: 공개 관광지 `contentId` 재검증, 서버 전용 공식 OpenAPI 경계, 거리순 5건, 편의지도 독립 레이어, 공중화장실 흐름 안내
- 개인정보: 사용자 좌표·레이어 선택·조회 이력은 요청, URL, 저장소, 나루 컨텍스트에 추가하지 않음
- 데이터: 비치 목록을 하드코딩하지 않으며 `SANITARY_SUPPLY_API_URL`에 운영자가 공식 통합 HTTPS OpenAPI를 연결함
- 상태: available, empty, invalid-request, provider-error, location-unconfirmed을 구분함
- 검증: typecheck, 변경 파일 lint, 관련 Node 테스트 17건, Vercel 빌드 통과
- 한계: 운영 OpenAPI 주소와 승인 키를 로컬에 주입하지 않아 실제 제공처 응답은 검증하지 않음
