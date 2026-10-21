"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Icon } from "@/components/dashboard";
import {
  deferStudentReflectionPrompt,
  dismissStudentReflectionPrompt,
  getStudentReflectionPromptState,
  StudentNotesApiError,
} from "@/lib/student-notes-api";
import {
  dispatchStudentPromptRefresh,
  notificationsRefreshEvent,
  studentNotesUpdatedEvent,
  studentPromptRefreshEvent,
} from "@/lib/student-notes-events";
import type {
  StudentReflectionPromptDeferMinutes,
  StudentReflectionPromptState,
} from "@/lib/student-notes-types";

import { NoteDialog } from "./note-dialog";

const promptPollIntervalMilliseconds = 60_000;

export function StudentReflectionPrompt() {
  const router = useRouter();
  const [state, setState] = useState<StudentReflectionPromptState | null>(null);
  const [hiddenPromptID, setHiddenPromptID] = useState("");
  const [selectedMinutes, setSelectedMinutes] = useState<StudentReflectionPromptDeferMinutes>(30);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const nextState = await getStudentReflectionPromptState();
      setState(nextState);
      setSelectedMinutes(nextState.deferOptionsMinutes[0] ?? 30);
      setError("");
      window.dispatchEvent(new Event(notificationsRefreshEvent));
    } catch (caught) {
      if (caught instanceof StudentNotesApiError && caught.status === 403) {
        setState(null);
        return;
      }
      setError(promptErrorMessage(caught, "Your learning reminder could not be checked."));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), promptPollIntervalMilliseconds);
    const refreshOnFocus = () => void refresh();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const refreshFromApplication = () => {
      setHiddenPromptID("");
      void refresh();
    };
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener(studentNotesUpdatedEvent, refreshFromApplication);
    window.addEventListener(studentPromptRefreshEvent, refreshFromApplication);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener(studentNotesUpdatedEvent, refreshFromApplication);
      window.removeEventListener(studentPromptRefreshEvent, refreshFromApplication);
    };
  }, [refresh]);

  const prompt = state?.duePrompt?.id === hiddenPromptID ? undefined : state?.duePrompt;

  async function defer(minutes: StudentReflectionPromptDeferMinutes) {
    if (!prompt) return;
    setPending(true);
    setError("");
    try {
      const nextState = await deferStudentReflectionPrompt(prompt.id, minutes);
      setState(nextState);
      setHiddenPromptID("");
      dispatchStudentPromptRefresh();
    } catch (caught) {
      setError(promptErrorMessage(caught, "Your learning reminder could not be postponed."));
    } finally {
      setPending(false);
    }
  }

  async function dismiss() {
    if (!prompt) return;
    setPending(true);
    setError("");
    try {
      const nextState = await dismissStudentReflectionPrompt(prompt.id);
      setState(nextState);
      setHiddenPromptID("");
      dispatchStudentPromptRefresh();
    } catch (caught) {
      setError(promptErrorMessage(caught, "Your learning reminder could not be dismissed."));
    } finally {
      setPending(false);
    }
  }

  function recordNow() {
    if (!prompt) return;
    setHiddenPromptID(prompt.id);
    setError("");
    router.push(`/app/student/notes?record=1&prompt=${encodeURIComponent(prompt.id)}`);
  }

  if (!prompt) return null;

  const isEvening = prompt.slot === "evening";
  const reflectionsRemaining = Math.max(0, (state?.maximumDailyReflections ?? 2) - (state?.activeTodayCount ?? 0));

  return (
    <NoteDialog
      description={isEvening
        ? "Before today ends, write down what made sense and anything you would like to revisit during tuition."
        : "Take a moment to record something you learned in English, Maths, or Science today."}
      onOpenChange={(open) => { if (!open && !pending) void dismiss(); }}
      open
      size="small"
      title={isEvening ? "What else did you learn today?" : "What did you learn today?"}
    >
      <div className="px-5 py-6 sm:px-7">
        <div className="flex items-start gap-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-orange-600 text-white shadow-sm">
            <Icon name="book" size={21} />
          </span>
          <div>
            <p className="font-bold text-orange-950">
              {reflectionsRemaining === 1 ? "One reflection remains today" : `${reflectionsRemaining} reflections remain today`}
            </p>
            <p className="mt-1 text-sm leading-6 text-orange-900">
              Your note stays private to you and can help you remember what to ask about in tuition.
            </p>
          </div>
        </div>

        {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p> : null}

        <button
          className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 text-sm font-extrabold text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:cursor-wait disabled:opacity-60"
          disabled={pending}
          onClick={recordNow}
          type="button"
        >
          <Icon name="plus" size={18} /> Record what I learned
        </button>

        <div className="mt-5 rounded-2xl border border-slate-200 p-4">
          <label className="text-sm font-bold text-slate-800" htmlFor="student-reflection-reminder-delay">Remind me later</label>
          <div className="mt-2 flex gap-2">
            <select
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-orange-500 focus:ring-3 focus:ring-orange-100"
              disabled={pending}
              id="student-reflection-reminder-delay"
              onChange={(event) => setSelectedMinutes(Number(event.target.value) as StudentReflectionPromptDeferMinutes)}
              value={selectedMinutes}
            >
              {(state?.deferOptionsMinutes ?? [30, 60, 120]).map((minutes) => (
                <option key={minutes} value={minutes}>{deferLabel(minutes)}</option>
              ))}
            </select>
            <button
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-orange-300 hover:bg-orange-50 disabled:cursor-wait disabled:opacity-60"
              disabled={pending}
              onClick={() => void defer(selectedMinutes)}
              type="button"
            >
              Set reminder
            </button>
          </div>
        </div>

        <button
          className="mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-wait disabled:opacity-60"
          disabled={pending}
          onClick={() => void dismiss()}
          type="button"
        >
          {pending ? "Updating reminder…" : "Dismiss for 30 minutes"}
        </button>
      </div>
    </NoteDialog>
  );
}

function deferLabel(minutes: StudentReflectionPromptDeferMinutes): string {
  if (minutes === 60) return "In 1 hour";
  if (minutes === 120) return "In 2 hours";
  return "In 30 minutes";
}

function promptErrorMessage(caught: unknown, fallback: string): string {
  return caught instanceof StudentNotesApiError && caught.message.trim() ? caught.message : fallback;
}
