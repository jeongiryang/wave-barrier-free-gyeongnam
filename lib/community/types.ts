export type CommunityPost = {
  id: string;
  category: "general" | "place" | "review";
  title: string;
  content: string;
  region: string | null;
  placeId: string | null;
  placeName: string | null;
  authorName: string;
  createdAt: number;
  updatedAt: number;
  commentCount: number;
  likeCount: number;
  likedByMe: boolean;
  isOwner: boolean;
  isSample: boolean;
  visitDate: string | null;
  fieldReports: AccessibilityFieldReport[];
  journalPlaces: CommunityJournalPlace[];
};

export type AccessibilityFieldReport = {
  field: "entrance" | "elevator" | "toilet" | "parking" | "seating" | "visual" | "hearing";
  status: "confirmed" | "changed" | "not_checked";
  note: string;
};

export type CommunityJournalPlace = { id: string; name: string; day: string };

export type CommunityComment = {
  id: string;
  content: string;
  authorName: string;
  createdAt: number;
  updatedAt: number;
  isOwner: boolean;
};

export const COMMUNITY_CATEGORY_LABELS = {
  general: "여행 질문",
  place: "관광지 이야기",
  review: "여행 후기",
} as const;

export const COMMUNITY_REGIONS = ["", "창원", "진주", "통영", "사천", "김해", "밀양", "거제", "양산", "의령", "함안", "창녕", "고성", "남해", "하동", "산청", "함양", "거창", "합천"] as const;

export function communityDate(value: number) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
