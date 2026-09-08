/** A key or legacy ready state does not establish a completed provider request. */
export function verifiedPublicTransport(provider, allowEmpty = false) {
  if (provider?.configured !== true || provider.queryStatus !== "success") return false;
  const count = provider.resultCount;
  if (!Number.isSafeInteger(count) || count < 0) return false;
  return count > 0 ? provider.state === "connected" : allowEmpty && provider.state === "ready";
}
