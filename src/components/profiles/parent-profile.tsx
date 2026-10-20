"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { BookingContext } from "@/lib/booking-types";
import { buildParentChildDirectory, parentChildDirectoryMetrics } from "@/lib/parent-children-rules";
import {
  formatParentAddress,
  parentProfileDisplayName,
  parentProfileHouseholdSummary,
  parentProfileInitials,
  parentProfileReadiness,
} from "@/lib/parent-profile-rules";
import type { ParentSelfProfile } from "@/lib/profile-types";

type ApiError = { error?: string };

const secondaryButton = "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50";

export function ParentProfile() {
  const [profile, setProfile] = useState<ParentSelfProfile | null>(null);
  const [bookings, setBookings] = useState<BookingContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [householdError, setHouseholdError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setHouseholdError("");
    try {
      const [profileResponse, bookingResponse] = await Promise.all([
        fetch("/api/profiles/parents/me", { cache: "no-store" }),
        fetch("/api/bookings", { cache: "no-store" }).catch(() => null),
      ]);
      const profileResult = (await profileResponse.json().catch(() => ({}))) as ParentSelfProfile & ApiError;
      if (!profileResponse.ok) throw new Error(profileResult.error ?? "Your parent profile could not be loaded.");
      setProfile(profileResult);
      if (!bookingResponse) {
        setBookings(null);
        setHouseholdError("Household information is temporarily unavailable.");
      } else {
        const bookingResult = (await bookingResponse.json().catch(() => ({}))) as BookingContext & ApiError;
        if (bookingResponse.ok) {
          setBookings(bookingResult);
        } else {
          setBookings(null);
          setHouseholdError(bookingResult.error ?? "Household information is temporarily unavailable.");
        }
      }
    } catch (caught) {
      setProfile(null);
      setBookings(null);
      setError(caught instanceof Error ? caught.message : "Your parent profile could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const children = useMemo(
    () => buildParentChildDirectory(bookings?.participants ?? [], bookings?.bookings ?? []),
    [bookings],
  );
  const childMetrics = useMemo(() => parentChildDirectoryMetrics(children), [children]);
  const household = useMemo(() => parentProfileHouseholdSummary(bookings?.participants ?? []), [bookings]);

  if (loading) return <ParentProfileLoading />;
  if (error || !profile) return <ParentProfileError error={error} onRetry={() => void load()} />;

  const readiness = parentProfileReadiness(profile);
  const address = formatParentAddress(profile);
  const correctionHref = household.queryCentreId
    ? `/app/parent/feedback?centreId=${encodeURIComponent(household.queryCentreId)}&tab=queries`
    : "/app/parent/feedback?tab=queries";
  const needsAttention = profile.profileStatus !== "active" || profile.accountStatus !== "active" || !profile.emailVerified || readiness.missingRequiredDetails.length > 0;

  return (
    <main className="management-shell" aria-labelledby="parent-profile-title">
      <header className="management-header">
        <div>
          <p className="eyebrow">Parent area</p>
          <h1 id="parent-profile-title">Profile</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">Review the identity, contact, centre, household, and communication details currently recorded for your account.</p>
        </div>
        <button className={secondaryButton} onClick={() => void load()} type="button">Refresh</button>
      </header>

      {needsAttention ? <AttentionNotice profile={profile} readiness={readiness} /> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-5 bg-gradient-to-br from-orange-50 via-white to-white p-6 sm:p-8">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-orange-600 text-xl font-black text-white shadow-sm">{parentProfileInitials(profile)}</span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-700">Parent / guardian profile</p>
              <h2 className="mt-1 truncate text-2xl font-black text-slate-950">{parentProfileDisplayName(profile)}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">{profile.peopleCode}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge active={profile.profileStatus === "active"} label={`Profile ${profile.profileStatus}`} />
            <StatusBadge active={profile.emailVerified} label={profile.emailVerified ? "Email verified" : "Email unverified"} />
          </div>
        </div>
        <div className="grid gap-4 border-t border-slate-100 p-5 sm:grid-cols-2 xl:grid-cols-4 sm:p-6">
          <Summary label="Linked children" value={householdError ? "—" : String(household.children)} helper={householdError || "Active household links"} warning={Boolean(householdError)} />
          <Summary label="Centres" value={householdError ? "—" : String(household.centres)} helper={householdError || "Across linked children"} warning={Boolean(householdError)} />
          <Summary label="Upcoming bookings" value={householdError ? "—" : String(childMetrics.upcomingBookings)} helper={householdError || "Future active bookings"} warning={Boolean(householdError)} />
          <Summary label="Profile details" value={readiness.missingRequiredDetails.length ? "Review" : "Ready"} helper={readiness.missingRequiredDetails.length ? `Missing ${readiness.missingRequiredDetails.join(" and ")}` : "Required details recorded"} warning={readiness.missingRequiredDetails.length > 0} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <ProfileCard title="Personal information" description="Your identity and permanent parent reference.">
          <Detail label="First name" value={profile.firstName} />
          <Detail label="Last name" value={profile.lastName} />
          <Detail label="Preferred name" value={profile.preferredName || "Not recorded"} muted={!profile.preferredName} />
          <Detail label="People code" value={profile.peopleCode} />
        </ProfileCard>

        <ProfileCard title="Contact information" description="The centre uses these details for your account and essential contact.">
          <Detail label="Email address" value={profile.email} />
          <Detail label="Email status" value={profile.emailVerified ? "Verified" : "Not verified"} warning={!profile.emailVerified} />
          <Detail label="Phone number" value={profile.phoneNumber || "Not recorded"} warning={!profile.phoneNumber} />
          <Detail label="Account status" value={humanStatus(profile.accountStatus)} warning={profile.accountStatus !== "active"} />
        </ProfileCard>

        <ProfileCard title="Address" description="Your recorded household address. Address information is optional.">
          {address.length ? (
            <address className="rounded-xl bg-slate-50 p-4 not-italic text-sm font-semibold leading-7 text-slate-700">
              {address.map((line) => <span className="block" key={line}>{line}</span>)}
            </address>
          ) : <EmptyDetail title="No address recorded" description="You can ask the centre to add an address when one is required." />}
        </ProfileCard>

        <ProfileCard title="Centre and household" description="Your primary centre and the students currently linked to you.">
          <Detail label="Primary centre" value={profile.primaryCentre ? `${profile.primaryCentre.name} (${profile.primaryCentre.code})` : "Not assigned"} warning={!profile.primaryCentre} />
          {householdError ? <EmptyDetail title="Household information unavailable" description={householdError} /> : children.length ? (
            <ul className="grid gap-2" aria-label="Linked children">
              {children.slice(0, 4).map((child) => (
                <li className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3" key={child.studentProfileId}>
                  <span><strong className="block text-sm text-slate-900">{child.firstName} {child.lastName}</strong><span className="text-xs text-slate-500">{child.centreName}</span></span>
                  <span className="text-xs font-black text-slate-500">{child.peopleCode}</span>
                </li>
              ))}
            </ul>
          ) : <EmptyDetail title="No linked children" description="Ask the centre to confirm your guardian-to-student relationship." />}
          <Link className={secondaryButton} href="/app/parent/children">Open Children directory</Link>
        </ProfileCard>

        <ProfileCard title="Communication preferences" description="These preferences are displayed exactly as they are recorded by the centre.">
          <Preference enabled={profile.contactConsent} label="Contact consent" description={profile.contactConsent ? "The centre may use your recorded contact details for permitted communication." : "General contact consent is not currently recorded."} />
          <Preference enabled={profile.marketingOptIn} label="Marketing messages" description={profile.marketingOptIn ? "You are recorded as opted in to marketing communication." : "You are not opted in to marketing communication."} />
          <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">These settings are read-only here. Contact the centre if either preference needs to be corrected.</p>
        </ProfileCard>

        <ProfileCard title="Need to update something?" description="Profile changes remain controlled by an authorized owner or manager.">
          <p className="text-sm leading-6 text-slate-600">Use a private centre query to request a correction. Include the field that is wrong and the correct information, but never send passwords or authentication codes.</p>
          {householdError ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">The household service is unavailable, so query eligibility cannot be confirmed right now.</p> : household.canStartQuery ? <Link className="inline-flex w-fit rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-orange-700" href={correctionHref}>Open Feedback &amp; Queries</Link> : <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">A linked student is required before the current query workflow can contact the centre.</p>}
          <p className="text-xs text-slate-400">Profile last updated {formatUpdatedAt(profile.profileUpdatedAt)}.</p>
        </ProfileCard>
      </div>
    </main>
  );
}

function AttentionNotice({ profile, readiness }: { profile: ParentSelfProfile; readiness: ReturnType<typeof parentProfileReadiness> }) {
  const reasons = [
    profile.profileStatus !== "active" ? "your parent profile is inactive" : "",
    profile.accountStatus !== "active" ? `your account is ${humanStatus(profile.accountStatus).toLowerCase()}` : "",
    !profile.emailVerified ? "your email is not verified" : "",
    ...readiness.missingRequiredDetails.map((item) => `${item} is missing`),
  ].filter(Boolean);
  return <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5" role="status"><h2 className="font-black text-amber-950">Your profile needs attention</h2><p className="mt-1 text-sm leading-6 text-amber-800">{reasons.join("; ")}.</p></section>;
}

function ProfileCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="grid content-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div><h2 className="text-lg font-black text-slate-950">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{description}</p></div>{children}</section>;
}

function Detail({ label, value, muted = false, warning = false }: { label: string; value: string; muted?: boolean; warning?: boolean }) {
  return <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"><span className="text-sm font-semibold text-slate-500">{label}</span><span className={`break-words text-right text-sm font-black ${warning ? "text-amber-700" : muted ? "text-slate-400" : "text-slate-900"}`}>{value}</span></div>;
}

function Summary({ label, value, helper, warning = false }: { label: string; value: string; helper: string; warning?: boolean }) {
  return <article className={`rounded-xl p-4 ${warning ? "bg-amber-50" : "bg-slate-50"}`}><p className={`text-[10px] font-black uppercase tracking-[0.12em] ${warning ? "text-amber-700" : "text-slate-400"}`}>{label}</p><p className="mt-2 text-2xl font-black text-slate-950">{value}</p><p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{helper}</p></article>;
}

function Preference({ enabled, label, description }: { enabled: boolean; label: string; description: string }) {
  return <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-4"><span aria-hidden="true" className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black ${enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>{enabled ? "✓" : "—"}</span><span><strong className="block text-sm text-slate-900">{label}</strong><span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span></span></div>;
}

function StatusBadge({ active, label }: { active: boolean; label: string }) {
  return <span className={`rounded-full px-3 py-1.5 text-xs font-black ${active ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{label}</span>;
}

function EmptyDetail({ title, description }: { title: string; description: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4"><p className="text-sm font-black text-slate-800">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div>;
}

function ParentProfileLoading() {
  return <main className="management-shell" aria-label="Loading parent profile" role="status"><div className="h-28 animate-pulse rounded-2xl bg-slate-200" /><div className="h-64 animate-pulse rounded-2xl bg-slate-200" /><div className="grid gap-6 xl:grid-cols-2"><div className="h-72 animate-pulse rounded-2xl bg-slate-200" /><div className="h-72 animate-pulse rounded-2xl bg-slate-200" /></div></main>;
}

function ParentProfileError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return <main className="management-shell"><section className="rounded-2xl border border-red-200 bg-red-50 p-6" role="alert"><p className="eyebrow">Parent area</p><h1 className="mt-2 text-2xl font-black text-red-950">Your profile could not be loaded</h1><p className="mt-2 text-sm leading-6 text-red-700">{error || "Your parent profile is not available for this account."}</p><button className={`${secondaryButton} mt-5`} onClick={onRetry} type="button">Try again</button></section></main>;
}

function humanStatus(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "date unavailable";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}
