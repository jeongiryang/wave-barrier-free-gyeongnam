"use client";
import { useState } from "react";
import { KAKAO_T_URL } from "../../lib/kakao-travel.js";
export default function KakaoTaxiLink({ destination }: { destination: { name: string; address?: string } }) {
  const [notice, setNotice] = useState("");
  const label = [destination.name, destination.address].filter(Boolean).join(" · ");
  return <section aria-label="카카오 T로 이동"><p><b>택시로 이동하기</b> · {label}</p><div className="travel-book-actions"><button type="button" onClick={() => { if (!navigator.clipboard) { setNotice(`복사할 목적지: ${label}`); return; } void navigator.clipboard.writeText(label).then(() => setNotice("목적지를 복사했어요. 카카오 T에서 목적지를 검색해 주세요.")).catch(() => setNotice(`복사할 목적지: ${label}`)); }}>목적지 복사</button><a href={KAKAO_T_URL} target="_blank" rel="noopener noreferrer">카카오 T 열기 ↗</a></div><p>카카오 T에서 출발지·목적지와 요금을 확인하고 호출하세요. 휠체어 탑승 등 필요한 차량 조건은 호출 전 확인해 주세요.</p>{notice && <p role="status">{notice}</p>}</section>;
}
