import type { WeatherData } from "../types";
import WeatherVisual from "./WeatherVisual";
import { useSitePreferences } from "../../../components/SitePreferences";
import { regionNames } from "../../../components/GyeongnamRegionPicker";
import { useReadinessFocus } from "../hooks/useReadinessFocus";
import { originalLanguage } from "../place-copy";
import { weatherCondition, weatherPreparation } from "../weather-copy";

interface WeatherBoardProps {
  region: string;
  weather: WeatherData | null;
  loading: boolean;
  onReload: () => void;
}

export default function WeatherBoard({ region, weather, loading, onReload }: WeatherBoardProps) {
  const { locale } = useSitePreferences();
  const english = locale === "en";
  const focus = useReadinessFocus();
  const dateLocale = english ? "en-US" : "ko-KR";
  const dateFormat = new Intl.DateTimeFormat(dateLocale, { year: "numeric", month: "short", day: "numeric", weekday: "short", timeZone: "Asia/Seoul" });
  return <section className="weather-board" data-reveal aria-busy={loading} aria-label={english ? `${regionNames[region] || region} travel weather` : `${region} 여행 날씨`} {...focus}>
    <header className="weather-heading"><p>{english ? "Forecast dates are shown in Korea time. Check again before leaving." : "예보 날짜는 한국 시간입니다. 출발 전에 다시 확인하세요."}</p><button type="button" onClick={() => { if (!loading) onReload(); }} aria-disabled={loading} aria-busy={loading}>{english ? "Check weather again" : "날씨 다시 확인"}</button></header>
    <p className="sr-only" role="status">{loading ? (english ? "Checking the forecast…" : "예보를 확인하고 있습니다…") : weather ? (english ? "Forecast received." : "예보를 확인했습니다.") : (english ? "The forecast could not be checked." : "예보를 확인하지 못했습니다.")}</p>
    {loading && <>
      <div className="weather-current weather-skeleton"><i /><b /><span /></div>
      <div className="weather-days">{[0, 1, 2, 3, 4, 5, 6].map((item) => (
        <div className="weather-day weather-skeleton" key={item}><i /><b /><span /></div>
      ))}</div>
    </>}
    {!loading && weather && <>
      <div className="weather-current">
        <small>{english ? "Current weather" : "현재 여행 날씨"} · <span lang={originalLanguage(weather.source)}>{weather.source}</span></small>
        <div>
          <WeatherVisual code={weather.current.code} />
          <strong>{Math.round(weather.current.temperature)}°</strong>
          <p><b>{weatherCondition(weather.current.code, weather.current.label, english)}</b><span>{english ? "Feels like " : "체감 "}{Math.round(weather.current.apparent)}° · {english ? "Wind " : "바람 "}{weather.current.wind.toFixed(1)} km/h</span></p>
        </div>
        <ul>{weather.advice.map((item) => { const text = weatherPreparation(item, english); return <li key={item} lang={originalLanguage(text)}>{text}</li>; })}</ul>
        {english && weather.advice.some((item) => originalLanguage(weatherPreparation(item, true))) && <p>{"Some advice is provided in its original Korean wording."}</p>}
        <p className="weather-updated">{english ? "Retrieved " : "조회 "}<time dateTime={weather.updatedAt}>{new Intl.DateTimeFormat(dateLocale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" }).format(new Date(weather.updatedAt))}</time> KST</p>
      </div>
      <div className="weather-days" role="region" aria-label={english ? "Daily forecast, scroll for more days" : "날짜별 예보, 옆으로 스크롤해 확인"} tabIndex={0}>{weather.days.map((day) => (
        <article className="weather-day" key={day.date}>
          <small><time dateTime={day.date}>{dateFormat.format(new Date(`${day.date}T12:00:00+09:00`))}</time></small>
          <WeatherVisual code={day.code} />
          <span>{weatherCondition(day.code, day.label, english)}</span>
          <strong>{Math.round(day.max)}° <em>{Math.round(day.min)}°</em></strong>
          <p>{english ? "Rain " : "비 "}{Math.round(day.rainProbability)}% · UV {day.uv.toFixed(0)}</p>
          {day.snow > 0 && <b>{english ? "Snow " : "눈 "}{day.snow.toFixed(1)} cm</b>}
        </article>
      ))}</div>
    </>}
    {!loading && !weather && <div className="weather-empty">
      <strong>{english ? "The forecast is temporarily unavailable." : "예보를 잠시 불러오지 못했습니다."}</strong>
      <span>{english ? "Your itinerary, places and routes remain available. Check the weather again." : "일정·관광지·경로는 그대로 이용할 수 있어요. 날씨를 다시 확인해 주세요."}</span>
    </div>}
  </section>;
}
