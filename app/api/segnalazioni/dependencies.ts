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
  type ClockPort,
  type IdGeneratorPort,
  type AcknowledgeSegnalazioneInput,
  type SegnalazioneActionInput,
  type SegnalazioniUseCaseDependencies,
} from "@/modules/segnalazioni/application";
import {
  DrizzleSegnalazioniRepository,
  type SegnalazioniDrizzleDatabase,
} from "@/modules/segnalazioni/infrastructure/persistence";
import {
  DrizzleAuditLogRepository,
  SegnalazioniAuditPort,
} from "@/modules/audit";
import {
  DrizzleNotificationOutboxRepository,
  SegnalazioniNotificationOutboxPort,
} from "@/modules/notifications";
import { DrizzleTransactionCoordinator } from "@/modules/shared/infrastructure/drizzle/TransactionContext";
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

type UseCase<TInput, TOutput> = (input: TInput) => Promise<TOutput>;

function transactional<TInput, TOutput>(
  coordinator: DrizzleTransactionCoordinator,
  ids: IdGeneratorPort,
  useCase: UseCase<TInput, TOutput>,
): UseCase<TInput, TOutput> {
  return async (input: TInput) =>
    coordinator.run(ids.nextId("correlation"), () => useCase(input));
}

export function createSegnalazioniDependencies(): SegnalazioniApiDependencies {
  const db = getDb() as unknown as SegnalazioniDrizzleDatabase;
  const ids = new CryptoIdGenerator();
  const repository = new DrizzleSegnalazioniRepository(db);
  const auditRepository = new DrizzleAuditLogRepository(db);
  const notificationOutboxRepository = new DrizzleNotificationOutboxRepository(db);
  const coordinator = new DrizzleTransactionCoordinator(db);
  const deps: SegnalazioniUseCaseDependencies = {
    repository,
    audit: new SegnalazioniAuditPort(auditRepository, ids),
    notification: new SegnalazioniNotificationOutboxPort(notificationOutboxRepository, ids),
    clock: new SystemClock(),
    ids,
  };
  const createSegnalazione = createCreateSegnalazioneUseCase(deps);
  const addComment = createAddCommentUseCase(deps);
  const requestIntegration = createRequestIntegrationUseCase(deps);
  const integrateSegnalazione = createIntegrateSegnalazioneUseCase(deps);
  const takeInChargeSegnalazione = createTakeInChargeSegnalazioneUseCase(deps);
  const changeSegnalazioneStatus = createChangeSegnalazioneStatusUseCase(deps);
  const resolveSegnalazione = createResolveSegnalazioneUseCase(deps);
  const closeSegnalazione = createCloseSegnalazioneUseCase(deps);
  const acknowledgeSegnalazione = createAcknowledgeSegnalazioneUseCase(deps);

  return {
    createSegnalazione: transactional(coordinator, ids, createSegnalazione),
    listVisibleSegnalazioni: createListVisibleSegnalazioniUseCase(deps),
    getSegnalazioneById: createGetSegnalazioneByIdUseCase(deps),
    addComment: transactional(coordinator, ids, addComment),
    requestIntegration: transactional(coordinator, ids, requestIntegration),
    integrateSegnalazione: transactional(coordinator, ids, integrateSegnalazione),
    takeInChargeSegnalazione: transactional(coordinator, ids, takeInChargeSegnalazione),
    changeSegnalazioneStatus: transactional(coordinator, ids, changeSegnalazioneStatus),
    resolveSegnalazione: transactional(coordinator, ids, resolveSegnalazione),
    closeSegnalazione: transactional(coordinator, ids, closeSegnalazione),
    acknowledgeSegnalazione: transactional(coordinator, ids, acknowledgeSegnalazione),
    hasAcknowledgement: async (input: AcknowledgeSegnalazioneInput) =>
      repository.hasAcknowledgement(input.id, input.actor.userId, input.actor.tenantId),
    listAcknowledgements: async (input: SegnalazioneActionInput) =>
      repository.listAcknowledgements(input.id, input.actor.tenantId),
  };
}
