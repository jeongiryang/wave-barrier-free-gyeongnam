export type WeatherDay = {
  date: string;
  code: number;
  label: string;
  max: number;
  min: number;
  rainProbability: number;
  rain: number;
  snow: number;
  uv: number;
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
  return "날씨 정보 미확인";
}

export function weatherAdvice(daily: Pick<WeatherDay, "max" | "min" | "rainProbability" | "rain" | "snow" | "uv">) {
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

export function normalizeWeatherForecast(raw: Record<string, unknown>, region: string) {
  const current = (raw.current || {}) as Record<string, number | string>;
  const daily = (raw.daily || {}) as Record<string, unknown>;
  const values = (key: string) => Array.isArray(daily[key]) ? daily[key] as Array<number | string> : [];
  const number = (value: unknown) => {
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("날씨 제공처 응답에 확인할 수 없는 값이 있습니다.");
    return value;
  };
  const days: WeatherDay[] = values("time").slice(0, 7).map((time, index) => {
    if (typeof time !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(time) || new Date(`${time}T00:00:00Z`).toISOString().slice(0, 10) !== time) throw new Error("예보 날짜를 확인할 수 없습니다.");
    const code = number(values("weather_code")[index]);
    return {
      date: String(time), code, label: weatherLabel(code),
      max: number(values("temperature_2m_max")[index]),
      min: number(values("temperature_2m_min")[index]),
      rainProbability: number(values("precipitation_probability_max")[index]),
      rain: number(values("rain_sum")[index]),
      snow: number(values("snowfall_sum")[index]),
      uv: number(values("uv_index_max")[index]),
    };
  });
  if (!days.length) throw new Error("날씨 제공처 응답에 예보 날짜가 없습니다.");
  const currentCode = number(current.weather_code);
  return {
    region,
    source: "Open-Meteo",
    updatedAt: new Date().toISOString(),
    current: {
      temperature: number(current.temperature_2m),
      apparent: number(current.apparent_temperature),
      code: currentCode,
      label: weatherLabel(currentCode),
      wind: number(current.wind_speed_10m),
      precipitation: number(current.precipitation),
      isDay: Boolean(current.is_day),
    },
    days: days.map((day, index) => ({ ...day, advice: index === 0 ? weatherAdvice(day) : [] })),
    advice: days[0] ? weatherAdvice(days[0]) : [],
  };
}
