export function getTabStorage() {
  try { return typeof window === 'undefined' ? null : window.sessionStorage; }
  catch { return null; }
}
