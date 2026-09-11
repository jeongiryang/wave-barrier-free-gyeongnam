export const KAKAO_T_URL = "https://service.kakaomobility.com/launch/kakaot/?ref=KM_homepage_a";
export const WAVE_ORIGIN = "https://wave-barrier-free-gyeongnam.vercel.app";
export const TRAVEL_CARD_IMAGE = `${WAVE_ORIGIN}/media/wave-travel-card.jpg`;

// Only public itinerary fields enter a public card. Preferences, notes and location stay private.
export function publicTravelBody(trip) {
  return { selections: { region: trip.region, theme: trip.themes.join(","), profiles: [], locale: "ko", travelStart: trip.travelStart, travelEnd: trip.travelEnd, dayStartTime: trip.dayStartTime, selectedPlaceIds: trip.placeIds, scheduleAssignments: trip.scheduleAssignments, visitMinutesByPlaceId: trip.visitMinutesByPlaceId }, origin: { label: "" } };
}
export function travelCard(trip, url) {
  const target = new URL(url);
  if (target.origin !== WAVE_ORIGIN || !/^\/trip\/[a-f0-9]{12}$/.test(target.pathname) || target.search || target.hash) throw new Error("공유 링크를 확인해 주세요.");
  const link = { webUrl: target.href, mobileWebUrl: target.href };
  return { objectType: "feed", content: { title: `${trip.region}에서 함께하는 여행`, description: `${trip.travelStart} — ${trip.travelEnd} · 여행지 ${trip.placeIds.length}곳`, imageUrl: TRAVEL_CARD_IMAGE, link }, buttons: [{ title: "여행 일정 보기", link }] };
}
export function privateTravelMessage(trip, id) {
  const link = { web_url: `${WAVE_ORIGIN}/my-trips/${id}`, mobile_web_url: `${WAVE_ORIGIN}/my-trips/${id}` };
  return { object_type: "feed", content: { title: trip.title, description: `${trip.region} · ${trip.travelStart} — ${trip.travelEnd} · 여행지 ${trip.placeIds.length}곳`, image_url: TRAVEL_CARD_IMAGE, link }, buttons: [{ title: "내 여행 이어가기", link }] };
}

export class KakaoMessageError extends Error {
  constructor(message, status = 502, code = "SEND_FAILED") { super(message); this.status = status; this.code = code; }
}
export async function sendKakaoMemo(accessToken, template, request = fetch) {
  let response, result;
  try {
    response = await request("https://kapi.kakao.com/v2/api/talk/memo/default/send", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" }, body: new URLSearchParams({ template_object: JSON.stringify(template) }), signal: AbortSignal.timeout(10000), redirect: "error" });
    result = await response.json();
  } catch { throw new KakaoMessageError("전송 결과를 확인하지 못했어요. 카카오톡 나와의 채팅을 먼저 확인해 주세요. 중복을 막기 위해 1분 뒤 다시 보낼 수 있습니다."); }
  if (response.ok && result.result_code === 0) return;
  if (result.code === -402) throw new KakaoMessageError("나에게 보내기를 사용하려면 카카오 메시지 전송에 동의해 주세요.", 403, "CONSENT_REQUIRED");
  if (response.status === 401 || result.code === -401) throw new KakaoMessageError("카카오 연결을 다시 확인해 주세요.", 403, "CONSENT_REQUIRED");
  if (response.status === 429 || result.code === -10) throw new KakaoMessageError("카카오 전송 한도에 도달했습니다. 잠시 뒤 이용해 주세요.", 429, "QUOTA");
  throw new KakaoMessageError("카카오톡으로 보내지 못했습니다. 내 여행은 계속 이용할 수 있습니다.");
}
