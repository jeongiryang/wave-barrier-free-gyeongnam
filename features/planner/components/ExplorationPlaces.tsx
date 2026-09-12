import type { Place } from "../types";
import { originalLanguage } from "../place-copy";

export default function ExplorationPlaces({ places, en, onSelectPlace }: { places: Place[]; en: boolean; onSelectPlace: (place: Place) => void }) {
  const say = (ko: string, english: string) => en ? english : ko;
  return <details className="exploration-places">
    <summary>{say("편의정보가 부족한 다른 장소", "Other places with insufficient facility information")} ({places.length})</summary>
    <p>{say("필요한 편의가 모두 확인된 추천은 아니에요. 이용 정보에서 미확인 항목을 살펴보고, 방문 전 확인할 후보로 직접 담을 수 있어요. 필요한 편의가 제공되지 않는 장소는 제외합니다.", "These are not fully verified recommendations. Review their missing facility information and explicitly save a candidate to check before visiting. Places reporting a required facility as unavailable remain excluded.")}</p>
    <div>{places.map(place => <article key={place.id}>
      <div><h3 lang={originalLanguage(place.name)}>{place.name}</h3><p lang={originalLanguage(place.address)}>{place.address}</p></div>
      <span>{place.accessibility?.some(item => item.state === "negative") || Boolean(place.negativeFields) ? say("조건 불일치", "No matching facilities") : place.facilityLookupState === "error" ? say("제공처 연결 실패 · 편의 미확인", "Provider unavailable · facilities unverified") : say("정보 미확인", "Information missing")}</span>
      <button type="button" onClick={() => onSelectPlace(place)}>{say("이용 정보 확인", "View information")}</button>
    </article>)}</div>
  </details>;
}
