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
    source: en ? "Korea Tourism Data Lab" : "한국관광 데이터랩", checkedAt: generatedAt || "", href: "#crowd",
  };
  return {
    id: "crowd", label, state: places.length === 1 ? "confirmed" : "partial", subject: en ? crowd.place : undefined,
    summary: en ? `${crowd.rate.toFixed(1)}% · ${date} · 1 of ${places.length} itinerary places. A prediction, not a live visitor count.` : `${crowd.place} ${crowd.rate.toFixed(1)}% · ${date} · 일정 ${places.length}곳 중 1곳. 예측값이며 실시간 방문자 수가 아닙니다.`,
    source: en ? "Korea Tourism Data Lab visitor concentration forecast" : "한국관광 데이터랩 관광집중률 예측", checkedAt: crowd.baseYmd || generatedAt || "", href: "#crowd",
  };
}

function transportReadiness(coverage, en) {
  const total = Number.isSafeInteger(coverage?.total) && coverage.total > 0 ? coverage.total : 0;
  const verified = total && !coverage?.loading && Number.isSafeInteger(coverage?.verified) && coverage.verified >= 0 && coverage.verified <= total ? coverage.verified : 0;
  return {
    id: "transport", label: en ? "Journey times" : "이동 경로·시간", state: verified ? verified === total ? "confirmed" : "partial" : "recheck",
    summary: coverage?.loading
      ? en ? "Checking the journeys for your current itinerary and transport." : "현재 일정과 선택한 이동수단의 경로를 확인하고 있습니다."
      : total ? en ? `${verified} of ${total} journeys verified for the current dates, order, starting point and transport. Facility access needs a separate check.` : `현재 날짜·순서·출발지·이동수단의 전체 ${total}구간 중 ${verified}구간을 확인했습니다. 이동 편의는 별도 확인이 필요합니다.`
        : en ? "Add itinerary places, then check every journey. Provider connectivity alone does not verify a route." : "일정에 장소를 담고 각 이동 구간을 확인해 주세요. 제공기관 연결만으로 경로가 확인되지는 않습니다.",
    source: en ? "Current itinerary route responses" : "현재 일정의 경로 응답", checkedAt: "", href: "#navigation",
  };
}

function mobilityReadiness(en) {
  return {
    id: "mobility", label: en ? "Access along the journey" : "이동 편의", state: "recheck",
    summary: en ? "Working lifts, low-floor buses, slopes and steps have not been verified for these journeys. Check each leg with its operator; a route time does not confirm accessible travel." : "이동 구간의 승강기 운행·저상버스·경사·계단은 아직 확인하지 못했습니다. 각 구간의 운영기관에 확인해 주세요. 경로 시간이 있어도 접근 가능한 이동을 보장하지 않습니다.",
    source: en ? "Journey accessibility evidence unverified" : "이동 접근성 근거 미확인", checkedAt: "", href: "#navigation",
  };
}

function evidenceReadiness(places, current, currentIds, requiredKeys, en) {
  const label = en ? "Place accessibility evidence" : "장소 편의근거";
  const fallbackSource = en ? "Official accessible travel information" : "공식 무장애 여행정보";
  const list = Array.isArray(places) ? places : [];
  if (!list.length) return {
    id: "evidence", label, state: "recheck", summary: en ? "No places have been added to the itinerary." : "일정에 보관한 장소가 없습니다.",
    source: fallbackSource, checkedAt: "", href: "#places",
  };
  const sourced = list.filter((place) => typeof place.source === "string" && place.source.trim());
  const needed = [...new Set((Array.isArray(requiredKeys) ? requiredKeys : []).filter(key => typeof key === "string" && key.trim()).map(key => key.trim()))];
  const verified = sourced.filter((place) => needed.length && Array.isArray(currentIds) && currentIds.includes(place.id) && Number.isFinite(Date.parse(place.checkedAt)) && Array.isArray(place.accessibility) && place.accessibility.some(item => typeof item?.key === "string" && item.key.trim()));
  const sources = [...new Set(sourced.map((place) => place.source))];
  const checkedTimes = sourced.map((place) => Date.parse(place.checkedAt)).filter(Number.isFinite);
  const checkedAt = checkedTimes.length ? new Date(Math.min(...checkedTimes)).toISOString() : "";
  if (!current || !verified.length) return {
    id: "evidence", label, state: "recheck",
    summary: !current
      ? en ? "Search again with your current preferences to check the facilities you need. Saved scores do not confirm current facility details." : "현재 선택한 편의로 다시 조회해 주세요. 저장된 점수만으로 필요한 편의 항목을 확인할 수 없습니다."
      : en ? `Saved places: ${list.length}. Check current item-level official evidence and retrieval times.` : `${list.length}곳 모두 현재 조건의 항목별 공식 편의근거와 조회 시각을 다시 확인해야 합니다.`,
    source: sources.join(" · ") || fallbackSource, checkedAt, href: "#places",
  };
  const counts = { confirmed: 0, unknown: 0, negative: 0 };
  for (const place of verified) {
    const fields = new Map();
    for (const item of place.accessibility) {
      if (!item || typeof item.key !== "string" || !item.key.trim()) continue;
      const key = item.key.trim();
      const state = ["confirmed", "negative"].includes(item.state) ? item.state : "unknown";
      fields.set(key, fields.has(key) && fields.get(key) !== state ? "unknown" : state);
    }
    for (const key of needed) counts[fields.get(key) || "unknown"]++;
  }
  const missing = list.length - verified.length;
  return {
    id: "evidence", label, state: counts.negative || !counts.confirmed ? "recheck" : counts.unknown || missing ? "partial" : "confirmed",
    summary: en
      ? `Places: ${list.length} · Reported available ${counts.confirmed} · Unknown ${counts.unknown} · Reported unavailable ${counts.negative}. Places lacking item-level evidence: ${missing}. Official records do not guarantee access on site.`
      : `${list.length}곳 · 확인됨 ${counts.confirmed} · 미확인 ${counts.unknown} · 미제공 기록 ${counts.negative}. 항목별 근거 없는 장소 ${missing}곳. 공식 기록이며 현장 이용을 보장하지 않습니다.`,
    source: sources.join(" · ") || fallbackSource, checkedAt, href: "#places",
  };
}

export function assessDepartureReadiness({
  travelStart = "", today = "", weather = null, weatherLoading = false,
  crowd = null, crowdPlaceId, generatedAt = "", routeCoverage, places = [], placeCriteriaCurrent = false, currentPlaceIds, requiredFacilityKeys, scheduleAssignments = {}, locale = "ko",
} = {}) {
  const phase = assessTripDatePhase(travelStart, today, locale);
  const en = locale === "en";
  const items = [
    weatherReadiness({ travelStart, weather, weatherLoading }, en),
    crowdReadiness({ crowd, crowdPlaceId, generatedAt, places, travelStart, scheduleAssignments }, en),
    transportReadiness(routeCoverage, en),
    mobilityReadiness(en),
    evidenceReadiness(places, placeCriteriaCurrent, currentPlaceIds, requiredFacilityKeys, en),
  ];
  const hasRecheck = items.some((item) => item.state === "recheck");
  const hasPartial = items.some((item) => item.state === "partial");
  const state = phase.id === "past" || phase.id === "no-date" || hasRecheck
    ? "recheck"
    : hasPartial ? "partial" : "confirmed";
  return { state, phase, items };
}

