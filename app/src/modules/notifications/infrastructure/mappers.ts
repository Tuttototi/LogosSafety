import type {
  NewNotificationOutboxEntry,
  NotificationOutboxEntry,
} from "../domain";
import {
  NotificationOutboxStatus,
} from "../domain";
import type { NotificationOutboxRecord, notificationOutbox } from "@db/schema";

type NotificationOutboxInsert = typeof notificationOutbox.$inferInsert;

function parseDate(value: string): Date {
  return new Date(value);
}

function toIso(value: Date): string {
  return value.toISOString();
}

function nullableIso(value: Date | null): string | undefined {
  return value ? toIso(value) : undefined;
}

export function mapNotificationOutboxEntryToInsert(
  entry: NewNotificationOutboxEntry,
): NotificationOutboxInsert {
  return {
    id: entry.id,
    tenantId: entry.tenantId,
    companyId: entry.companyId,
    eventType: entry.eventType,
    module: entry.module,
    entityType: entry.entityType,
    entityId: entry.entityId,
    actorUserId: entry.actorUserId,
    occurredAt: parseDate(entry.occurredAt),
    payload: entry.payload,
    status: entry.status,
    attempts: entry.attempts,
    availableAt: parseDate(entry.availableAt),
    processedAt: entry.processedAt ? parseDate(entry.processedAt) : null,
    lastErrorCode: entry.lastErrorCode,
    correlationId: entry.correlationId,
  };
}

export function mapNotificationOutboxRow(row: NotificationOutboxRecord): NotificationOutboxEntry {
  return {
    id: row.id,
    tenantId: row.tenantId,
    companyId: row.companyId ?? undefined,
    eventType: row.eventType,
    module: row.module,
    entityType: row.entityType,
    entityId: row.entityId,
    actorUserId: row.actorUserId ?? undefined,
    occurredAt: toIso(row.occurredAt),
    payload: row.payload,
    status: row.status ?? NotificationOutboxStatus.Pending,
    attempts: row.attempts,
    availableAt: toIso(row.availableAt),
    processedAt: nullableIso(row.processedAt),
    lastErrorCode: row.lastErrorCode ?? undefined,
    correlationId: row.correlationId,
    createdAt: toIso(row.createdAt),
  };
}
