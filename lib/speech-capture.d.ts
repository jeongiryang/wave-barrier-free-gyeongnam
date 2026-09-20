export type SpeechCaptureState = {
  supported: boolean;
  listening: boolean;
  finalText: string;
  interimText: string;
  error: SpeechCaptureError | null;
};

export type SpeechCaptureError =
  | "not-supported"
  | "permission-denied"
  | "no-speech"
  | "network"
  | "aborted"
  | "unknown";

export const MAX_SPEECH_CAPTURE_LENGTH: number;
export function speechCaptureSupported(): boolean;
export function appendFinalText(current: string, addition: string, maxLength?: number): string;
export function speechErrorMessage(error: SpeechCaptureError): string;
