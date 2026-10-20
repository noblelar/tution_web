"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import type { StudentSelfProfile } from "@/lib/profile-types";
import { studentLoginMethods, studentProfileDisplayName, studentProfileInitials, studentProfileReadiness } from "@/lib/student-profile-rules";

type ApiError = { error?: string };

const secondaryButton = "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50";

export function StudentProfile() {
  const [profile, setProfile] = useState<StudentSelfProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/profiles/students/me", { cache: "no-store" });
      const result = (await response.json().catch(() => ({}))) as StudentSelfProfile & ApiError;
      if (!response.ok) throw new Error(result.error ?? "Your student profile could not be loaded.");
      setProfile(result);
    } catch (caught) {
      setProfile(null);
      setError(caught instanceof Error ? caught.message : "Your student profile could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const loginMethods = useMemo(() => profile ? studentLoginMethods(profile) : [], [profile]);

  if (loading) return <StudentProfileLoading />;
  if (error || !profile) return <StudentProfileError error={error} onRetry={() => void load()} />;

  const readiness = studentProfileReadiness(profile);
  const needsAttention = !readiness.ready || (profile.emailLoginEnabled && !profile.emailVerified);
  const queryHref = profile.primaryCentre
    ? `/app/student/feedback?centreId=${encodeURIComponent(profile.primaryCentre.id)}&tab=queries`
    : "/app/student/feedback?tab=queries";

  return (
    <main className="management-shell" aria-labelledby="student-profile-title">
      <header className="management-header">
        <div>
          <p className="eyebrow">Student area</p>
          <h1 id="student-profile-title">Profile</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">Review your identity, centre, academic placement, and account access as recorded by the tuition centre.</p>
        </div>
        <button className={secondaryButton} onClick={() => void load()} type="button">Refresh</button>
      </header>

      {needsAttention ? <AttentionNotice profile={profile} readiness={readiness} /> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-5 bg-gradient-to-br from-orange-50 via-white to-white p-6 sm:p-8">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-orange-600 text-xl font-black text-white shadow-sm">{studentProfileInitials(profile)}</span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-700">Student profile</p>
              <h2 className="mt-1 truncate text-2xl font-black text-slate-950">{studentProfileDisplayName(profile)}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">{profile.peopleCode}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge active={profile.profileStatus === "active"} label={`Profile ${humanStatus(profile.profileStatus)}`} />
            <StatusBadge active={profile.accountStatus === "active"} label={`Account ${humanStatus(profile.accountStatus)}`} />
          </div>
        </div>
        <div className="grid gap-4 border-t border-slate-100 p-5 sm:grid-cols-2 xl:grid-cols-4 sm:p-6">
          <Summary label="Primary centre" value={profile.primaryCentre?.name ?? "Not assigned"} warning={!profile.primaryCentre} />
          <Summary label="Academic year" value={profile.currentPlacement?.academicYearName ?? "Not placed"} warning={!profile.currentPlacement} />
          <Summary label="Academic level" value={profile.currentPlacement?.academicLevelName ?? "Not placed"} warning={!profile.currentPlacement} />
          <Summary label="Self-booking" value={profile.canManageOwnBookings ? "Enabled" : "Not enabled"} warning={!profile.canManageOwnBookings} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <ProfileCard title="Personal information" description="Your identity and permanent student reference.">
          <Detail label="First name" value={profile.firstName} />
          <Detail label="Last name" value={profile.lastName} />
          <Detail label="Preferred name" value={profile.preferredName || "Not recorded"} muted={!profile.preferredName} />
          <Detail label="Date of birth" value={formatDate(profile.dateOfBirth)} />
          <Detail label="Gender" value={profile.gender || "Not recorded"} muted={!profile.gender} />
          <Detail label="People Code" value={profile.peopleCode} />
        </ProfileCard>

        <ProfileCard title="Academic information" description="Your current placement and school information.">
          <Detail label="Academic year" value={profile.currentPlacement?.academicYearName ?? "Not assigned"} warning={!profile.currentPlacement} />
          <Detail label="Academic level" value={profile.currentPlacement?.academicLevelName ?? "Not assigned"} warning={!profile.currentPlacement} />
          <Detail label="School" value={profile.schoolName || "Not recorded"} muted={!profile.schoolName} />
          <Detail label="Imported year group" value={profile.academicYearGroup || "Not recorded"} muted={!profile.academicYearGroup} />
          {profile.currentPlacement ? <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">This placement belongs to the currently active academic year. Historical placements will be provided through student reports.</p> : null}
        </ProfileCard>

        <ProfileCard title="Centre and booking access" description="Your operational centre and student self-service permission.">
          <Detail label="Primary centre" value={profile.primaryCentre ? `${profile.primaryCentre.name} (${profile.primaryCentre.code})` : "Not assigned"} warning={!profile.primaryCentre} />
          <Detail label="Self-managed bookings" value={profile.canManageOwnBookings ? "Enabled" : "Not enabled"} warning={!profile.canManageOwnBookings} />
          <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">When self-managed bookings are disabled, you can still review existing bookings. A parent or administrator can manage new bookings for you.</p>
          <Link className={secondaryButton} href="/app/student/bookings">Open bookings</Link>
        </ProfileCard>

        <ProfileCard title="Account access" description="The login methods enabled for this student identity.">
          <Detail label="Account status" value={humanStatus(profile.accountStatus)} warning={profile.accountStatus !== "active"} />
          <Detail label="Email" value={profile.email || "Not used for login"} muted={!profile.email} />
          {profile.emailLoginEnabled ? <Detail label="Email verification" value={profile.emailVerified ? "Verified" : "Not verified"} warning={!profile.emailVerified} /> : null}
          <div className="grid gap-2">
            {loginMethods.length ? loginMethods.map((method) => <AccessMethod key={method} label={method} />) : <EmptyDetail title="No login method recorded" description="Ask an administrator to review your student access." />}
          </div>
        </ProfileCard>

        <ProfileCard title="Need to update something?" description="Student profile changes remain controlled by an authorized owner or manager.">
          <p className="text-sm leading-6 text-slate-600">Use a private centre query to request a correction. Include the field that is wrong and the correct information, but never send passwords, date-of-birth evidence, or authentication codes.</p>
          {profile.canManageOwnBookings && profile.primaryCentre ? <Link className="inline-flex w-fit rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-orange-700" href={queryHref}>Open Feedback &amp; Queries</Link> : <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">Ask your parent or the centre directly when student query access is not enabled.</p>}
          <p className="text-xs text-slate-400">Profile last updated {formatUpdatedAt(profile.profileUpdatedAt)}.</p>
        </ProfileCard>
      </div>
    </main>
  );
}

function AttentionNotice({ profile, readiness }: { profile: StudentSelfProfile; readiness: ReturnType<typeof studentProfileReadiness> }) {
  const reasons = [
    profile.profileStatus !== "active" ? `your student profile is ${humanStatus(profile.profileStatus).toLowerCase()}` : "",
    profile.accountStatus !== "active" ? `your account is ${humanStatus(profile.accountStatus).toLowerCase()}` : "",
    profile.emailLoginEnabled && !profile.emailVerified ? "your login email is not verified" : "",
    ...readiness.missing.map((item) => `${item} is missing`),
  ].filter(Boolean);
  return <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5" role="status"><h2 className="font-black text-amber-950">Your profile needs attention</h2><p className="mt-1 text-sm leading-6 text-amber-800">{reasons.join("; ")}.</p></section>;
}

function ProfileCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="grid content-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div><h2 className="text-lg font-black text-slate-950">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{description}</p></div>{children}</section>;
}

function Detail({ label, value, muted = false, warning = false }: { label: string; value: string; muted?: boolean; warning?: boolean }) {
  return <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"><span className="text-sm font-semibold text-slate-500">{label}</span><span className={`break-words text-right text-sm font-black ${warning ? "text-amber-700" : muted ? "text-slate-400" : "text-slate-900"}`}>{value}</span></div>;
}

function Summary({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return <article className={`rounded-xl p-4 ${warning ? "bg-amber-50" : "bg-slate-50"}`}><p className={`text-[10px] font-black uppercase tracking-[0.12em] ${warning ? "text-amber-700" : "text-slate-400"}`}>{label}</p><p className="mt-2 truncate text-lg font-black text-slate-950" title={value}>{value}</p></article>;
}

function StatusBadge({ active, label }: { active: boolean; label: string }) {
  return <span className={`rounded-full px-3 py-1.5 text-xs font-black ${active ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{label}</span>;
}

function AccessMethod({ label }: { label: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-xs font-black text-emerald-800">✓</span><span className="text-sm font-bold text-slate-800">{label}</span></div>;
}

function EmptyDetail({ title, description }: { title: string; description: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4"><p className="text-sm font-black text-slate-800">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div>;
}

function StudentProfileLoading() {
  return <main className="management-shell" aria-label="Loading student profile" role="status"><div className="h-28 animate-pulse rounded-2xl bg-slate-200" /><div className="h-64 animate-pulse rounded-2xl bg-slate-200" /><div className="grid gap-6 xl:grid-cols-2"><div className="h-72 animate-pulse rounded-2xl bg-slate-200" /><div className="h-72 animate-pulse rounded-2xl bg-slate-200" /></div></main>;
}

function StudentProfileError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return <main className="management-shell"><section className="rounded-2xl border border-red-200 bg-red-50 p-6" role="alert"><p className="eyebrow">Student area</p><h1 className="mt-2 text-2xl font-black text-red-950">Your profile could not be loaded</h1><p className="mt-2 text-sm leading-6 text-red-700">{error || "A student profile is not linked to this account."}</p><button className={`${secondaryButton} mt-5`} onClick={onRetry} type="button">Try again</button></section></main>;
}

function humanStatus(value: string) {
  return value ? value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Unavailable";
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "Not recorded" : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "date unavailable" : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}
