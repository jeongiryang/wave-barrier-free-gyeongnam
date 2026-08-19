"use client";

import { createAuthClient } from "@neondatabase/auth/next";

/** 브라우저 전체에서 같은 세션 캐시와 cross-tab 동기화를 공유한다. */
export const authClient = createAuthClient();
