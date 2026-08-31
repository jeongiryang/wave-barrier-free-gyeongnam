import Link from "next/link";
import {
  ACCESSIBILITY_REPORT_FIELDS,
  ACCESSIBILITY_REPORT_STATUSES,
} from "../../../lib/community/field-report.js";
import { communityDate, type CommunityPost } from "../../../lib/community/types";

const fieldLabels = new Map(ACCESSIBILITY_REPORT_FIELDS.map((item) => [item.id, item.label]));
const statusLabels = new Map(ACCESSIBILITY_REPORT_STATUSES.map((item) => [item.id, item.label]));

export default function CommunityFieldReport({ post }: { post: CommunityPost }) {
  const fieldReports = post.fieldReports || [];
  const journalPlaces = post.journalPlaces || [];
  if (!fieldReports.length && !journalPlaces.length && !post.isSample) return null;
  return <>
    {post.isSample && <aside className="community-sample-notice"><strong>기능 확인용 샘플</strong><p>실제 여행자가 작성한 현장 후기가 아닙니다. 샘플에는 구조화 현장 제보를 표시하지 않습니다.</p></aside>}
    {journalPlaces.length > 1 && <section className="detail-journal" aria-labelledby="detail-journal-title"><header><small>TRAVEL JOURNAL</small><h2 id="detail-journal-title">이 여행일지의 장소</h2></header><ol>{journalPlaces.map((place, index) => <li key={place.id}><span>{index + 1}</span><div><b>{place.name}</b><small>{place.day || "방문일 미입력"}</small></div><Link href={`/community?placeId=${encodeURIComponent(place.id)}&placeName=${encodeURIComponent(place.name)}`}>이 장소 이야기</Link></li>)}</ol></section>}
    {fieldReports.length > 0 && !post.isSample && <section className="detail-field-report" aria-labelledby="detail-field-report-title">
      <header><div><small>TRAVELER FIELD REPORT</small><h2 id="detail-field-report-title">여행자 현장 제보</h2></div><p>작성자 1명이 남긴 개별 경험입니다. 공식 편의근거 점수에는 반영하지 않습니다.</p></header>
      <dl><div><dt>연결 장소</dt><dd>{post.placeName || "장소 정보 없음"}</dd></div><div><dt>방문일</dt><dd>{post.visitDate || "입력하지 않음"}</dd></div><div><dt>작성 시각</dt><dd>{communityDate(post.createdAt)}</dd></div><div><dt>공개 상태</dt><dd>공개 중 · 신고 가능</dd></div></dl>
      <ul>{fieldReports.map((report) => <li key={report.field}><strong>{fieldLabels.get(report.field) || report.field}</strong><span className={`report-${report.status}`}>{statusLabels.get(report.status) || report.status}</span>{report.note && <p>{report.note}</p>}</li>)}</ul>
    </section>}
  </>;
}
