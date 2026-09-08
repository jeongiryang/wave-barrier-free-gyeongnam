import type { Place } from "../types";

export default function ExplorationPlaces({ places, en, onSelectPlace }: { places: Place[]; en: boolean; onSelectPlace: (place: Place) => void }) {
  const say = (ko: string, english: string) => en ? english : ko;
  return <details className="exploration-places">
    <summary>{say("편의정보가 부족한 다른 장소", "Other places with insufficient facility information")} ({places.length})</summary>
    <p>{say("필요한 편의를 확인하지 못해 추천과 일정 추가에서 제외했어요.", "These places are excluded from recommendations and itinerary additions because your needs could not be confirmed.")}</p>
    <div>{places.map(place => <article key={place.id}>
      <div><h3>{place.name}</h3><p>{place.address}</p></div>
      <span>{place.score === 0 ? say("조건 불일치", "No matching facilities") : say("정보 미확인", "Information missing")}</span>
      <button type="button" onClick={() => onSelectPlace(place)}>{say("이용 정보 확인", "View information")}</button>
    </article>)}</div>
  </details>;
}
