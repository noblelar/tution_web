import assert from "node:assert/strict";
import { test } from "node:test";

import {
  characterCount,
  feedbackMaximumLength,
  feedbackQueryMessageMaximumLength,
  feedbackQuerySubjectMaximumLength,
  isFeedbackQueryCategory,
  normalizeRequiredText,
  optionalIdentifier,
} from "./feedback-rules";

test("feedback and query text limits count Unicode characters", () => {
  assert.equal(feedbackMaximumLength, 7_500);
  assert.equal(feedbackQueryMessageMaximumLength, 7_500);
  assert.equal(feedbackQuerySubjectMaximumLength, 160);
  assert.equal(characterCount("🧪".repeat(160)), 160);
  assert.equal(normalizeRequiredText(`  ${"🧪".repeat(160)}  `, 160), "🧪".repeat(160));
  assert.equal(normalizeRequiredText("🧪".repeat(161), 160), null);
});

test("required query text is trimmed and cannot be blank", () => {
  assert.equal(normalizeRequiredText("  Progress update  ", 160), "Progress update");
  assert.equal(normalizeRequiredText("   ", 160), null);
  assert.equal(normalizeRequiredText(undefined, 160), null);
});

test("query categories remain constrained to the backend vocabulary", () => {
  for (const value of [
    "feedback_follow_up",
    "academic_progress",
    "session",
    "booking",
    "attendance",
    "other",
  ]) {
    assert.equal(isFeedbackQueryCategory(value), true);
  }
  assert.equal(isFeedbackQueryCategory("billing"), false);
});

test("optional identifiers distinguish omission from malformed values", () => {
  assert.equal(optionalIdentifier(undefined), undefined);
  assert.equal(optionalIdentifier(" feedback-id "), "feedback-id");
  assert.equal(optionalIdentifier("   "), null);
  assert.equal(optionalIdentifier(42), null);
});
