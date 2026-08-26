"use client";

import { useSyncExternalStore } from "react";
import { authClient } from "../../../lib/auth/client";

const subscribeToHydration = () => () => undefined;
const browserSnapshot = () => true;
const serverSnapshot = () => false;

/**
 * Neon Auth can restore its browser cache before React hydrates. Holding the
 * session behind a mount boundary keeps the server HTML and first client tree
 * identical, then exposes the real account state immediately after hydration.
 */
export function useHydratedSession() {
  const session = authClient.useSession();
  const hydrated = useSyncExternalStore(subscribeToHydration, browserSnapshot, serverSnapshot);

  return {
    ...session,
    data: hydrated ? session.data : null,
    isPending: !hydrated || session.isPending,
  };
}
