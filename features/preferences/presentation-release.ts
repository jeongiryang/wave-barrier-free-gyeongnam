/** Owner temporarily limits the public experience to Korean and the light theme.
 * Preserve the deferred variants for isolated development regression coverage.
 * Production builds cannot opt in, including through saved browser values.
 */
export function presentationOptionsEnabled(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  try { return window.localStorage.getItem("wave-dev-presentation") === "enabled"; }
  catch { return false; }
}
