import type { CommunityPost } from "../../../lib/community/types";

export default function CommunityVisitPhotos({ post }: { post: CommunityPost }) {
  if (!post.visitPhotos?.length) return null;
  return <section className="detail-field-report" aria-labelledby="visit-photos-title">
    <header><div><small>방문 사진</small><h2 id="visit-photos-title">사진으로 남긴 현장</h2></div><p>{post.placeName} · 방문 {post.visitDate || "날짜 미입력"}<br />작성자가 남긴 경험이며 방문 인증이나 공식 시설 확인을 뜻하지 않습니다.</p></header>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 24 }}>{post.visitPhotos.slice(0, 2).map((photo, index) => <figure key={index} style={{ margin: 0, minWidth: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Bounded metadata-free user JPEG is included in the detail response, never sent to an optimizer. */}
      <img src={photo.dataUrl} alt={photo.caption} width={photo.width} height={photo.height} loading="lazy" style={{ display: "block", width: "100%", height: "auto", maxHeight: 600, objectFit: "contain", borderRadius: 18, background: "var(--paper)" }} />
      <figcaption style={{ paddingBlock: 12, fontSize: 16, overflowWrap: "anywhere" }}>{photo.caption}</figcaption>
    </figure>)}</div>
  </section>;
}
