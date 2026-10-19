export const feedbackMaximumLength = 7_500;
export const feedbackQuerySubjectMaximumLength = 160;
export const feedbackQueryMessageMaximumLength = 7_500;

export const feedbackQueryCategories = [
  "feedback_follow_up",
  "academic_progress",
  "session",
  "booking",
  "attendance",
  "other",
] as const;

export type FeedbackQueryCategory = (typeof feedbackQueryCategories)[number];

export function characterCount(value: string): number {
  return Array.from(value).length;
}

export function normalizeRequiredText(value: unknown, maximumLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || characterCount(normalized) > maximumLength) return null;
  return normalized;
}

export function optionalIdentifier(value: unknown): string | undefined | null {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}

export function isFeedbackQueryCategory(value: unknown): value is FeedbackQueryCategory {
  return typeof value === "string" && feedbackQueryCategories.some((category) => category === value);
}
