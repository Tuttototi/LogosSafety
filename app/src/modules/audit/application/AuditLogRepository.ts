import type {
  AuditLogActorQuery,
  AuditLogCorrelationQuery,
  AuditLogEntityQuery,
  AuditLogEntry,
  NewAuditLogEntry,
} from "../domain";

export interface AuditLogRepository {
  append(entry: NewAuditLogEntry): Promise<AuditLogEntry>;
  listByEntity(query: AuditLogEntityQuery): Promise<AuditLogEntry[]>;
  listByActor(query: AuditLogActorQuery): Promise<AuditLogEntry[]>;
  listByCorrelationId(query: AuditLogCorrelationQuery): Promise<AuditLogEntry[]>;
}
