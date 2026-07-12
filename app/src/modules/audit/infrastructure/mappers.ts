import type { AuditLogEntry, NewAuditLogEntry } from "../domain";
import type { AuditLogEntryRecord, auditLogEntries } from "@db/schema";

type AuditLogEntryInsert = typeof auditLogEntries.$inferInsert;

function parseDate(value: string): Date {
  return new Date(value);
}

function toIso(value: Date): string {
  return value.toISOString();
}

export function mapAuditLogEntryToInsert(entry: NewAuditLogEntry): AuditLogEntryInsert {
  return {
    id: entry.id,
    tenantId: entry.tenantId,
    companyId: entry.companyId,
    eventType: entry.eventType,
    module: entry.module,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    actorUserId: entry.actorUserId,
    actorPersonId: entry.actorPersonId,
    actorRole: entry.actorRole,
    occurredAt: parseDate(entry.occurredAt),
    correlationId: entry.correlationId,
    metadata: entry.metadata ?? null,
  };
}

export function mapAuditLogEntryRow(row: AuditLogEntryRecord): AuditLogEntry {
  return {
    id: row.id,
    tenantId: row.tenantId,
    companyId: row.companyId ?? undefined,
    eventType: row.eventType,
    module: row.module,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    actorUserId: row.actorUserId,
    actorPersonId: row.actorPersonId ?? undefined,
    actorRole: row.actorRole ?? undefined,
    occurredAt: toIso(row.occurredAt),
    correlationId: row.correlationId,
    metadata: row.metadata ?? undefined,
    createdAt: toIso(row.createdAt),
  };
}
