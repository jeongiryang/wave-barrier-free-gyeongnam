export const MAX_SPEECH_CAPTURE_LENGTH = 2000;

export function speechCaptureSupported() {
  if (typeof window === "undefined") return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function appendFinalText(current, addition, maxLength = MAX_SPEECH_CAPTURE_LENGTH) {
  const next = [String(current || "").trim(), String(addition || "").trim()].filter(Boolean).join(" ");
  return next.length > maxLength ? next.slice(next.length - maxLength) : next;
}

const SPEECH_ERROR_MESSAGES = {
  "not-supported": "이 브라우저에서는 말소리를 글자로 바꿀 수 없어요.",
  "permission-denied": "마이크를 쓸 수 없어요. 브라우저 설정에서 허용할 수 있어요.",
  "no-speech": "소리가 들리지 않았어요.",
  network: "브라우저가 음성을 처리하지 못했어요.",
  aborted: "",
  unknown: "지금은 사용할 수 없어요.",
};

export function speechErrorMessage(error) {
  return SPEECH_ERROR_MESSAGES[error] ?? SPEECH_ERROR_MESSAGES.unknown;
}
