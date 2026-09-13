/** Coordinates are consumed only inside the geolocation callback, never put in journey/map state. */
export function localDistanceKilometres(position, publicPoint) {
  const values = [position?.latitude, position?.longitude, publicPoint?.lat, publicPoint?.lng];
  if (!values.every(Number.isFinite) || Math.abs(values[0]) > 90 || Math.abs(values[2]) > 90 || Math.abs(values[1]) > 180 || Math.abs(values[3]) > 180) return null;
  const rad = Math.PI / 180;
  const a = Math.sin((values[2] - values[0]) * rad / 2) ** 2 + Math.cos(values[0] * rad) * Math.cos(values[2] * rad) * Math.sin((values[3] - values[1]) * rad / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a))) * 10) / 10;
}
