import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import AccessibleDateInput from "../../../components/AccessibleDateInput";
import { communityToday } from "../../../lib/community/field-report.js";
import type { CommunityPostInput } from "../client/api";

export default function CommunityAccessibilityReportEditor({ values, setValues }: { values: CommunityPostInput; setValues: Dispatch<SetStateAction<CommunityPostInput>> }) {
  if (values.category !== "field-report") return null;
  return <section className="editor-accessibility-report" aria-labelledby="accessibility-report-editor-title">
    <header><small>TRAVELER CHECK · 공식 정보와 별도</small><h2 id="accessibility-report-editor-title">현장에서 확인한 정보</h2></header>
    <p>여행자가 직접 확인한 내용이에요. W.A.V.E가 확인한 정보가 아니에요.</p>
    {values.placeId && values.placeName ? <div className="editor-accessibility-place"><small>선택한 공개 관광지</small><strong>{values.placeName}</strong><span>콘텐츠 ID {values.placeId}</span></div> : <div className="editor-field-empty" role="status"><p>공개 관광지를 먼저 선택해 주세요. 현재 위치나 좌표는 받지 않습니다.</p><Link href="/planner">여행 설계에서 관광지 선택</Link></div>}
    <label className="editor-visit-date">확인한 날짜<AccessibleDateInput required max={communityToday()} value={values.visitDate} onChange={(event) => setValues((current) => ({ ...current, visitDate: event.target.value }))} /><small>실제로 확인한 날짜만 입력해 주세요. 미래 날짜는 등록할 수 없습니다.</small></label>
    <p className="editor-privacy-note">장애 유형·건강정보·복지 수급 여부·GPS 좌표·사진은 요청하거나 저장하지 않습니다.</p>
  </section>;
}
