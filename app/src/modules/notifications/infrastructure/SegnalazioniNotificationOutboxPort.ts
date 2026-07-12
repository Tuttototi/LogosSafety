import {
  ApplicationEventType,
  type ApplicationEvent,
  type IdGeneratorPort,
  type NotificationPort,
} from "@/modules/segnalazioni/application";
import type { NotificationOutboxRepository } from "../application";
import {
  NotificationOutboxStatus,
  type NewNotificationOutboxEntry,
} from "../domain";
import { getActiveCorrelationId } from "@/modules/shared/infrastructure/drizzle/TransactionContext";

interface NotificationMapping {
  eventType: string;
  futureAudienceType: string;
}

const NOTIFICATION_MAPPINGS: Partial<Record<ApplicationEventType, NotificationMapping>> = {
  [ApplicationEventType.SegnalazioneCreated]: {
    eventType: "segnalazione_created",
    futureAudienceType: "scope_safety_managers",
  },
  [ApplicationEventType.SegnalazioneTakenInCharge]: {
    eventType: "segnalazione_taken_in_charge",
    futureAudienceType: "reporter",
  },
  [ApplicationEventType.CommentAdded]: {
    eventType: "segnalazione_comment_added",
    futureAudienceType: "authorized_participants",
  },
  [ApplicationEventType.IntegrationRequested]: {
    eventType: "segnalazione_integration_requested",
    futureAudienceType: "reporter",
  },
  [ApplicationEventType.SegnalazioneIntegrated]: {
    eventType: "segnalazione_integrated",
    futureAudienceType: "responsible_managers",
  },
  [ApplicationEventType.SegnalazioneResolved]: {
    eventType: "segnalazione_resolved",
    futureAudienceType: "reporter",
  },
  [ApplicationEventType.SegnalazioneClosed]: {
    eventType: "segnalazione_closed",
    futureAudienceType: "reporter",
  },
};

export function mapSegnalazioniEventToOutboxEntry(
  event: ApplicationEvent,
  id: string,
  correlationId: string,
): NewNotificationOutboxEntry | null {
  const mapping = NOTIFICATION_MAPPINGS[event.type];
  if (!mapping) return null;

  return {
    id,
    tenantId: event.tenantId,
    companyId: event.companyId,
    eventType: mapping.eventType,
    module: "segnalazioni",
    entityType: event.entityType,
    entityId: event.entityId,
    actorUserId: event.userId,
    occurredAt: event.timestamp,
    payload: {
      entityId: event.entityId,
      eventType: mapping.eventType,
      futureAudienceType: mapping.futureAudienceType,
      actorUserId: event.userId,
      occurredAt: event.timestamp,
    },
    status: NotificationOutboxStatus.Pending,
    attempts: 0,
    availableAt: event.timestamp,
    correlationId,
  };
}

export class SegnalazioniNotificationOutboxPort implements NotificationPort {
  private readonly repository: NotificationOutboxRepository;
  private readonly ids: IdGeneratorPort;
  private readonly correlationIdProvider: () => string | undefined;

  constructor(
    repository: NotificationOutboxRepository,
    ids: IdGeneratorPort,
    correlationIdProvider: () => string | undefined = getActiveCorrelationId,
  ) {
    this.repository = repository;
    this.ids = ids;
    this.correlationIdProvider = correlationIdProvider;
  }

  async notify(event: ApplicationEvent): Promise<void> {
    const correlationId = event.correlationId ?? this.correlationIdProvider() ?? this.ids.nextId("correlation");
    const outboxEntry = mapSegnalazioniEventToOutboxEntry(
      event,
      this.ids.nextId("notification"),
      correlationId,
    );

    if (!outboxEntry) return;
    await this.repository.enqueue(outboxEntry);
  }
}
