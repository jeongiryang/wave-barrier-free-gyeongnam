import type { ToneEntry } from "../../lib/tone-copy";

// 화면 말투(명세 27) 적용 대상. 우선순위 1: 빈 상태와 안내 문구.
// 버튼 이름, 실패 안내, 데이터 근거 표기(제공처·조회 시각), 수치와 단위는 이 표에 넣지 않는다.
export const courseGuideTones = {
  intro: { standard: "담아둔 장소 가까이에서 식사·휴식·관광을 하나씩 더해보세요.", gyeongnam: "담아둔 장소 가까이에서 식사·휴식·관광을 하나씩 더해보이소." },
  idle: { standard: "활동에 맞는 후보를 찾아주세요.", gyeongnam: "활동에 맞는 후보를 찾아주이소." },
  empty: { standard: "조건과 거리에 맞는 후보가 아직 없어요. 범위를 바꾸거나 다른 활동을 살펴보세요.", gyeongnam: "조건과 거리에 맞는 후보가 아직 없어예. 범위를 바꾸거나 다른 활동을 살펴보이소." },
} satisfies Record<string, ToneEntry>;
