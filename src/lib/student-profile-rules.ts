import type { StudentSelfProfile } from "@/lib/profile-types";

export function studentProfileDisplayName(profile: StudentSelfProfile): string {
  return profile.preferredName?.trim() || `${profile.firstName} ${profile.lastName}`.trim();
}

export function studentProfileInitials(profile: StudentSelfProfile): string {
  return `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase() || "S";
}

export function studentLoginMethods(profile: StudentSelfProfile): string[] {
  return [
    profile.emailLoginEnabled ? "Email and password" : "",
    profile.peopleCodeLoginEnabled ? "People Code and date of birth" : "",
  ].filter(Boolean);
}

export function studentProfileReadiness(profile: StudentSelfProfile) {
  const missing: string[] = [];
  if (!profile.primaryCentre) missing.push("primary centre");
  if (!profile.currentPlacement) missing.push("current academic placement");
  if (!studentLoginMethods(profile).length) missing.push("login method");
  return {
    missing,
    ready: profile.profileStatus === "active" && profile.accountStatus === "active" && missing.length === 0,
  };
}
