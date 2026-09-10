export async function GET() {
  const javascriptKey = process.env.KAKAO_MAP_JAVASCRIPT_KEY?.trim();
  return Response.json(javascriptKey ? { javascriptKey } : { error: "카카오 공유 설정이 필요합니다." }, { status: javascriptKey ? 200 : 503, headers: { "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff" } });
}
