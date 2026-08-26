import "server-only";

import {
  AuditAccessContext,
  AuditActor,
  AuditCentre,
  AuditEvent,
  AuditEventList,
  AuditRetentionPolicy,
} from "@/lib/audit-types";

export type BackendAuditCentre = { id: string; code: string; name: string };
export type BackendAuditActor = {
  user_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
};
export type BackendAuditEvent = {
  id: string;
  organization_id: string;
  centre?: BackendAuditCentre;
  actor_type: string;
  actor?: BackendAuditActor;
  action_key: string;
  outcome: "succeeded" | "denied" | "failed";
  target_entity_type: string;
  target_entity_id?: string;
  previous_values?: unknown;
  new_values?: unknown;
  metadata?: unknown;
  request_id?: string;
  ip_address?: string;
  user_agent?: string;
  occurred_at: string;
};
export type BackendAuditEventList = {
  events?: BackendAuditEvent[];
  next_cursor?: string;
};
export type BackendAuditRetentionPolicy = {
  security_administration_months: number;
  automated_expiry_enabled: boolean;
  confirmed_at: string;
  policy_source: string;
};
export type BackendAuditAccessContext = {
  centres?: BackendAuditCentre[];
  can_view_organization_wide: boolean;
  retention_policy: BackendAuditRetentionPolicy;
};

function mapCentre(centre: BackendAuditCentre): AuditCentre {
  return centre;
}

function mapActor(actor: BackendAuditActor): AuditActor {
  return {
    userId: actor.user_id,
    firstName: actor.first_name,
    lastName: actor.last_name,
    email: actor.email,
  };
}

function mapObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function mapAuditEvent(event: BackendAuditEvent): AuditEvent {
  return {
    id: event.id,
    organizationId: event.organization_id,
    centre: event.centre ? mapCentre(event.centre) : undefined,
    actorType: event.actor_type,
    actor: event.actor ? mapActor(event.actor) : undefined,
    actionKey: event.action_key,
    outcome: event.outcome,
    targetEntityType: event.target_entity_type,
    targetEntityId: event.target_entity_id,
    previousValues: mapObject(event.previous_values),
    newValues: mapObject(event.new_values),
    metadata: mapObject(event.metadata),
    requestId: event.request_id,
    ipAddress: event.ip_address,
    userAgent: event.user_agent,
    occurredAt: event.occurred_at,
  };
}

function mapRetentionPolicy(policy: BackendAuditRetentionPolicy): AuditRetentionPolicy {
  return {
    securityAdministrationMonths: policy.security_administration_months,
    automatedExpiryEnabled: policy.automated_expiry_enabled,
    confirmedAt: policy.confirmed_at,
    policySource: policy.policy_source,
  };
}

export function mapAuditEventList(result: BackendAuditEventList): AuditEventList {
  return {
    events: (result.events ?? []).map(mapAuditEvent),
    nextCursor: result.next_cursor,
  };
}

export function mapAuditAccessContext(context: BackendAuditAccessContext): AuditAccessContext {
  return {
    centres: (context.centres ?? []).map(mapCentre),
    canViewOrganizationWide: context.can_view_organization_wide,
    retentionPolicy: mapRetentionPolicy(context.retention_policy),
  };
}
