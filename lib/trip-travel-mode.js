const modes = ["walk", "bicycle", "transit", "car"];

/** Persist the traveler's choice, never a route response or a location. */
export function sanitizeTravelMode(value) {
  return typeof value === "string" && modes.includes(value) ? value : "transit";
}

export function travelModeLabel(value, locale = "ko") {
  const labels = locale === "en"
    ? { walk: "Walking", bicycle: "Bicycle", transit: "Public transport", car: "Car" }
    : { walk: "도보", bicycle: "자전거", transit: "대중교통", car: "자동차" };
  return labels[sanitizeTravelMode(value)];
}
