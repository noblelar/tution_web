import type { BookingParticipant } from "./booking-types";
import type { ParentSelfProfile } from "./profile-types";

export type ParentProfileReadiness = {
  contactDetailsReady: boolean;
  addressRecorded: boolean;
  centreAssigned: boolean;
  emailVerified: boolean;
  missingRequiredDetails: string[];
};

export function parentProfileDisplayName(profile: ParentSelfProfile): string {
  return profile.preferredName?.trim() || `${profile.firstName} ${profile.lastName}`.trim();
}

export function parentProfileInitials(profile: ParentSelfProfile): string {
  const first = profile.firstName.trim().charAt(0);
  const last = profile.lastName.trim().charAt(0);
  return `${first}${last}`.toUpperCase() || "PG";
}

export function formatParentAddress(profile: ParentSelfProfile): string[] {
  const locality = [profile.city, profile.countyRegion]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(", ");
  return [
    profile.addressLine1,
    profile.addressLine2,
    locality,
    profile.postalCode,
    profile.country,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}

export function parentProfileReadiness(profile: ParentSelfProfile): ParentProfileReadiness {
  const missingRequiredDetails: string[] = [];
  if (!profile.phoneNumber?.trim()) missingRequiredDetails.push("phone number");
  if (!profile.primaryCentre) missingRequiredDetails.push("primary centre");
  return {
    contactDetailsReady: Boolean(profile.email.trim() && profile.phoneNumber?.trim()),
    addressRecorded: formatParentAddress(profile).length > 0,
    centreAssigned: Boolean(profile.primaryCentre),
    emailVerified: profile.emailVerified,
    missingRequiredDetails,
  };
}

export function parentProfileHouseholdSummary(participants: BookingParticipant[]) {
  return {
    children: participants.length,
    centres: new Set(participants.map((participant) => participant.centreId)).size,
    canStartQuery: participants.length > 0,
    queryCentreId: participants[0]?.centreId,
  };
}
