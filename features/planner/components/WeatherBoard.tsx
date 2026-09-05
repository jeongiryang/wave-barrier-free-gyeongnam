import type { WeatherData } from "../types";
import WeatherVisual from "./WeatherVisual";

interface WeatherBoardProps {
  region: string;
  weather: WeatherData | null;
  loading: boolean;
}

export default function WeatherBoard({ region, weather, loading }: WeatherBoardProps) {
  return <section className="weather-board" data-reveal aria-busy={loading} aria-label={`${region} 여행 날씨`}>
    {loading && <>
      <div className="weather-current weather-skeleton"><i /><b /><span /></div>
      <div className="weather-days">{[0, 1, 2, 3, 4, 5, 6].map((item) => (
        <div className="weather-day weather-skeleton" key={item}><i /><b /><span /></div>
      ))}</div>
    </>}
    {!loading && weather && <>
      <div className="weather-current">
        <small>현재 여행 날씨 · {weather.source}</small>
        <div>
          <WeatherVisual code={weather.current.code} />
          <strong>{Math.round(weather.current.temperature)}°</strong>
          <p><b>{weather.current.label}</b><span>체감 {Math.round(weather.current.apparent)}° · 바람 {weather.current.wind.toFixed(1)}km/h</span></p>
        </div>
        <ul>{weather.advice.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>
      <div className="weather-days">{weather.days.map((day, index) => (
        <article className="weather-day" key={day.date}>
          <small>{index === 0 ? "오늘" : new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(new Date(`${day.date}T12:00:00`))}</small>
          <WeatherVisual code={day.code} />
          <strong>{Math.round(day.max)}° <em>{Math.round(day.min)}°</em></strong>
          <p>비 {Math.round(day.rainProbability)}% · UV {day.uv.toFixed(0)}</p>
          {day.snow > 0 && <b>눈 {day.snow.toFixed(1)}cm</b>}
        </article>
      ))}</div>
    </>}
    {!loading && !weather && <div className="weather-empty">
      <strong>예보를 잠시 불러오지 못했습니다.</strong>
      <span>관광 데이터와 경로 기능은 그대로 이용할 수 있어요.</span>
    </div>}
  </section>;
}
