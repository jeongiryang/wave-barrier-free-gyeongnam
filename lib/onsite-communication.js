export const communicationTopics = [
  { id: "step_free_entrance", label: "계단 없는 입구", question: "계단 없는 입구를 안내해 주세요.", questionEn: "Please show me the step-free entrance." },
  { id: "restroom", label: "화장실", question: "이용 가능한 화장실을 안내해 주세요.", questionEn: "Please show me an available restroom." },
  { id: "elevator", label: "승강기", question: "이용 가능한 승강기를 안내해 주세요.", questionEn: "Please show me an available elevator." },
  { id: "reservation", label: "예약", question: "예약을 확인해 주세요.", questionEn: "Please check my reservation." },
  { id: "payment", label: "주문·결제", question: "주문과 결제를 도와주세요.", questionEn: "Please help me order and pay.", questions: ["주문과 결제를 도와주세요.", "주문을 도와주실 수 있나요? 화면 대신 사람에게 주문하고 싶어요."], questionsEn: ["Please help me order and pay.", "Could you help me order? I would like to order with a person instead of using the screen."] },
  { id: "assistance", label: "도움 요청", question: "이용 방법을 알기 쉽게 안내해 주세요.", questionEn: "Please explain how to use this place in an easy-to-understand way." },
  { id: "door", label: "출입문 도움", question: "문을 열기 어려워요. 도와주시거나 다른 출입구를 알려 주세요.", questionEn: "The door is difficult for me to open. Please help me or show me another entrance." },
];

export const communicationAnswers = [
  { id: "left", label: "왼쪽에 있어요", labelEn: "It is on the left." },
  { id: "right", label: "오른쪽에 있어요", labelEn: "It is on the right." },
  { id: "behind_building", label: "건물 뒤에 있어요", labelEn: "It is behind the building." },
  { id: "use_elevator", label: "승강기를 이용해 주세요", labelEn: "Please use the elevator." },
  { id: "unavailable", label: "지금은 이용하기 어려워요", labelEn: "It is not available right now." },
  { id: "i_will_guide", label: "제가 안내할게요", labelEn: "I will show you the way." },
];

export const MAX_CUSTOM_ANSWER_LENGTH = 200;

export function isCommunicationTopic(value) {
  return communicationTopics.some(topic => topic.id === value);
}

export function isCommunicationAnswer(value) {
  return value === "custom" || communicationAnswers.some(answer => answer.id === value);
}

export function communicationQuestion(topic, english = false) {
  const entry = communicationTopics.find(item => item.id === topic);
  if (!entry) throw new TypeError("Unknown communication topic");
  return english ? entry.questionEn : entry.question;
}

export function communicationQuestions(topic, english = false) {
  const entry = communicationTopics.find(item => item.id === topic);
  if (!entry) throw new TypeError("Unknown communication topic");
  return english ? entry.questionsEn || [entry.questionEn] : entry.questions || [entry.question];
}

export function communicationAnswerText(answer, english = false) {
  const entry = communicationAnswers.find(item => item.id === answer);
  if (!entry) throw new TypeError("Unknown communication answer");
  return english ? entry.labelEn : entry.label;
}

export function normalizeCustomAnswer(value) {
  return String(value).trim().slice(0, MAX_CUSTOM_ANSWER_LENGTH);
}
