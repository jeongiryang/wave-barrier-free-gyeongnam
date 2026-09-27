const eventName = 'wave:action-toast';
const pendingKey = 'wave-action-toast';
export function showActionToast(message: string, afterNavigation = false) {
  if (typeof window === 'undefined') return;
  if (afterNavigation) {
    try { sessionStorage.setItem(pendingKey, JSON.stringify({ message, expires: Date.now() + 15000 })); } catch { /* The saved action still succeeds without transient feedback storage. */ }
  }
  window.dispatchEvent(new CustomEvent(eventName, { detail: message }));
}
export { eventName, pendingKey };
