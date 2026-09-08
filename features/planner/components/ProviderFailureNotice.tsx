import type { ApiStatus } from "../types";
import { providerFailureMessage } from "../../../lib/provider-failure.js";

export default function ProviderFailureNotice({ statuses, en }: { statuses: ApiStatus[]; en: boolean }) {
  const failures = statuses.filter(status => status.state === "error" || status.partial)
    .flatMap(status => status.failure ? [status.failure] : status.failures?.length ? status.failures : [undefined]);
  const messages = [...new Set(failures.map(failure => providerFailureMessage(failure, en)))];
  return <div className="result-notice error" role="status">
    <strong>{en ? "Some travel information could not be checked." : "일부 여행정보를 확인하지 못했습니다."}</strong>
    {messages.map(message => <p key={message}>{message}</p>)}
    <p>{en ? "Only verified places are shown. Your itinerary is kept." : "확인된 장소만 표시하며 기존 일정은 유지합니다."}</p>
    <a href="#conditions">{en ? "Review preferences" : "여행 조건 다시 선택"}</a>
  </div>;
}
