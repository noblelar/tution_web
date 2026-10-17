// UI affordances mirror backend validation; the Go API remains authoritative.
export const otherRelationshipPattern = String.raw`\S+(\s+\S+){0,2}`;

export function studentEmailRequired(parentProfileId: string): boolean {
  return parentProfileId.trim() === "";
}

export function validOtherRelationshipDescription(description: string): boolean {
  const value = description.trim();
  return value.length > 0 && value.length <= 80 && new RegExp(`^(?:${otherRelationshipPattern})$`).test(value);
}

export function canReissueProfileInvitation(accountStatus: string | undefined, canManage: boolean): boolean {
  return canManage && accountStatus === "pending_activation";
}
