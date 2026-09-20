import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  appendFinalText,
  speechCaptureSupported,
  speechErrorMessage,
} from "../lib/speech-capture.js";

test("appendFinalText joins phrases and retains the newest characters at the limit", () => {
  assert.equal(appendFinalText("첫 문장", "둘째 문장", 20), "첫 문장 둘째 문장");
  assert.equal(appendFinalText("123456", "789", 7), "456 789");
  assert.equal(appendFinalText("", " 새 문장 ", 20), "새 문장");
});

test("speech errors have fixed safe messages including a silent abort", () => {
  assert.equal(speechErrorMessage("not-supported"), "이 브라우저에서는 말소리를 글자로 바꿀 수 없어요.");
  assert.equal(speechErrorMessage("permission-denied"), "마이크를 쓸 수 없어요. 브라우저 설정에서 허용할 수 있어요.");
  assert.equal(speechErrorMessage("no-speech"), "소리가 들리지 않았어요.");
  assert.equal(speechErrorMessage("network"), "브라우저가 음성을 처리하지 못했어요.");
  assert.equal(speechErrorMessage("aborted"), "");
  assert.equal(speechErrorMessage("unknown"), "지금은 사용할 수 없어요.");
});

test("support detection is safe without a browser and the pure helper has no private-data side effects", async () => {
  assert.equal(speechCaptureSupported(), false);
  const source = await readFile(new URL("../lib/speech-capture.js", import.meta.url), "utf8");
  for (const forbidden of ["fetch(", "XMLHttpRequest", "navigator.geolocation", "localStorage", "sessionStorage", "MediaRecorder"]) {
    assert.equal(source.includes(forbidden), false, `must not reference ${forbidden}`);
  }
});
