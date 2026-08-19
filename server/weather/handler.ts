import { clean, json } from "../shared/http";

const regionCoordinates: Record<string, { lat: number; lng: number }> = {
  "경남 전체": { lat: 35.2383, lng: 128.6924 }, 창원: { lat: 35.2279, lng: 128.6811 }, 진주: { lat: 35.1800, lng: 128.1076 },
  통영: { lat: 34.8544, lng: 128.4332 }, 사천: { lat: 35.0038, lng: 128.0642 }, 김해: { lat: 35.2285, lng: 128.8893 },
  밀양: { lat: 35.5038, lng: 128.7464 }, 거제: { lat: 34.8806, lng: 128.6211 }, 양산: { lat: 35.3350, lng: 129.0372 },
  의령: { lat: 35.3222, lng: 128.2617 }, 함안: { lat: 35.2725, lng: 128.4065 }, 창녕: { lat: 35.5446, lng: 128.4923 },
  고성: { lat: 34.9731, lng: 128.3223 }, 남해: { lat: 34.8377, lng: 127.8925 }, 하동: { lat: 35.0672, lng: 127.7513 },
  산청: { lat: 35.4156, lng: 127.8735 }, 함양: { lat: 35.5205, lng: 127.7252 }, 거창: { lat: 35.6867, lng: 127.9095 }, 합천: { lat: 35.5667, lng: 128.1658 },
};

export function weatherLabel(code: number) {
  if (code === 0) return "맑음";
  if ([1, 2].includes(code)) return "대체로 맑음";
  if (code === 3) return "흐림";
  if ([45, 48].includes(code)) return "안개";
  if ([51, 53, 55, 56, 57].includes(code)) return "이슬비";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "비";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "눈";
  if ([95, 96, 99].includes(code)) return "천둥번개";
  return "날씨 변화";
}

export function weatherAdvice(daily: { max: number; min: number; rainProbability: number; rain: number; snow: number; uv: number }) {
  const messages: string[] = [];
  if (daily.rainProbability >= 50 || daily.rain >= 1) messages.push("우산과 미끄럼 방지 신발을 챙기세요.");
  if (daily.snow > 0) messages.push("눈 예보가 있어 방수 신발과 보온 장갑이 좋아요.");
  if (daily.uv >= 6) messages.push("자외선이 강해 선크림·모자·선글라스를 권해요.");
  if (daily.max <= 2) messages.push("패딩과 보온 내의를 준비하세요.");
  else if (daily.min < 10) messages.push("아침저녁 외투나 얇은 패딩이 필요해요.");
  else if (daily.max >= 28) messages.push("통풍이 잘되는 얇은 옷과 물을 챙기세요.");
  else messages.push("가벼운 겉옷을 겹쳐 입으면 편안해요.");
  return messages;
}

export async function handleWeatherApi(request: Request) {
  if (request.method !== "GET") return json({ error: "GET 요청만 지원합니다." }, 405);
  const url = new URL(request.url);
  const requested = clean(url.searchParams.get("region"), 20);
  const region = regionCoordinates[requested] ? requested : "창원";
  const point = regionCoordinates[region];
  const params = new URLSearchParams({
    latitude: String(point.lat),
    longitude: String(point.lng),
    timezone: "Asia/Seoul",
    forecast_days: "7",
    current: "temperature_2m,apparent_temperature,weather_code,is_day,precipitation,rain,showers,snowfall,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,rain_sum,snowfall_sum,uv_index_max",
  });
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`날씨 응답 ${response.status}`);
    const raw = await response.json() as Record<string, unknown>;
    const current = (raw.current || {}) as Record<string, number | string>;
    const daily = (raw.daily || {}) as Record<string, unknown>;
    const values = (key: string) => Array.isArray(daily[key]) ? daily[key] as Array<number | string> : [];
    const days = values("time").slice(0, 7).map((time, index) => ({
      date: String(time),
      code: Number(values("weather_code")[index] || 0),
      label: weatherLabel(Number(values("weather_code")[index] || 0)),
      max: Number(values("temperature_2m_max")[index] || 0),
      min: Number(values("temperature_2m_min")[index] || 0),
      rainProbability: Number(values("precipitation_probability_max")[index] || 0),
      rain: Number(values("rain_sum")[index] || 0),
      snow: Number(values("snowfall_sum")[index] || 0),
      uv: Number(values("uv_index_max")[index] || 0),
    }));
    return json({
      region,
      source: "Open-Meteo",
      updatedAt: new Date().toISOString(),
      current: {
        temperature: Number(current.temperature_2m || 0),
        apparent: Number(current.apparent_temperature || 0),
        code: Number(current.weather_code || 0),
        label: weatherLabel(Number(current.weather_code || 0)),
        wind: Number(current.wind_speed_10m || 0),
        precipitation: Number(current.precipitation || 0),
        isDay: Boolean(current.is_day),
      },
      days: days.map((day, index) => ({ ...day, advice: index === 0 ? weatherAdvice(day) : [] })),
      advice: days[0] ? weatherAdvice(days[0]) : [],
    }, 200, true);
  } catch (error) {
    return json({ error: error instanceof Error ? clean(error.message, 120) : "날씨 정보를 불러오지 못했습니다." }, 502);
  }
}
