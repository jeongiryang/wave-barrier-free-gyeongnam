import type { Place, WeatherData } from "../types";
import PlaceResultRow from "./PlaceResultRow";
export default function ExplorationPlaces({ places, region = "", saved = [], en, weather, weatherDate, onSelectPlace, onToggle }: { places: Place[]; region?: string; saved?: string[]; en: boolean; weather?: WeatherData | null; weatherDate?: string; onSelectPlace: (place: Place) => void; onToggle: (place: Place) => void }) {
  return <section className="simple-exploration" aria-label={en ? "Places with missing facility information" : "편의정보가 부족한 장소"}>
    <h2>{en ? "Facilities to check" : "편의정보가 부족한 장소"}</h2>
    <p>{en ? "Check the missing facilities before adding a place." : "표시된 시설을 확인한 뒤 후보로 담을 수 있어요."}</p>
    <div className="simple-place-list">{places.map(place => <PlaceResultRow key={place.id} place={place} region={region} saved={saved.includes(place.id)} current={false} unknown en={en} weather={weather} weatherDate={weatherDate} onToggle={() => onToggle(place)} onDetails={() => onSelectPlace(place)} />)}</div>
  </section>;
}
