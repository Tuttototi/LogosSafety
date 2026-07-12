import {
  ApplicationEventType,
  type ApplicationEvent,
  type AuditPort,
  type IdGeneratorPort,
} from "@/modules/segnalazioni/application";
import type { AuditLogRepository } from "../application";
import type { NewAuditLogEntry } from "../domain";
import { getActiveCorrelationId } from "@/modules/shared/infrastructure/drizzle/TransactionContext";

interface AuditMapping {
  eventType: string;
  action: string;
}

const AUDIT_MAPPINGS: Record<ApplicationEventType, AuditMapping> = {
  [ApplicationEventType.SegnalazioneCreated]: {
    eventType: "segnalazione_created",
    action: "create",
  },
  [ApplicationEventType.SegnalazioneTakenInCharge]: {
    eventType: "segnalazione_taken_in_charge",
    action: "take_in_charge",
  },
  [ApplicationEventType.CommentAdded]: {
    eventType: "segnalazione_comment_added",
    action: "add_comment",
  },
  [ApplicationEventType.IntegrationRequested]: {
    eventType: "segnalazione_integration_requested",
    action: "request_integration",
  },
  [ApplicationEventType.SegnalazioneIntegrated]: {
    eventType: "segnalazione_integrated",
    action: "integrate",
  },
  [ApplicationEventType.StatusChanged]: {
    eventType: "segnalazione_status_changed",
    action: "change_status",
  },
  [ApplicationEventType.SegnalazioneResolved]: {
    eventType: "segnalazione_resolved",
    action: "resolve",
  },
  [ApplicationEventType.SegnalazioneClosed]: {
    eventType: "segnalazione_closed",
    action: "close",
  },
  [ApplicationEventType.SegnalazioneAcknowledged]: {
    eventType: "segnalazione_acknowledged",
    action: "acknowledge",
  },
};

const SENSITIVE_METADATA_KEYS = new Set([
  "password",
  "token",
  "cookie",
  "session",
  "sessionid",
  "databaseurl",
  "secret",
  "authorization",
  "stack",
  "payload",
]);

function isSafePrimitive(value: unknown): value is string | number | boolean | null {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_METADATA_KEYS.has(key.replace(/[_-]/g, "").toLowerCase());
}

export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!metadata) return undefined;

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (isSensitiveKey(key)) continue;
    if (isSafePrimitive(value)) {
      sanitized[key] = value;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

export function mapSegnalazioniEventToAuditEntry(
  event: ApplicationEvent,
  id: string,
  correlationId: string,
): NewAuditLogEntry {
  const mapping = AUDIT_MAPPINGS[event.type];
  const rawMetadata = event.metadata ?? {};
  const metadata = sanitizeAuditMetadata({
    code: rawMetadata.code,
    status: rawMetadata.status,
    previousStatus: rawMetadata.from,
    newStatus: rawMetadata.to,
    commentId: rawMetadata.commentId,
  });

  return {
    id,
    tenantId: event.tenantId,
    companyId: event.companyId,
    eventType: mapping.eventType,
    module: "segnalazioni",
    action: mapping.action,
    entityType: event.entityType,
    entityId: event.entityId,
    actorUserId: event.userId,
    actorPersonId: event.actorPersonId,
    actorRole: event.actorRole,
    occurredAt: event.timestamp,
    correlationId,
    metadata,
  };
}

export class SegnalazioniAuditPort implements AuditPort {
  private readonly repository: AuditLogRepository;
  private readonly ids: IdGeneratorPort;
  private readonly correlationIdProvider: () => string | undefined;

  constructor(
    repository: AuditLogRepository,
    ids: IdGeneratorPort,
    correlationIdProvider: () => string | undefined = getActiveCorrelationId,
  ) {
    this.repository = repository;
    this.ids = ids;
    this.correlationIdProvider = correlationIdProvider;
  }

  async record(event: ApplicationEvent): Promise<void> {
    const correlationId = event.correlationId ?? this.correlationIdProvider() ?? this.ids.nextId("correlation");
    await this.repository.append(
      mapSegnalazioniEventToAuditEntry(event, this.ids.nextId("audit"), correlationId),
    );
  }
}
