export interface AuditLogEntry {
  id: string;
  tenantId: string;
  companyId?: string;
  eventType: string;
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  actorUserId: string;
  actorPersonId?: string;
  actorRole?: string;
  occurredAt: string;
  correlationId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type NewAuditLogEntry = Omit<AuditLogEntry, "createdAt">;

export interface AuditLogEntityQuery {
  tenantId: string;
  module: string;
  entityType: string;
  entityId: string;
  limit?: number;
}

export interface AuditLogActorQuery {
  tenantId: string;
  actorUserId: string;
  limit?: number;
}

export interface AuditLogCorrelationQuery {
  tenantId: string;
  correlationId: string;
  limit?: number;
}
