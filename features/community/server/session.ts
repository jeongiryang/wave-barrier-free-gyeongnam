import { getAuth } from "../../../lib/auth/server";

export type CommunityUser = { id: string; name?: string | null; email: string };

function hasSessionCookie(request: Request) {
  return /(?:^|;\s*)(?:__Secure-)?neon-auth\./.test(request.headers.get("cookie") || "");
}

export async function optionalCommunityUser(request: Request): Promise<CommunityUser | null> {
  if (!hasSessionCookie(request)) return null;
  const auth = getAuth();
  if (!auth) return null;
  try {
    const result = await auth.getSession();
    return (result.data?.user as CommunityUser | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function requiredCommunityUser() {
  const auth = getAuth();
  if (!auth) return { error: "unavailable" as const };
  try {
    const result = await auth.getSession();
    const user = result.data?.user as CommunityUser | undefined;
    return user?.id ? { user } : { error: "unauthenticated" as const };
  } catch {
    return { error: "unavailable" as const };
  }
}

export function communityAuthorName(user: CommunityUser) {
  return String(user.name || "여행자").trim().slice(0, 40) || "여행자";
}
