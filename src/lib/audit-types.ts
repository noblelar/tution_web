export type AuditCentre = {
  id: string;
  code: string;
  name: string;
};

export type AuditActor = {
  userId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

export type AuditEvent = {
  id: string;
  organizationId: string;
  centre?: AuditCentre;
  actorType: string;
  actor?: AuditActor;
  actionKey: string;
  outcome: "succeeded" | "denied" | "failed";
  targetEntityType: string;
  targetEntityId?: string;
  previousValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  metadata: Record<string, unknown>;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  occurredAt: string;
};

export type AuditEventList = {
  events: AuditEvent[];
  nextCursor?: string;
};

export type AuditRetentionPolicy = {
  securityAdministrationMonths: number;
  automatedExpiryEnabled: boolean;
  confirmedAt: string;
  policySource: string;
};

export type AuditAccessContext = {
  centres: AuditCentre[];
  canViewOrganizationWide: boolean;
  retentionPolicy: AuditRetentionPolicy;
};
