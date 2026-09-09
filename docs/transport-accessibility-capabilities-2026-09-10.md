# Transport accessibility capability audit — #277

Checked 2026-09-10 KST against official documentation and the adapters in this branch. This is an operation-level audit: an unverified field is **unknown**, not proof that the provider does not offer it elsewhere. Documentation, application mapping and a current real response are separate evidence.

| Audited operation | Documented journey information | Documented mobility information | Current W.A.V.E use | Current accessibility response verified? |
| --- | --- | --- | --- | --- |
| Kakao Mobility `/v1/directions` | Car duration, distance, toll/taxi amounts and road geometry | No wheelchair, working-lift or step-free evidence established by this audited response contract | Car route time/distance/toll/geometry | NO |
| ODsay `searchPubTransPathT` | Transit time, walking distance, transfers and fare; intercity results require additional endpoint connectors | No structured mobility field established by the currently used city-route mapping | Validated city routes and walking/transfer totals; route shape is a stop schematic | NO — #372 quota hold; no new call |
| ODsay `searchWalkPathV2` (separate operation) | Walking route distance and duration | Route facility codes include ramps, stairs and elevators; existence does not establish current operation or wheelchair suitability | Not integrated or activated by this change | NO |
| TAGO `getSttnAcctoArvlPrearngeInfoList` | Arrival time, preceding-stop count, stop and route identifiers | `vehicletp` describes the arriving vehicle; the official example is a low-floor bus | Current mapping keeps route label, minutes and stops; discards vehicle type | NO — documentation example is not a current bus observation |
| KORAIL `run/v2/travelerTrainRunPlan2` | Planned train service dates, stations and departure/arrival times | No station-lift or boarding evidence established by the plan fields used here | Generic current-day train-plan context, not this itinerary's accessible connection | NO |
| TAGO nearby-stop and rail/terminal catalog operations | Stop identity/location and catalogs | No mobility evidence established in the fields used here | Nearby-stop selection and catalog context only | NO |

## Sources

- [Kakao Mobility directions](https://developers.kakaomobility.com/guide/navi-api/directions.html). The car operation is distinct from [Kakao Maps REST routing](https://developers.kakao.com/docs/en/kakaomap/rest-api); the latter's app activation and billing availability remain unverified, and this audit neither calls nor enables it.
- [ODsay official operation reference](https://lab.odsay.com/guide/releaseReference?platform=web): Public Transit Route Search v1.8 and Walk Route Search. Facility codes belong to the separate walking operation, not the existing transit adapter. No operating elevator, slope gradient or continuous wheelchair route is inferred from the facility code.
- [TAGO bus-arrival API](https://www.data.go.kr/data/15098530/openapi.do): output field `vehicletp` is scoped to an arrival. It cannot confirm every bus on a route or the boarding environment.
- [KORAIL train-operation data](https://www.data.go.kr/data/15125762/openapi.do) and [official v2 URL change](https://www.data.go.kr/bbs/ntc/selectNotice.do?originId=NOTICE_0000000003772). W.A.V.E calls the plan operation with the current Korea service date; it does not bind this generic context to a future selected itinerary.

## Application evidence and decisions

- `features/routing/types.ts`: `RouteAlternative` contains route measurements, segments and geometry, with no structured mobility evidence. A selected facility profile, destination elevator, user acknowledgement or road view cannot create that evidence.
- `server/transport/public-provider-queries.ts`: current TAGO arrivals depend on the first nearby stop's identity; KORAIL plans use today's service date. Catalog availability and configured keys do not establish a usable itinerary leg.
- `server/transport/public-context-model.ts`: TAGO arrival normalization omits `vehicletp`; KORAIL context retains train/station/time labels. These are not route accessibility confirmations.
- `server/transport/odsay.ts`: the existing transit adapter validates route measurements and endpoint coverage. It does not request the separate walking facility operation.
- Departure readiness now evaluates current, selected-mode itinerary leg coverage separately from mobility. A route may have verified time while mobility remains unknown. Missing evidence never becomes an explicit negative facility finding.
- TAGO vehicle type is a possible follow-up using the existing arrival response, with stop/route identity, observation source and timestamp preserved. An arrival-level label must not become a route-wide `wheelchair=true` flag. Raw value semantics and an actual approved sample still need verification.
- ODsay walking facilities require a separate authorized operation and verified response/availability. No additional calls, keys, quotas or paid activation were made here. #372 remains external.

## Verification boundary

The earlier `docs/api-integration-audit.md` response history is historical operational evidence; successful configuration health and empty arrival arrays do not verify accessibility fields. Local fixtures verify parsing and state transitions only. This audit records **documented capability and current code usage**, not a fresh live accessibility PASS. Field-level destination readiness, source freshness and the remaining #277 acceptance criteria stay open.
