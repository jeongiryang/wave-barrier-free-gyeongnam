"use client";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { useTripAlternatives } from "../hooks/useTripAlternatives";

export default function TripAlternativeTools({ trip, alternatives }: {
  trip: ReturnType<typeof useTripSelection>; alternatives: ReturnType<typeof useTripAlternatives>;
}) {
  return <>
    {trip.saved.length > 0 && <details className="place-evidence"><summary>장소·날짜 대안 비교</summary>
      <p>어느 곳을 바꿔 볼까요? 원래 일정과 비교한 뒤 한 곳만 바꿀 수 있어요.</p>
      <div className="travel-book-actions" style={{ padding: 14 }}>{trip.orderedSavedPlaces.map(place => <button type="button" key={place.id} onClick={() => alternatives.open(place.id)}>{place.name} 비교</button>)}</div>
    </details>}
    {(alternatives.notice || alternatives.canUndo) && <div className="result-notice">
      <p role="status">{alternatives.notice}</p>
      {alternatives.canUndo && <button type="button" onClick={alternatives.undoReplacement}>방금 교체 되돌리기</button>}
    </div>}
  </>;
}
