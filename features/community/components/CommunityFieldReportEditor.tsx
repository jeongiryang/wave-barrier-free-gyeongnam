import type { Dispatch, SetStateAction } from "react";
import {
  ACCESSIBILITY_REPORT_FIELDS,
  ACCESSIBILITY_REPORT_STATUSES,
} from "../../../lib/community/field-report.js";
import type { CommunityPostInput } from "../client/api";

export default function CommunityFieldReportEditor({ values, setValues }: {
  values: CommunityPostInput;
  setValues: Dispatch<SetStateAction<CommunityPostInput>>;
}) {
  if (values.category !== "review") return null;

  const updateReport = (field: string, next: { status?: string; note?: string }) => {
    setValues((current) => {
      const existing = current.fieldReports.find((item) => item.field === field);
      const status = next.status ?? existing?.status ?? "";
      const note = next.note ?? existing?.note ?? "";
      const without = current.fieldReports.filter((item) => item.field !== field);
      if (!status) return { ...current, fieldReports: without };
      return {
        ...current,
        fieldReports: [...without, { field, status, note } as CommunityPostInput["fieldReports"][number]],
      };
    });
  };

  return <section className="editor-field-report" aria-labelledby="field-report-title">
    <header>
      <div><small>TRAVELER FIELD REPORT · 선택</small><h2 id="field-report-title">여행자 현장 접근성 제보</h2></div>
      <p>직접 확인한 항목만 선택하세요. 이 정보는 공식 편의근거 점수에 합산되지 않고 작성 시각과 함께 별도로 표시됩니다.</p>
    </header>
    <label className="editor-visit-date">방문일 (선택)<input type="date" value={values.visitDate} onChange={(event) => setValues((current) => ({ ...current, visitDate: event.target.value }))} /><small>방문일을 기억하지 못하면 비워 두세요.</small></label>
    {!values.placeId && <p className="editor-field-empty" role="status">여행 설계의 장소 상세에서 글쓰기를 열거나 여행일지 초안을 만들면 장소별 현장 제보를 추가할 수 있습니다.</p>}
    {values.placeId && <div className="editor-field-grid">
      {ACCESSIBILITY_REPORT_FIELDS.map((field) => {
        const report = values.fieldReports.find((item) => item.field === field.id);
        return <fieldset key={field.id}>
          <legend>{field.label}</legend>
          <label><span className="sr-only">{field.label} 확인 상태</span><select aria-label={`${field.label} 확인 상태`} value={report?.status || ""} onChange={(event) => updateReport(field.id, { status: event.target.value })}>
            <option value="">선택 안 함</option>
            {ACCESSIBILITY_REPORT_STATUSES.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
          </select></label>
          <label><span className="sr-only">{field.label} 메모</span><input aria-label={`${field.label} 메모`} value={report?.note || ""} disabled={!report} maxLength={160} placeholder="선택 메모" onChange={(event) => updateReport(field.id, { note: event.target.value })} /></label>
        </fieldset>;
      })}
    </div>}
  </section>;
}
