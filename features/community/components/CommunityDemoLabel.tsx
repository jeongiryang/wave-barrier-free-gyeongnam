export default function CommunityDemoLabel({ demoBatchId, kind = "post" }: { demoBatchId: string | null; kind?: "post" | "comment" }) {
  if (!demoBatchId) return null;
  return <span className="community-demo-label">{kind === "comment" ? "합성 데모 댓글" : "합성 데모 예시 · 반응 수 시연 포함"}</span>;
}
