import { and, desc, eq } from "drizzle-orm";
import { auditLogEntries } from "@db/schema";
import type { AuditLogRepository } from "../application";
import type {
  AuditLogActorQuery,
  AuditLogCorrelationQuery,
  AuditLogEntityQuery,
  AuditLogEntry,
  NewAuditLogEntry,
} from "../domain";
import {
  getActiveDrizzleDatabase,
  type LogosDrizzleDatabase,
} from "@/modules/shared/infrastructure/drizzle/TransactionContext";
import { AuditPersistenceError } from "./errors";
import { mapAuditLogEntryRow, mapAuditLogEntryToInsert } from "./mappers";

const DEFAULT_LIMIT = 100;

export class DrizzleAuditLogRepository implements AuditLogRepository {
  private readonly db: LogosDrizzleDatabase;

  constructor(db: LogosDrizzleDatabase) {
    this.db = db;
  }

  private currentDb(): LogosDrizzleDatabase {
    return getActiveDrizzleDatabase(this.db);
  }

  async append(entry: NewAuditLogEntry): Promise<AuditLogEntry> {
    try {
      await this.currentDb().insert(auditLogEntries).values(mapAuditLogEntryToInsert(entry));
      const rows = await this.currentDb()
        .select()
        .from(auditLogEntries)
        .where(and(eq(auditLogEntries.tenantId, entry.tenantId), eq(auditLogEntries.id, entry.id)))
        .limit(1);

      const row = rows.at(0);
      if (!row) throw new Error("Inserted audit entry was not found");
      return mapAuditLogEntryRow(row);
    } catch (error) {
      if (error instanceof AuditPersistenceError) throw error;
      throw new AuditPersistenceError("Cannot append audit log entry", { cause: error });
    }
  }

  async listByEntity(query: AuditLogEntityQuery): Promise<AuditLogEntry[]> {
    const rows = await this.currentDb()
      .select()
      .from(auditLogEntries)
      .where(and(
        eq(auditLogEntries.tenantId, query.tenantId),
        eq(auditLogEntries.module, query.module),
        eq(auditLogEntries.entityType, query.entityType),
        eq(auditLogEntries.entityId, query.entityId),
      ))
      .orderBy(desc(auditLogEntries.occurredAt), desc(auditLogEntries.createdAt))
      .limit(query.limit ?? DEFAULT_LIMIT);

    return rows.map(mapAuditLogEntryRow);
  }

  async listByActor(query: AuditLogActorQuery): Promise<AuditLogEntry[]> {
    const rows = await this.currentDb()
      .select()
      .from(auditLogEntries)
      .where(and(
        eq(auditLogEntries.tenantId, query.tenantId),
        eq(auditLogEntries.actorUserId, query.actorUserId),
      ))
      .orderBy(desc(auditLogEntries.occurredAt), desc(auditLogEntries.createdAt))
      .limit(query.limit ?? DEFAULT_LIMIT);

    return rows.map(mapAuditLogEntryRow);
  }

  async listByCorrelationId(query: AuditLogCorrelationQuery): Promise<AuditLogEntry[]> {
    const rows = await this.currentDb()
      .select()
      .from(auditLogEntries)
      .where(and(
        eq(auditLogEntries.tenantId, query.tenantId),
        eq(auditLogEntries.correlationId, query.correlationId),
      ))
      .orderBy(desc(auditLogEntries.occurredAt), desc(auditLogEntries.createdAt))
      .limit(query.limit ?? DEFAULT_LIMIT);

    return rows.map(mapAuditLogEntryRow);
  }
}
