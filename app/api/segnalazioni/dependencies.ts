import {
  createAcknowledgeSegnalazioneUseCase,
  createAddCommentUseCase,
  createChangeSegnalazioneStatusUseCase,
  createCloseSegnalazioneUseCase,
  createCreateSegnalazioneUseCase,
  createGetSegnalazioneByIdUseCase,
  createIntegrateSegnalazioneUseCase,
  createListVisibleSegnalazioniUseCase,
  createRequestIntegrationUseCase,
  createResolveSegnalazioneUseCase,
  createTakeInChargeSegnalazioneUseCase,
  type AcknowledgementRecord,
  type ApplicationEvent,
  type AuditPort,
  type ClockPort,
  type IdGeneratorPort,
  type NotificationPort,
  type AcknowledgeSegnalazioneInput,
  type SegnalazioneActionInput,
  type SegnalazioniUseCaseDependencies,
} from "@/modules/segnalazioni/application";
import {
  DrizzleSegnalazioniRepository,
  type SegnalazioniDrizzleDatabase,
} from "@/modules/segnalazioni/infrastructure/persistence";
import { getDb } from "../queries/connection";
import type { TrpcContext } from "../context";

class SystemClock implements ClockPort {
  now(): string {
    return new Date().toISOString();
  }
}

class CryptoIdGenerator implements IdGeneratorPort {
  nextId(entity = "id"): string {
    return `${entity}-${crypto.randomUUID()}`;
  }

  nextCode(prefix = "SEG"): string {
    const year = new Date().getUTCFullYear();
    return `${prefix}-${year}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  }
}

class DeferredAuditPort implements AuditPort {
  async record(event: ApplicationEvent): Promise<void> {
    void event;
    // Temporary API boundary: persistent audit wiring will be added with the module audit/outbox sprint.
  }
}

class DeferredNotificationPort implements NotificationPort {
  async notify(event: ApplicationEvent): Promise<void> {
    void event;
    // Temporary API boundary: notification dispatch will be added when Notifiche consumes module events.
  }
}

export interface SegnalazioniApiDependencies {
  createSegnalazione: ReturnType<typeof createCreateSegnalazioneUseCase>;
  listVisibleSegnalazioni: ReturnType<typeof createListVisibleSegnalazioniUseCase>;
  getSegnalazioneById: ReturnType<typeof createGetSegnalazioneByIdUseCase>;
  addComment: ReturnType<typeof createAddCommentUseCase>;
  requestIntegration: ReturnType<typeof createRequestIntegrationUseCase>;
  integrateSegnalazione: ReturnType<typeof createIntegrateSegnalazioneUseCase>;
  takeInChargeSegnalazione: ReturnType<typeof createTakeInChargeSegnalazioneUseCase>;
  changeSegnalazioneStatus: ReturnType<typeof createChangeSegnalazioneStatusUseCase>;
  resolveSegnalazione: ReturnType<typeof createResolveSegnalazioneUseCase>;
  closeSegnalazione: ReturnType<typeof createCloseSegnalazioneUseCase>;
  acknowledgeSegnalazione: ReturnType<typeof createAcknowledgeSegnalazioneUseCase>;
  hasAcknowledgement: (input: AcknowledgeSegnalazioneInput) => Promise<boolean>;
  listAcknowledgements: (input: SegnalazioneActionInput) => Promise<AcknowledgementRecord[]>;
}

export type SegnalazioniDependencyFactory = (ctx: TrpcContext) => SegnalazioniApiDependencies;

export function createSegnalazioniDependencies(): SegnalazioniApiDependencies {
  const db = getDb() as unknown as SegnalazioniDrizzleDatabase;
  const repository = new DrizzleSegnalazioniRepository(db);
  const deps: SegnalazioniUseCaseDependencies = {
    repository,
    audit: new DeferredAuditPort(),
    notification: new DeferredNotificationPort(),
    clock: new SystemClock(),
    ids: new CryptoIdGenerator(),
  };

  return {
    createSegnalazione: createCreateSegnalazioneUseCase(deps),
    listVisibleSegnalazioni: createListVisibleSegnalazioniUseCase(deps),
    getSegnalazioneById: createGetSegnalazioneByIdUseCase(deps),
    addComment: createAddCommentUseCase(deps),
    requestIntegration: createRequestIntegrationUseCase(deps),
    integrateSegnalazione: createIntegrateSegnalazioneUseCase(deps),
    takeInChargeSegnalazione: createTakeInChargeSegnalazioneUseCase(deps),
    changeSegnalazioneStatus: createChangeSegnalazioneStatusUseCase(deps),
    resolveSegnalazione: createResolveSegnalazioneUseCase(deps),
    closeSegnalazione: createCloseSegnalazioneUseCase(deps),
    acknowledgeSegnalazione: createAcknowledgeSegnalazioneUseCase(deps),
    hasAcknowledgement: async (input: AcknowledgeSegnalazioneInput) =>
      repository.hasAcknowledgement(input.id, input.actor.userId, input.actor.tenantId),
    listAcknowledgements: async (input: SegnalazioneActionInput) =>
      repository.listAcknowledgements(input.id, input.actor.tenantId),
  };
}
