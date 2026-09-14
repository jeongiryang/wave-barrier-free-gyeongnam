import type { Place } from "../types";
import { FACILITIES, facilityLabel } from "../../../lib/facility-selection.js";

const selectableFacilityKeys = new Set(FACILITIES.map((item) => item.key));

function ConfirmedFacility({ facilityKey, en }: { facilityKey: string; en: boolean }) {
  return <span className="facility-confirmed"><span aria-hidden="true">✓ </span>{facilityLabel(facilityKey, en)}</span>;
}

export default function PlaceFacilitySummary({ place, en, highlightConfirmed = false }: {
  place: Place;
  en: boolean;
  highlightConfirmed?: boolean;
}) {
  const items = place.accessibility ?? [];
  if (!items.length && place.facilityLookupState !== "error") return null;

  const confirmedItems = items.filter((item) =>
    item.state === "confirmed" && selectableFacilityKeys.has(item.key),
  );
  const initiallyVisibleConfirmed = highlightConfirmed && confirmedItems.length >= 3
    ? confirmedItems.slice(0, 2)
    : highlightConfirmed
      ? confirmedItems
      : confirmedItems.slice(0, 3);
  const additionalConfirmed = highlightConfirmed && confirmedItems.length >= 3
    ? confirmedItems.slice(2)
    : [];

  return <div className="simple-facility-summary">
    {place.facilityLookupState === "error" && <p>{en ? "Facility information could not be loaded." : "편의정보를 불러오지 못했어요."}</p>}
    {highlightConfirmed && confirmedItems.length > 0 && <p className="facility-confirmed-label">{en ? "Facilities confirmed here" : "이 장소에서 확인된 편의"}</p>}
    {initiallyVisibleConfirmed.map((item) => <ConfirmedFacility key={item.key} facilityKey={item.key} en={en} />)}
    {additionalConfirmed.length > 0 && <details className="facility-confirmed-more">
      <summary>{en ? `Show ${additionalConfirmed.length} more` : `확인된 편의 ${additionalConfirmed.length}개 더보기`}</summary>
      <div>{additionalConfirmed.map((item) => <ConfirmedFacility key={item.key} facilityKey={item.key} en={en} />)}</div>
    </details>}
    {items.filter((item) => item.state === "negative").map((item) => <span className="facility-missing" key={item.key}>{facilityLabel(item.key, en)} {en ? "unavailable" : "없음"}</span>)}
    {items.filter((item) => item.state === "unknown").map((item) => <span className="facility-unknown" key={item.key}>{facilityLabel(item.key, en)} {en ? "not reported" : "정보 없음"}</span>)}
  </div>;
}
