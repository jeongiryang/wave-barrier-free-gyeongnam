import { handlePortableApi } from "../../../worker/index";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handlePortableApi(request);
}

export async function POST(request: Request) {
  return handlePortableApi(request);
}
