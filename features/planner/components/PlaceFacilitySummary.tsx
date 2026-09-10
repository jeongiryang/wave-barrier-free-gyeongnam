import type { Place } from "../types";
import { facilityName, originalLanguage } from "../place-copy";

export default function PlaceFacilitySummary({ place, en }: { place: Place; en: boolean }) {
  const items = place.accessibility ?? [];
  const confirmed = items.filter(item => item.state === "confirmed");
  const unknown = items.length ? items.filter(item => item.state === "unknown").length : place.unknownFields;
  const negative = items.length ? items.filter(item => item.state === "negative").length : place.negativeFields;
  const say = (ko: string, english: string) => en ? english : ko;
  return <>
    <div className="place-facilities">
      <strong>{confirmed.length ? say("확인된 편의", "Reported facilities") : say("편의정보 확인이 필요해요", "Check the facility information")}</strong>
      {confirmed.length > 0 ? <ul>{confirmed.slice(0, 3).map(item => <li key={item.key}><span aria-hidden="true">✓</span> <span lang={originalLanguage(facilityName(item.key, item.label, en))}>{facilityName(item.key, item.label, en)}</span></li>)}</ul> : <p>{say("항목별로 확인된 편의가 없습니다. 이용 정보를 살펴보세요.", "No facilities are confirmed at item level. Review the visitor information.")}</p>}
    </div>
    {(Boolean(unknown) || Boolean(negative)) && <p className="facility-caution">
      {Boolean(unknown) && <span>{say("미확인", "Not reported")} {unknown}{say("개", "")}</span>}
      {Boolean(negative) && <span>{say("조건 불일치", "Reported unavailable")} {negative}{say("개", "")}</span>}
    </p>}
  </>;
}
