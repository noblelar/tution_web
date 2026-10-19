import type { FeedbackQueryStatus } from "@/lib/feedback-types";

export const feedbackButton = "rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:cursor-not-allowed disabled:opacity-50";
export const feedbackSecondaryButton = "rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:cursor-not-allowed disabled:opacity-50";
export const feedbackInput = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100";

export const queryStatusLabels: Record<FeedbackQueryStatus, string> = {
  open: "Open", assigned: "Assigned", awaiting_staff: "Awaiting staff",
  awaiting_parent: "Awaiting household", resolved: "Resolved",
};

export function feedbackDate(value: string, timeZone?: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    }).format(date);
  } catch {
    return date.toLocaleString("en-GB");
  }
}

export function feedbackError(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}
