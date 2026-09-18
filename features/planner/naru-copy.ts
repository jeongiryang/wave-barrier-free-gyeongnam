import type { ToneEntry } from "../../lib/tone-copy";

// 화면 말투(명세 27) 적용 대상. 우선순위 2: 나루 소개와 도움말 한 줄.
// 나루가 만들어 내는 답변 문장은 여기에 없다. 나루 말투는 명세 28에서 다룬다.
// 버튼 이름, 오류 문구, 개인정보 안내, 확인·미확인 표기는 이 표에 넣지 않는다.
export const naruGuideTones = {
  starterHint: { standard: "필요한 것만 고르세요. 나중에 여행 조건에서 언제든 바꿀 수 있습니다.", gyeongnam: "필요한 것만 고르이소. 나중에 여행 조건에서 언제든 바꿀 수 있어예." },
  promptTitle: { standard: "이렇게 시작해 보세요", gyeongnam: "이렇게 시작해 보이소" },
  evidenceEmpty: { standard: "여행지를 찾으면 장소별 근거를 모아드릴게요.", gyeongnam: "여행지를 찾으면 장소별 근거를 모아드릴게예." },
} satisfies Record<string, ToneEntry>;
