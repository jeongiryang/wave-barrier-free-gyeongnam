import type { Env } from "../shared/env";
import { buildPublicTransportContext } from "./public-context-model";
import { fetchPublicTransportSnapshot } from "./public-provider-queries";

export async function fetchTransportContext(env: Env, endLat: number, endLng: number) {
  const snapshot = await fetchPublicTransportSnapshot(env, endLat, endLng);
  return buildPublicTransportContext(env, snapshot);
}
