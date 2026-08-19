const rainCodes = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const snowCodes = new Set([71, 73, 75, 77, 85, 86]);

const severity = { stable: 0, watch: 1, warning: 2, critical: 3 };

/**
 * 공식 예보와 관광 집중률을 사용자의 현재 여행안에 연결한다.
 * 공급자가 주지 않은 영업시간이나 실내 여부는 추정하지 않는다.
 */
export function assessTripImpact({ weatherDay, current, crowd, theme, destination, alternative } = {}) {
  const signals = [];
  const actions = [];

  if (weatherDay) {
    const code = Number(weatherDay.code || 0);
    const rainProbability = Number(weatherDay.rainProbability || 0);
    const rain = Number(weatherDay.rain || 0);
    const snow = Number(weatherDay.snow || 0);
    const uv = Number(weatherDay.uv || 0);
    const maximum = Number(weatherDay.max || 0);
    const isSnow = snow > 0 || snowCodes.has(code);
    const isStorm = [95, 96, 99].includes(code);
    const isRain = rainProbability >= 60 || rain >= 1 || rainCodes.has(code);

    if (isStorm || isSnow) {
      signals.push({
        id: "weather",
        level: "critical",
        label: "기상 영향 큼",
        title: isSnow ? "눈 예보가 이동과 접근로에 영향을 줄 수 있습니다." : "천둥번개 예보로 야외 이동을 다시 확인해야 합니다.",
        detail: isSnow
          ? `예상 적설 ${snow.toFixed(1)}cm · 미끄럼과 경사로 상태를 방문 전에 확인하세요.`
          : `강수 확률 ${Math.round(rainProbability)}% · 야외 체류를 줄이는 편이 안전합니다.`,
      });
    } else if (isRain) {
      signals.push({
        id: "weather",
        level: "warning",
        label: "비 영향 가능",
        title: "강수 예보가 야외 중심 일정에 영향을 줄 수 있습니다.",
        detail: `강수 확률 ${Math.round(rainProbability)}% · 예상 강수 ${rain.toFixed(1)}mm`,
      });
    } else if (uv >= 7 || maximum >= 30) {
      signals.push({
        id: "weather",
        level: "watch",
        label: "더위·자외선 주의",
        title: "긴 야외 이동과 대기 시간을 줄여 계획하세요.",
        detail: `최고 ${Math.round(maximum)}° · 자외선 지수 ${uv.toFixed(0)}`,
      });
    } else {
      signals.push({
        id: "weather",
        level: "stable",
        label: "예보 영향 낮음",
        title: "현재 예보에서 큰 기상 변수는 확인되지 않았습니다.",
        detail: `${weatherDay.label || "날씨 확인"} · 강수 확률 ${Math.round(rainProbability)}%`,
      });
    }

    if ((isStorm || isSnow || isRain) && ["nature", "leisure"].includes(theme)) {
      actions.push({ id: "culture", label: "역사·문화 후보로 다시 찾기" });
    }
  } else if (current) {
    signals.push({
      id: "weather",
      level: Number(current.precipitation || 0) > 0 ? "warning" : "watch",
      label: "현재 날씨만 확인",
      title: "여행 날짜 예보 범위 밖이라 현재 날씨를 참고합니다.",
      detail: `${current.label || "현재 날씨"} · 기온 ${Math.round(Number(current.temperature || 0))}°`,
    });
  }

  if (crowd && Number.isFinite(Number(crowd.rate))) {
    const rate = Number(crowd.rate);
    const level = rate >= 75 ? "critical" : rate >= 50 ? "warning" : rate >= 25 ? "watch" : "stable";
    signals.push({
      id: "crowd",
      level,
      label: rate >= 75 ? "집중률 매우 높음" : rate >= 50 ? "집중률 높음" : rate >= 25 ? "집중률 보통" : "집중률 낮음",
      title: rate >= 50
        ? `${destination || crowd.place || "선택 장소"} 대신 주변 후보도 비교해 보세요.`
        : `${destination || crowd.place || "선택 장소"}의 관광 집중률을 일정 판단에 반영했습니다.`,
      detail: `관광 집중률 예측 ${rate.toFixed(1)}% · 기준 ${crowd.baseYmd || "제공기관 최신값"}`,
    });
    if (rate >= 50 && alternative) actions.push({ id: "alternative", label: `${alternative} 경로와 비교` });
  }

  if (!signals.length) {
    signals.push({
      id: "pending",
      level: "watch",
      label: "일부 정보 미확인",
      title: "날씨·관광 집중률 일부를 확인하지 못했습니다.",
      detail: "추천 장소와 이동 경로는 계속 사용할 수 있습니다.",
    });
  }

  const level = signals.reduce((highest, signal) => severity[signal.level] > severity[highest] ? signal.level : highest, "stable");
  const headline = level === "critical"
    ? "일정을 바꾸는 편이 안전합니다."
    : level === "warning"
      ? "현재 일정에 영향을 줄 변수가 있습니다."
      : level === "watch"
        ? "준비를 보완하면 일정을 유지할 수 있습니다."
        : "확인된 범위에서 일정 유지가 가능합니다.";

  return { level, headline, signals, actions };
}
