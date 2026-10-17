"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import type { CheckInContext, CheckInResult } from "@/lib/attendance-types";
import { formatSessionDateTime, formatSessionTime } from "@/lib/session-rules";

export function CheckIn({ token }: { token: string }) {
  const [context, setContext] = useState<CheckInContext | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(0);

  const loadContext = useCallback(async () => {
    if (!token) {
      setError("This check-in link is incomplete.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await requestCheckInContext(token);
      if (!result) {
        setSignedOut(true);
        return;
      }
      setSignedOut(false);
      setContext(result);
      setSelected(result.candidates.filter((candidate) => !candidate.alreadyCheckedIn).map((candidate) => candidate.bookingId));
    } catch (caught) {
      setError(message(caught, "This check-in code is unavailable."));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function start() {
      try {
        const result = await requestCheckInContext(token);
        if (cancelled) return;
        if (!result) {
          setSignedOut(true);
          return;
        }
        setContext(result);
        setSelected(result.candidates.filter((candidate) => !candidate.alreadyCheckedIn).map((candidate) => candidate.bookingId));
      } catch (caught) {
        if (!cancelled) setError(message(caught, "This check-in code is unavailable."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void start();
    return () => { cancelled = true; };
  }, [token]);

  const availableCount = useMemo(
    () => context?.candidates.filter((candidate) => !candidate.alreadyCheckedIn).length ?? 0,
    [context],
  );

  function toggleCandidate(bookingId: string) {
    setSelected((current) => current.includes(bookingId)
      ? current.filter((id) => id !== bookingId)
      : [...current, bookingId]);
  }

  async function submitCheckIn() {
    if (!selected.length) {
      setError("Select at least one student to check in.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
      if (!csrfResponse.ok) throw new Error("Request verification failed.");
      const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
      const response = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
        body: JSON.stringify({ token, bookingIds: selected }),
      });
      if (response.status === 401) {
        setSignedOut(true);
        return;
      }
      if (!response.ok) throw new Error(await apiError(response, "Students could not be checked in."));

      const result = (await response.json()) as CheckInResult;
      setCompleted(result.attendance.length);
      setSelected([]);
      await loadContext();
    } catch (caught) {
      setError(message(caught, "Students could not be checked in."));
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <CheckInFrame>
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600">Check-in unavailable</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">This link is incomplete</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Ask a member of staff to generate a current session check-in code.</p>
        </div>
      </CheckInFrame>
    );
  }

  if (loading) {
    return <CheckInFrame><p className="text-sm font-semibold text-slate-500">Opening the secure check-in…</p></CheckInFrame>;
  }

  if (signedOut) {
    const returnPath = `/app/check-in?token=${encodeURIComponent(token)}`;
    return (
      <CheckInFrame>
        <div className="grid gap-4 text-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-600">Sign-in required</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Sign in before checking in</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">Use the parent or student account connected to the booking, then return to this code.</p>
          </div>
          <Link className="rounded-xl bg-[#f45b23] px-4 py-3 text-sm font-black text-white transition hover:bg-[#da4c18]" href={`/login?returnTo=${encodeURIComponent(returnPath)}`}>Continue to sign in</Link>
        </div>
      </CheckInFrame>
    );
  }

  if (!context) {
    return (
      <CheckInFrame>
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600">Check-in unavailable</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">This code cannot be used</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{error || "Ask a member of staff to generate a current session code."}</p>
          <button className="mt-5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700" onClick={() => void loadContext()} type="button">Try again</button>
        </div>
      </CheckInFrame>
    );
  }

  return (
    <CheckInFrame>
      <header className="border-b border-slate-100 pb-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-600">Secure session check-in</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Session check-in</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">{formatSessionDateTime(context.startsAt, context.centreTimeZone)}–{formatSessionTime(context.endsAt, context.centreTimeZone)}</p>
        <p className="mt-1 text-xs text-slate-500">{context.centreName}</p>
      </header>

      {completed > 0 ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700" role="status">{completed === 1 ? "Student checked in successfully." : `${completed} students checked in successfully.`}</p> : null}
      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{error}</p> : null}

      <section className="grid gap-3" aria-labelledby="check-in-students">
        <div>
          <h2 className="text-base font-black text-slate-900" id="check-in-students">Select students</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">A parent can select every booked child and check them in together.</p>
        </div>
        {context.candidates.map((candidate) => {
          const checked = selected.includes(candidate.bookingId);
          return (
            <label className={`flex items-center gap-3 rounded-xl border p-4 transition ${candidate.alreadyCheckedIn ? "cursor-not-allowed border-emerald-200 bg-emerald-50" : checked ? "cursor-pointer border-orange-300 bg-orange-50" : "cursor-pointer border-slate-200 bg-white hover:border-slate-300"}`} key={candidate.bookingId}>
              <input checked={checked} className="h-4 w-4 accent-orange-600" disabled={candidate.alreadyCheckedIn || submitting} onChange={() => toggleCandidate(candidate.bookingId)} type="checkbox" />
              <span className="min-w-0 flex-1">
                <strong className="block text-sm font-black text-slate-900">{candidate.studentFirstName} {candidate.studentLastName}</strong>
                <span className="mt-1 block text-xs text-slate-500">{candidate.studentPeopleCode} · {candidate.subjectName} ({candidate.subjectCode})</span>
              </span>
              {candidate.alreadyCheckedIn ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">Checked in</span> : null}
            </label>
          );
        })}
      </section>

      {availableCount > 0 ? (
        <button className="w-full rounded-xl bg-[#f45b23] px-4 py-3 text-sm font-black text-white transition hover:bg-[#da4c18] disabled:cursor-not-allowed disabled:opacity-50" disabled={submitting || selected.length === 0} onClick={() => void submitCheckIn()} type="button">
          {submitting ? "Checking in…" : selected.length === 1 ? "Check in 1 student" : `Check in ${selected.length} students`}
        </button>
      ) : <p className="rounded-xl bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-600">Every eligible student on this account has checked in.</p>}
    </CheckInFrame>
  );
}

async function requestCheckInContext(token: string): Promise<CheckInContext | null> {
  const response = await fetch(`/api/attendance/check-in?token=${encodeURIComponent(token)}`, { cache: "no-store" });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(await apiError(response, "This check-in code is unavailable."));
  return (await response.json()) as CheckInContext;
}

function CheckInFrame({ children }: { children: ReactNode }) {
  return <main className="min-h-screen bg-slate-100 px-4 py-8 sm:py-12"><section className="mx-auto grid w-full max-w-xl gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-7">{children}</section></main>;
}

async function apiError(response: Response, fallback: string) {
  try {
    const result = (await response.json()) as { error?: string };
    return result.error ?? fallback;
  } catch {
    return fallback;
  }
}

function message(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
