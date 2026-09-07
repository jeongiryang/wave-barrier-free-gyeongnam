const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function utcDay(date) {
  return Date.parse(`${date}T00:00:00Z`);
}

function daysBetween(from, to) {
  return Math.round((utcDay(to) - utcDay(from)) / 86_400_000);
}

export function assessTripDatePhase(travelStart, today, locale = "ko") {
  const en = locale === "en";
  if (!DATE_PATTERN.test(travelStart || "")) {
    return { id: "no-date", label: en ? "Choose your travel dates" : "여행 날짜를 정해 주세요", daysUntil: null };
  }
  const safeToday = DATE_PATTERN.test(today || "") ? today : new Date().toISOString().slice(0, 10);
  const daysUntil = daysBetween(safeToday, travelStart);
  if (daysUntil < 0) return { id: "past", label: en ? "Past trip" : "지난 일정", daysUntil };
  if (daysUntil === 0) return { id: "today", label: en ? "Leaving today" : "오늘 출발", daysUntil };
  const englishLabel = `Leaving in ${daysUntil} ${daysUntil === 1 ? "day" : "days"}`;
  if (daysUntil <= 3) return { id: "imminent", label: en ? englishLabel : `출발 D-${daysUntil}`, daysUntil };
  return { id: "planned", label: en ? englishLabel : `${daysUntil}일 뒤 출발`, daysUntil };
}

function weatherReadiness({ travelStart, weather, weatherLoading }, en) {
  const label = en ? "Weather" : "날씨";
  const fallbackSource = en ? "Weather information" : "기상 정보";
  if (weatherLoading) return {
    id: "weather", label, state: "recheck", summary: en ? "Loading the forecast for your travel date." : "여행 날짜의 예보를 불러오는 중입니다.",
    source: fallbackSource, checkedAt: "", href: "#layers",
  };
  const day = weather?.days?.find((item) => item.date === travelStart);
  if (!day) return {
    id: "weather", label, state: "recheck", summary: en ? "No forecast is available for this date, or it is beyond the forecast range." : "해당 날짜 예보가 없거나 예보 범위 밖입니다.",
    source: weather?.source || fallbackSource, checkedAt: weather?.updatedAt || "", href: "#layers",
  };
  return {
    id: "weather", label, state: "confirmed",
    subject: en ? day.label : undefined,
    summary: en ? `Rain probability ${day.rainProbability}% · ${day.min}–${day.max}°C` : `${day.label} · 강수확률 ${day.rainProbability}% · ${day.min}~${day.max}℃`,
    source: weather.source || fallbackSource, checkedAt: weather.updatedAt || "", href: "#layers",
  };
}

function crowdReadiness({ crowd, crowdPlaceId, generatedAt, places, travelStart, scheduleAssignments }, en) {
  const label = en ? "Visitor concentration forecast" : "관광 집중률";
  const matches = places.filter(place => place.name === crowd?.place && (!crowdPlaceId || place.id === crowdPlaceId));
  const date = matches.length === 1 ? scheduleAssignments[matches[0].id] || travelStart : "";
  const valid = crowd && Number.isFinite(crowd.rate) && crowd.rate >= 0 && crowd.rate <= 100
    && DATE_PATTERN.test(date) && crowd.baseYmd === date.replaceAll("-", "");
  if (!valid) return {
    id: "crowd", label, state: "recheck", summary: en ? "No matching forecast for your itinerary place and date. A prediction is not a live visitor count; check crowding separately." : "일정 장소·날짜에 맞는 예측값을 확인하지 못했습니다. 예측값이며 실시간 방문자 수가 아닙니다. 현장 혼잡을 따로 확인하세요.",
    source: en ? "Korea Tourism Data Lab" : "한국관광 데이터랩", checkedAt: generatedAt || "", href: "#layers",
  };
  return {
    id: "crowd", label, state: places.length === 1 ? "confirmed" : "partial", subject: en ? crowd.place : undefined,
    summary: en ? `${crowd.rate.toFixed(1)}% · ${date} · 1 of ${places.length} itinerary places. A prediction, not a live visitor count.` : `${crowd.place} ${crowd.rate.toFixed(1)}% · ${date} · 일정 ${places.length}곳 중 1곳. 예측값이며 실시간 방문자 수가 아닙니다.`,
    source: en ? "Korea Tourism Data Lab visitor concentration forecast" : "한국관광 데이터랩 관광집중률 예측", checkedAt: crowd.baseYmd || generatedAt || "", href: "#layers",
  };
}

function transportReadiness(providers, en) {
  const label = en ? "Transport" : "교통";
  const list = Array.isArray(providers) ? providers : [];
  const connected = list.filter((item) => item.state === "connected");
  const readyOnly = list.filter((item) => item.state === "ready");
  if (!list.length || !connected.length) return {
    id: "transport", label, state: "recheck",
    summary: readyOnly.length
      ? en ? `${readyOnly.length} transport services have no verified journey results. Check lookup details in the journey view.` : `${readyOnly.length}개 교통 서비스의 이동 결과가 확인되지 않았습니다. 이동 화면에서 조회 상태를 확인하세요.`
      : en ? "No journey times have been verified. Check the operator or external directions." : "직접 확인된 이동시간이 없습니다. 운영기관 또는 외부 길찾기를 확인하세요.",
    source: readyOnly.map((item) => item.name).join(" · ") || (en ? "Transport information" : "교통 공급자 상태"), checkedAt: "", href: "#navigation",
  };
  const allConnected = connected.length === list.length;
  return {
    id: "transport", label, state: allConnected ? "confirmed" : "partial",
    summary: allConnected
      ? en ? `Received data from ${connected.length} transport services. Check actual routes and operating times separately in the journey view.` : `${connected.length}개 교통 제공기관·데이터 응답을 확인했습니다. 실제 경로와 운행시간은 이동 화면에서 구분해 확인하세요.`
      : en ? `Received data from ${connected.length} transport services; ${list.length - connected.length} have no verified result. Check each lookup in the journey view. This is not a count of actual routes.` : `${connected.length}개 제공기관·데이터 응답 확인 · ${list.length - connected.length}개는 결과 미확인입니다. 이동 화면에서 각 조회 상태를 확인하세요. 실제 경로 수와는 다릅니다.`,
    source: connected.map((item) => item.name).join(" · "), checkedAt: "", href: "#navigation",
  };
}

function evidenceReadiness(places, en) {
  const label = en ? "Place accessibility evidence" : "장소 편의근거";
  const fallbackSource = en ? "Official accessible travel information" : "공식 무장애 여행정보";
  const list = Array.isArray(places) ? places : [];
  if (!list.length) return {
    id: "evidence", label, state: "recheck", summary: en ? "No places have been added to the itinerary." : "일정에 보관한 장소가 없습니다.",
    source: fallbackSource, checkedAt: "", href: "#places",
  };
  const verified = list.filter((place) => Number(place.score) > 0 && Number(place.knownFields) > 0 && place.checkedAt);
  const sources = [...new Set(verified.map((place) => place.source).filter(Boolean))];
  const checkedTimes = verified.map((place) => Date.parse(place.checkedAt)).filter(Number.isFinite);
  const checkedAt = checkedTimes.length ? new Date(Math.min(...checkedTimes)).toISOString() : "";
  if (!verified.length) return {
    id: "evidence", label, state: "recheck",
    summary: en ? `Check official accessibility evidence and update times for all ${list.length} places.` : `${list.length}곳 모두 공식 편의근거와 갱신 시각을 다시 확인해야 합니다.`,
    source: fallbackSource, checkedAt: "", href: "#places",
  };
  return {
    id: "evidence", label, state: verified.length === list.length ? "confirmed" : "partial",
    summary: en ? `${verified.length} of ${list.length} places have official accessibility evidence and a checked time.` : `${list.length}곳 중 ${verified.length}곳의 공식 편의근거와 확인 시각이 있습니다.`,
    source: sources.join(" · ") || fallbackSource, checkedAt, href: "#places",
  };
}

export function assessDepartureReadiness({
  travelStart = "", today = "", weather = null, weatherLoading = false,
  crowd = null, crowdPlaceId, generatedAt = "", transportProviders = [], places = [], scheduleAssignments = {}, locale = "ko",
} = {}) {
  const phase = assessTripDatePhase(travelStart, today, locale);
  const en = locale === "en";
  const items = [
    weatherReadiness({ travelStart, weather, weatherLoading }, en),
    crowdReadiness({ crowd, crowdPlaceId, generatedAt, places, travelStart, scheduleAssignments }, en),
    transportReadiness(transportProviders, en),
    evidenceReadiness(places, en),
  ];
  const hasRecheck = items.some((item) => item.state === "recheck");
  const hasPartial = items.some((item) => item.state === "partial");
  const state = phase.id === "past" || phase.id === "no-date" || hasRecheck
    ? "recheck"
    : hasPartial ? "partial" : "confirmed";
  return { state, phase, items };
}

