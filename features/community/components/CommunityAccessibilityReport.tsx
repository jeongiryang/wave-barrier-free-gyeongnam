import type { CommunityPost } from "../../../lib/community/types";
import { fieldReportAgeMessage } from "../../../lib/community/field-report-board.js";

export default function CommunityAccessibilityReport({ post }: { post: CommunityPost }) {
  if (post.category !== "field-report" || !post.placeId || !post.placeName || !post.visitDate) return null;
  const age = fieldReportAgeMessage(post.visitDate);
  return <section className="detail-accessibility-report" aria-labelledby="detail-accessibility-report-title">
    <header><small>여행자 경험 · 공식 시설정보와 별도</small><h2 id="detail-accessibility-report-title">여행자가 남긴 정보</h2></header>
    <p>여행자가 직접 확인한 내용이에요. W.A.V.E가 확인한 정보가 아니에요.</p>
    <dl><div><dt>공개 관광지</dt><dd>{post.placeName}</dd></div><div><dt>확인한 날짜</dt><dd><time dateTime={post.visitDate}>{post.visitDate}</time>{age && <small>{age}</small>}</dd></div></dl>
  </section>;
}
