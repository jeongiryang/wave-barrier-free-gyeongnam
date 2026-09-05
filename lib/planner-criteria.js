export const THEME_IDS = ["nature", "history", "leisure", "food"];

/** New multi-theme requests and older single-theme shared links use one parser. */
export function normalizeThemes(value, fallback = "nature") {
  const values = Array.isArray(value) ? value : String(value || fallback).split(",");
  const valid = [...new Set(values.filter((item) => THEME_IDS.includes(item)))];
  return valid.length ? valid : ["nature"];
}

export function criteriaSignature({ region, themes, selected, locale }) {
  return JSON.stringify([region, normalizeThemes(themes).sort(), [...new Set(selected)].sort(), locale]);
}

/** Fair interleaving keeps a small result budget from dropping the last theme. */
export function mergeThemeResults(groups, limit = 12) {
  const result = [];
  const seen = new Set();
  const length = Math.max(0, ...groups.map((group) => group.length));
  for (let index = 0; index < length && result.length < limit; index++) {
    for (const group of groups) {
      const item = group[index];
      if (!item || !item.contentid || seen.has(String(item.contentid))) continue;
      seen.add(String(item.contentid));
      result.push(item);
      if (result.length === limit) break;
    }
  }
  return result;
}
