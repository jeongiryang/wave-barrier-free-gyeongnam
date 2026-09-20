import assert from "node:assert/strict";
import test from "node:test";
import {
  communicationAnswers,
  communicationAnswerText,
  communicationQuestion,
  communicationQuestions,
  communicationTopics,
  isCommunicationAnswer,
  isCommunicationTopic,
  MAX_CUSTOM_ANSWER_LENGTH,
  normalizeCustomAnswer,
} from "../lib/onsite-communication.js";

test("all approved communication topics have fixed Korean and English questions", () => {
  assert.deepEqual(communicationTopics.map(({ id }) => id), ["step_free_entrance", "restroom", "elevator", "reservation", "payment", "assistance"]);
  for (const topic of communicationTopics) {
    assert.equal(communicationQuestion(topic.id), topic.question);
    assert.equal(communicationQuestion(topic.id, true), topic.questionEn);
    assert.equal(isCommunicationTopic(topic.id), true);
  }
  assert.equal(isCommunicationTopic("location"), false);
  assert.throws(() => communicationQuestion("location"), /Unknown communication topic/);
  assert.deepEqual(communicationQuestions("payment"), ["주문과 결제를 도와주세요.", "주문을 도와주실 수 있나요? 화면 대신 사람에게 주문하고 싶어요."]);
  assert.equal(communicationQuestions("payment", true).length, 2);
  assert.equal(communicationTopics.length, 6, "새 주제를 만들면 안 된다");
});

test("all approved staff answers use the fixed Korean and English text", () => {
  assert.deepEqual(communicationAnswers.map(({ id }) => id), ["left", "right", "behind_building", "use_elevator", "unavailable", "i_will_guide"]);
  for (const answer of communicationAnswers) {
    assert.equal(communicationAnswerText(answer.id), answer.label);
    assert.equal(communicationAnswerText(answer.id, true), answer.labelEn);
    assert.equal(isCommunicationAnswer(answer.id), true);
  }
  assert.equal(isCommunicationAnswer("custom"), true);
  assert.equal(isCommunicationAnswer("nearby"), false);
  assert.throws(() => communicationAnswerText("nearby"), /Unknown communication answer/);
});

test("custom answers are trimmed, empty-safe and capped at 200 characters", () => {
  assert.equal(MAX_CUSTOM_ANSWER_LENGTH, 200);
  assert.equal(normalizeCustomAnswer("  안내할게요.  "), "안내할게요.");
  assert.equal(normalizeCustomAnswer("   \n\t"), "");
  assert.equal(normalizeCustomAnswer("가".repeat(201)).length, 200);
  assert.equal(normalizeCustomAnswer(null), "null");
});
