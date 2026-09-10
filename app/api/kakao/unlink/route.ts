import { kakaoUnlinkWebhook } from "../../../../lib/auth/kakao-webhook.js";

export const GET = (request: Request) => kakaoUnlinkWebhook(request);
export const POST = (request: Request) => kakaoUnlinkWebhook(request);
