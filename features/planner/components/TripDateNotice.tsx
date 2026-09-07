import { useSitePreferences } from "../../../components/SitePreferences";

export default function TripDateNotice({ notice, id }: { notice: { kind: "limit" | "adjusted" | "invalid"; end?: string } | null; id: string }) {
  const { locale } = useSitePreferences();
  const english = locale === "en";
  const message = !notice ? "" : notice.kind === "limit"
    ? english ? "Plan up to seven days. Choose an earlier end date." : "여행 일정은 최대 7일까지 만들 수 있어요. 도착일을 앞당겨 주세요."
    : notice.kind === "adjusted"
      ? english ? `The end date was adjusted to ${notice.end} to fit the start date and seven-day limit. Saved places keep their original dates.` : `출발일과 최대 7일 일정에 맞춰 도착일을 ${notice.end}(으)로 변경했어요. 저장한 장소의 날짜는 그대로 보관합니다.`
      : english ? "Choose a valid end date on or after the start date." : "실제 날짜와 출발일 이후의 도착일을 선택해 주세요.";
  return <p id={id} className="date-scope-note" role={message ? "status" : undefined}>{message}</p>;
}
