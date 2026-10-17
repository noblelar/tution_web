"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { SessionList, TeachingSession } from "@/lib/session-types";

type ApiError = { error?: string };

export function SessionDirectory({ audience }: { audience: "parent" | "student" }) {
  const [upcoming, setUpcoming] = useState<TeachingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/sessions", { cache: "no-store" });
        const result = (await response.json().catch(() => ({}))) as SessionList & ApiError;
        if (!response.ok) throw new Error(result.error ?? "Sessions could not be loaded.");
        const now = Date.now();
        const available = (result.sessions ?? []).filter((item) => item.status === "published" && new Date(item.endsAt).getTime() > now);
        if (!cancelled) setUpcoming(available);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Sessions could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="management-shell">
      <header className="management-header">
        <div><p className="eyebrow">{audience} area</p><h1>Sessions</h1><p className="mt-3 max-w-3xl text-slate-500">Published two-hour sessions available through your centre and subjects.</p></div>
      </header>
      {loading ? <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">Loading available sessions…</p> : null}
      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-700" role="alert">{error}</p> : null}
      {!loading && !error ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Published sessions">
          {upcoming.length ? upcoming.map((item) => <SessionCard audience={audience} item={item} key={item.id} />) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center md:col-span-2 xl:col-span-3"><h2 className="text-xl font-black text-slate-900">No published sessions yet</h2><p className="mt-2 text-slate-500">New sessions will appear here after your centre publishes them.</p></div>
          )}
        </section>
      ) : null}
    </main>
  );
}

function SessionCard({ item, audience }: { item: TeachingSession; audience: "parent" | "student" }) {
  const formatter = new Intl.DateTimeFormat("en-GB", { timeZone: item.centreTimeZone, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const timeFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: item.centreTimeZone, hour: "2-digit", minute: "2-digit" });
  return (
    <article className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div><p className="text-xs font-black uppercase tracking-[0.14em] text-orange-600">{item.centreName}</p><h2 className="mt-1 text-xl font-black text-slate-950">Weekend teaching session</h2><p className="mt-2 font-semibold text-slate-700">{formatter.format(new Date(item.startsAt))} – {timeFormatter.format(new Date(item.endsAt))}</p></div>
      <div className="grid gap-2" aria-label="Subjects available to book">
        {item.offeredSubjects.map((offering) => (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3" key={offering.id}>
            <div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-slate-900">{offering.subjectName}</strong><span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">{offering.subjectCode}</span></div>
            <p className="mt-1 text-xs leading-5 text-slate-500">{offering.tutors.length ? offering.tutors.map((tutor) => tutor.name).join(", ") : "Tutor to be assigned"}</p>
          </div>
        ))}
      </div>
      <dl className="grid gap-2 text-sm text-slate-600"><div><dt className="font-bold text-slate-400">Booking choice</dt><dd>Choose one offered subject</dd></div><div><dt className="font-bold text-slate-400">Duration</dt><dd>2 hours</dd></div></dl>
      <Link className="rounded-xl bg-orange-600 px-4 py-2.5 text-center text-sm font-black text-white transition hover:bg-orange-700" href={`/app/${audience}/bookings`}>Open booking controls</Link>
    </article>
  );
}
