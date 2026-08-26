const regions = [
  "창원", "진주", "통영", "사천", "김해", "밀양", "거제", "양산", "의령",
  "함안", "창녕", "고성", "남해", "하동", "산청", "함양", "거창", "합천",
];

const baseUrl = (process.env.PHOTO_COVERAGE_BASE_URL || "https://wave-barrier-free-gyeongnam.vercel.app").replace(/\/$/, "");
const minimumCoverage = Math.max(0, Math.min(1, Number(process.env.PHOTO_COVERAGE_MINIMUM || 0.5)));

async function json(url, timeoutMs = 25_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function reachableImage(url, timeoutMs = 15_000) {
  if (!/^https:\/\//.test(String(url || ""))) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { Accept: "image/*", Range: "bytes=0-2047" },
      redirect: "follow",
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") || "";
    await response.body?.cancel();
    return response.ok && contentType.toLowerCase().startsWith("image/");
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function inspectRegion(region) {
  try {
    const params = new URLSearchParams({ action: "plan", region, theme: "nature", profiles: "wheel", locale: "ko" });
    const plan = await json(`${baseUrl}/api/wave?${params}`);
    const places = Array.isArray(plan.places) ? plan.places.slice(0, 3) : [];
    const results = await Promise.all(places.map(async (place) => {
      if (await reachableImage(place.image)) return true;
      const photoParams = new URLSearchParams({
        action: "spot-photo", region, title: String(place.name || ""), tag: "관광지", contentId: String(place.id || ""),
      });
      const photo = await json(`${baseUrl}/api/wave?${photoParams}`);
      return reachableImage(photo.image);
    }));
    return { region, checked: places.length, found: results.filter(Boolean).length, error: "" };
  } catch (error) {
    return { region, checked: 0, found: 0, error: error instanceof Error ? error.message : "unknown error" };
  }
}

const results = [];
for (let index = 0; index < regions.length; index += 3) {
  results.push(...await Promise.all(regions.slice(index, index + 3).map(inspectRegion)));
}

const checked = results.reduce((sum, result) => sum + result.checked, 0);
const found = results.reduce((sum, result) => sum + result.found, 0);
const coverage = checked ? found / checked : 0;
for (const result of results) {
  console.log(`${result.region.padEnd(3)} ${result.found}/${result.checked}${result.error ? ` · ${result.error}` : ""}`);
}
console.log(`전체 ${found}/${checked} · ${(coverage * 100).toFixed(1)}%`);
if (!checked || coverage < minimumCoverage) process.exitCode = 1;
