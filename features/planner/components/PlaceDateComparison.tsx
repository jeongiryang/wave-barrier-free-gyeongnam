"use client";
import { useRef, useState, useEffect } from "react";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { Place } from "../types";
import { plannerJson } from "../services/api";
import { validTripDate } from "../../../lib/trip-dates.js";

type CalendarData = { id: string; title: string; source: string; checkedAt: string; days: Array<{ date: string; rate: number }>; status: string };
export default function PlaceDateComparison({ place, trip, onMoved }: { place: Place; trip: ReturnType<typeof useTripSelection>; onMoved: () => void }) {
  const [data, setData] = useState<CalendarData | null>(null), [loading, setLoading] = useState(false), [notice, setNotice] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  const day = trip.scheduleAssignments[place.id] || trip.tripDays[0], pinned = Boolean(trip.fixedVisits[place.id]);
  const dates = [...new Set([...trip.tripDays, ...(data?.days.map(item => item.date) || [])])].sort();
  const current = data?.days.find(item => item.date === day), chosen = data?.days.find(item => item.date === selectedDate);
  async function load() {
    if (pending.current) return;
    const controller = new AbortController(); pending.current = controller; setLoading(true); setNotice("");
    try {
      const result = await plannerJson<CalendarData>(`/api/wave?action=crowd-calendar&contentId=${encodeURIComponent(place.id)}`, { signal: controller.signal, timeoutMs: 20000 });
      if (result.id !== place.id || !Array.isArray(result.days) || !Number.isFinite(Date.parse(result.checkedAt))) throw Error('Invalid calendar');
      const days = result.days.filter(item => validTripDate(item.date) && typeof item.rate === 'number' && Number.isFinite(item.rate) && item.rate >= 0 && item.rate <= 100).slice(0, 31);
      if (!controller.signal.aborted) setData({ ...result, days });
    } catch { if (!controller.signal.aborted) setNotice("날짜별 예측을 확인하지 못했어요. 현재 일정은 그대로 유지됩니다."); }
    finally { if (pending.current === controller) { pending.current = null; setLoading(false); } }
  }
  return <section className="account-settings">
    <h3>같은 장소, 다른 날짜</h3><p>한국관광공사가 제공한 날짜별 관광 집중률 예측을 비교해요. 비어 있는 날짜는 한적한 날로 판단하지 않습니다.</p>
    <div className="travel-book-actions"><button type="button" disabled={loading} onClick={() => void load()}>{loading ? "날짜별 예측 확인 중…" : data ? "날짜별 예측 다시 확인" : "날짜별 예측 확인"}</button>{loading && <button type="button" onClick={() => { pending.current?.abort(); setNotice("확인을 중단했어요."); }}>확인 중단</button>}</div>
    {data && <>
      {!data.days.length && <p role="status">이 장소의 날짜별 예측 자료가 없습니다. 현재 날짜를 유지하거나 여행 조건에서 원하는 날짜를 정하세요.</p>}
      <div className="place-comparison-scroll" role="region" tabIndex={0} aria-label="날짜별 관광 집중률"><table style={{ minWidth: 330 }}><caption className="sr-only">{place.name} 날짜별 예측과 현재 방문일 비교</caption><thead><tr><th scope="col">날짜</th><th scope="col">집중률 예측</th><th scope="col">내 선택</th></tr></thead><tbody>{dates.map(date => { const forecast = data.days.find(item => item.date === date); return <tr key={date}><th scope="row">{date}{date === day ? " · 현재" : ""}</th><td>{forecast ? `${forecast.rate.toFixed(1)}%` : "미확인"}{forecast && current && date !== day ? ` · 현재보다 ${Math.abs(forecast.rate - current.rate).toFixed(1)}%p ${forecast.rate < current.rate ? "낮음" : forecast.rate > current.rate ? "높음" : "같음"}` : ""}</td><td><button type="button" disabled={pinned || !forecast || date === day || !trip.canMoveToDate(place.id, date)} aria-pressed={selectedDate === date} onClick={() => setSelectedDate(date)}>{date === day ? "현재 방문일" : selectedDate === date ? "✓ 선택됨" : `${date.slice(5)} 선택`}</button></td></tr>; })}</tbody></table></div>
      <p>{data.source} · {new Date(data.checkedAt).toLocaleString("ko-KR")} 조회. 실시간 방문자 수가 아니며 당일 상황은 달라질 수 있어요.</p>
    </>}
    {pinned && <p>고정한 장소의 날짜는 유지합니다. 옮기려면 먼저 고정을 해제하세요.</p>}
    <p>다른 장소의 날짜는 그대로 두고 새 날짜의 마지막 순서에 옮깁니다. 필요한 경우 여행 기간을 최대 7일 안에서 넓힙니다. 뒤에 고정한 방문이 있으면 이동할 수 없어요. 새 날짜의 운영·날씨와 귀가 마감을 다시 확인하세요.</p>
    {chosen && <p>{selectedDate}로 옮길 예정입니다. 예측 {chosen.rate.toFixed(1)}%.</p>}
    <div className="travel-book-actions"><button type="button" disabled={!chosen || pinned || !trip.canMoveToDate(place.id, selectedDate)} onClick={() => { if (trip.movePlaceToDate(place.id, selectedDate)) { setNotice(`${selectedDate}로 방문일을 옮겼어요.`); onMoved(); } }}>이 날짜로 방문일 변경</button></div>
    <p role="status">{notice}</p>
  </section>;
}
