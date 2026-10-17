"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { FormDialog } from "@/components/ui/form-dialog";
import type { AttendanceContext, AttendanceQrToken, AttendanceRosterSession, AttendanceStatus } from "@/lib/attendance-types";
import type { CentreList, ManagedCentre } from "@/lib/centre-types";
import { formatSessionDateTime, formatSessionTime } from "@/lib/session-rules";
import { QrCode } from "./qr-code";

const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100";
const statuses: AttendanceStatus[] = ["present", "late", "absent", "excused"];

export function AttendanceManagement({ tutorWorkspace = false }: { tutorWorkspace?: boolean }) {
  const [centres, setCentres] = useState<ManagedCentre[]>([]);
  const [centreId, setCentreId] = useState("");
  const [context, setContext] = useState<AttendanceContext | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [qrToken, setQrToken] = useState<AttendanceQrToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedSession = useMemo(() => context?.sessions.find((item) => item.id === selectedSessionId) ?? context?.sessions[0] ?? null, [context, selectedSessionId]);
  const selectedSubjects = useMemo(() => selectedSession ? rosterSubjects(selectedSession) : [], [selectedSession]);

  const loadContext = useCallback(async (nextCentreId: string) => {
    const response = await fetch(`/api/attendance?centreId=${encodeURIComponent(nextCentreId)}`, { cache: "no-store" });
    if (!response.ok) throw new Error(await apiError(response, "Attendance could not be loaded."));
    const result = (await response.json()) as AttendanceContext;
    setContext(result);
    setSelectedSessionId((current) => result.sessions.some((item) => item.id === current) ? current : (result.sessions[0]?.id ?? ""));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/centres", { cache: "no-store" });
        if (!response.ok) throw new Error(await apiError(response, "Centres could not be loaded."));
        const result = (await response.json()) as CentreList;
        const available = (result.centres ?? []).filter((centre) => centre.status === "active");
        const initial = available[0]?.id ?? "";
        if (!initial) throw new Error("No active assigned centre is available for attendance.");
        if (cancelled) return;
        setCentres(available);
        setCentreId(initial);
        await loadContext(initial);
      } catch (caught) {
        if (!cancelled) setError(message(caught, "Attendance management is unavailable."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [loadContext]);

  async function changeCentre(nextCentreId: string) {
    setCentreId(nextCentreId); setLoading(true); setError(""); setNotice(""); setQrToken(null);
    try { await loadContext(nextCentreId); }
    catch (caught) { setError(message(caught, "Attendance could not be loaded.")); }
    finally { setLoading(false); }
  }

  async function markAttendance(bookingId: string, status: AttendanceStatus) {
    setPending(`mark:${bookingId}:${status}`); setError(""); setNotice("");
    try {
      await mutate(`/api/attendance/bookings/${encodeURIComponent(bookingId)}`, "PUT", { centreId, status });
      setNotice(`${statusLabel(status)} attendance saved. Credit settlement has been updated where required.`);
      await loadContext(centreId);
    } catch (caught) { setError(message(caught, "Attendance could not be updated.")); }
    finally { setPending(""); }
  }

  async function generateQr(session: AttendanceRosterSession) {
    setPending(`qr:${session.id}`); setError(""); setNotice("");
    try {
      const result = await mutate<AttendanceQrToken>("/api/attendance/qr/generate", "POST", { centreId, sessionId: session.id });
      setQrToken(result);
      setNotice(session.qrActive ? "The earlier check-in code was replaced." : "A secure check-in code was generated.");
      await loadContext(centreId);
    } catch (caught) { setError(message(caught, "The check-in code could not be generated.")); }
    finally { setPending(""); }
  }

  const attendanceCounts = useMemo(() => {
    const counts: Record<AttendanceStatus | "unmarked", number> = { present: 0, late: 0, absent: 0, excused: 0, unmarked: 0 };
    selectedSession?.bookings.forEach((booking) => { counts[booking.attendance?.status ?? "unmarked"] += 1; });
    return counts;
  }, [selectedSession]);

  const checkInUrl = qrToken && typeof window !== "undefined" ? `${window.location.origin}${qrToken.actionPath}` : "";

  return (
    <div className="grid gap-6">
      <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-orange-600">Session operations</p>
          <h2 className="text-2xl font-black tracking-tight text-slate-950">Attendance workspace</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Mark confirmed students by their booked subject, review lesson-focus notes, protect QR self-check-ins, and settle absent or excused credits from one session roster.</p>
        </div>
        <label className="grid min-w-64 gap-1.5 text-sm font-bold text-slate-700">
          {tutorWorkspace ? "Assigned centre" : "Management centre"}
          <select className={inputClass} disabled={loading || pending !== ""} onChange={(event) => void changeCentre(event.target.value)} value={centreId}>
            {centres.map((centre) => <option key={centre.id} value={centre.id}>{centre.name} ({centre.code})</option>)}
          </select>
        </label>
      </section>

      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{error}</p> : null}
      {notice ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700" role="status">{notice}</p> : null}
      {loading ? <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading attendance rosters…</p> : null}

      {!loading && context?.sessions.length ? (
        <div className="grid gap-5 xl:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="grid content-start gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" aria-label="Attendance sessions">
            {context.sessions.map((session) => {
              const subjects = rosterSubjects(session);
              return (
                <button className={`rounded-xl border px-4 py-3 text-left transition ${selectedSession?.id === session.id ? "border-orange-300 bg-orange-50" : "border-transparent hover:border-slate-200 hover:bg-slate-50"}`} key={session.id} onClick={() => { setSelectedSessionId(session.id); setQrToken(null); }} type="button">
                  <span className="block text-sm font-black text-slate-900">{subjects.length === 1 ? subjects[0]?.name : `${subjects.length} booked subjects`}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{formatSessionDateTime(session.startsAt, session.centreTimeZone)}</span>
                  <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600">{session.bookings.length} confirmed</span>
                </button>
              );
            })}
          </aside>

          {selectedSession ? (
            <section className="grid gap-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-950">Session roster</h3>
                    <p className="mt-2 text-sm font-semibold text-slate-600">{formatSessionDateTime(selectedSession.startsAt, selectedSession.centreTimeZone)}–{formatSessionTime(selectedSession.endsAt, selectedSession.centreTimeZone)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedSubjects.map((subject) => <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-black text-orange-700" key={subject.id}>{subject.code} · {subject.name}</span>)}
                    </div>
                    {tutorWorkspace ? <p className="mt-2 text-xs text-slate-500">Only bookings for subjects assigned to you are shown.</p> : null}
                  </div>
                  {context.canGenerateQr ? <button className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-50" disabled={pending !== ""} onClick={() => void generateQr(selectedSession)} type="button">{pending === `qr:${selectedSession.id}` ? "Generating…" : selectedSession.qrActive ? "Replace QR code" : "Generate QR code"}</button> : null}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {(["present", "late", "absent", "excused", "unmarked"] as const).map((status) => <div className="rounded-xl bg-slate-50 p-3 text-center" key={status}><strong className="block text-lg font-black text-slate-900">{attendanceCounts[status]}</strong><span className="text-[10px] font-black uppercase tracking-wide text-slate-500">{status}</span></div>)}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4"><h3 className="text-base font-black text-slate-900">Confirmed student roster</h3><p className="mt-1 text-xs leading-5 text-slate-500">Absent and excused return two credits. Present and late consume the booked credit.</p></div>
                <div className="divide-y divide-slate-100">
                  {selectedSession.bookings.map((booking) => {
                    const automaticallyFinalized = booking.attendance?.originSource === "automatic";
                    const locked = Boolean((booking.attendance?.hasSelfCheckIn || automaticallyFinalized) && !context.canOverrideQr);
                    return (
                      <article className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center" key={booking.bookingId}>
                        <div>
                          <div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-black text-slate-900">{booking.studentFirstName} {booking.studentLastName}</h4><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">{booking.studentPeopleCode}</span><span className="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-orange-700">{booking.subjectCode} · {booking.subjectName}</span>{booking.attendance?.hasSelfCheckIn ? <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">QR self-check-in</span> : null}{automaticallyFinalized ? <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-black text-violet-700">Automatically finalized</span> : null}</div>
                          <p className="mt-1 text-xs text-slate-500">Household: {booking.parentName}</p>
                          {booking.lessonFocus ? <div className="mt-3 rounded-xl border border-orange-100 bg-orange-50/60 px-3 py-2"><p className="text-[10px] font-black uppercase tracking-wide text-orange-700">Lesson focus · read only</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{booking.lessonFocus}</p></div> : <p className="mt-2 text-xs italic text-slate-400">No lesson focus was provided.</p>}
                          {booking.attendance ? <p className="mt-2 text-xs font-semibold text-slate-600">Current: <span className="capitalize">{booking.attendance.status}</span> · credits {booking.attendance.creditDisposition}</p> : <p className="mt-2 text-xs font-semibold text-amber-700">Not marked</p>}
                          {locked ? <p className="mt-2 text-xs font-semibold text-blue-700">Only an owner or manager can change this protected attendance record.</p> : null}
                        </div>
                        <div className="flex flex-wrap gap-2" aria-label={`Attendance for ${booking.studentFirstName} ${booking.studentLastName}`}>
                          {statuses.map((status) => <button className={`rounded-lg border px-3 py-2 text-xs font-black capitalize transition ${booking.attendance?.status === status ? statusClass(status) : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`} disabled={pending !== "" || locked} key={status} onClick={() => void markAttendance(booking.bookingId, status)} type="button">{pending === `mark:${booking.bookingId}:${status}` ? "Saving…" : status}</button>)}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {!loading && context && context.sessions.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><h3 className="text-lg font-black text-slate-900">No attendance rosters yet</h3><p className="mt-2 text-sm text-slate-500">Published sessions with confirmed bookings will appear here.</p></div> : null}

      <FormDialog description="Print this code and display it for the session. The earlier code stops working whenever a replacement is generated." onOpenChange={(open) => { if (!open) setQrToken(null); }} open={Boolean(qrToken)} title="Session self-check-in">
        {qrToken && checkInUrl ? <div className="grid gap-5 p-6 md:grid-cols-[16rem_minmax(0,1fr)] md:items-center"><div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><QrCode value={checkInUrl} /></div><div><p className="text-sm font-bold text-slate-900">Scan to check in</p><p className="mt-2 text-sm leading-6 text-slate-600">Available from {new Date(qrToken.validFrom).toLocaleString("en-GB")} until {new Date(qrToken.expiresAt).toLocaleString("en-GB")}.</p><p className="mt-3 break-all rounded-xl bg-slate-50 p-3 text-xs text-slate-500">{checkInUrl}</p><div className="mt-4 flex flex-wrap gap-2"><button className="rounded-xl bg-[#f45b23] px-4 py-2.5 text-sm font-black text-white" onClick={() => window.print()} type="button">Print</button><button className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700" onClick={() => void navigator.clipboard.writeText(checkInUrl)} type="button">Copy link</button></div></div></div> : null}
      </FormDialog>
    </div>
  );
}

function statusLabel(status: AttendanceStatus) { return status.charAt(0).toUpperCase() + status.slice(1); }
function rosterSubjects(session: AttendanceRosterSession) {
  const seen = new Set<string>();
  return session.bookings.flatMap((booking) => {
    if (seen.has(booking.subjectId)) return [];
    seen.add(booking.subjectId);
    return [{ id: booking.subjectId, name: booking.subjectName, code: booking.subjectCode }];
  });
}
function statusClass(status: AttendanceStatus) {
  if (status === "present") return "border-emerald-300 bg-emerald-50 text-emerald-700";
  if (status === "late") return "border-amber-300 bg-amber-50 text-amber-700";
  if (status === "absent") return "border-red-300 bg-red-50 text-red-700";
  return "border-blue-300 bg-blue-50 text-blue-700";
}

async function mutate<T = unknown>(path: string, method: "POST" | "PUT", body: unknown): Promise<T> {
  const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
  if (!csrfResponse.ok) throw new Error("Request verification failed.");
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
  const response = await fetch(path, { method, headers: { "content-type": "application/json", "x-csrf-token": csrfToken }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(await apiError(response, "The request could not be completed."));
  return (await response.json()) as T;
}

async function apiError(response: Response, fallback: string) { try { const result = (await response.json()) as { error?: string }; return result.error ?? fallback; } catch { return fallback; } }
function message(error: unknown, fallback: string) { return error instanceof Error ? error.message : fallback; }

