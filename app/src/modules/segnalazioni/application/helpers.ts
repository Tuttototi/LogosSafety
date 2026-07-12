import {
  canCommentSegnalazione,
  canManageSegnalazione,
  canTransition,
  canViewSegnalazione,
  isClosed,
  StatoSegnalazione,
  validateReporter,
  type Commento,
  type DomainId,
  type Segnalazione,
  type WorkflowEvento,
} from "../domain";
import { ApplicationErrorCode, fail, ok, type ApplicationResult } from "./errors/ApplicationError";
import type { SegnalazioniUseCaseDependencies } from "./dependencies";
import { ApplicationEventType, type ApplicationActor, type ApplicationEvent } from "./types";

export function validateActor(actor: ApplicationActor): ApplicationResult<void> {
  if (!actor.active) {
    return fail(ApplicationErrorCode.InactiveUser, "Actor is inactive");
  }

  const validation = validateReporter(actor);
  if (!validation.valid) {
    return fail(ApplicationErrorCode.Unauthorized, "Actor is not a valid authenticated reporter", {
      errors: validation.errors,
    });
  }

  return ok(undefined);
}

export async function loadVisibleSegnalazione(
  deps: SegnalazioniUseCaseDependencies,
  actor: ApplicationActor,
  id: DomainId,
): Promise<ApplicationResult<Segnalazione>> {
  const actorResult = validateActor(actor);
  if (!actorResult.success) return actorResult;

  const segnalazione = await deps.repository.findById(id);
  if (!segnalazione) {
    return fail(ApplicationErrorCode.NotFound, "Segnalazione not found", { id });
  }

  if (actor.canAccessAllTenants !== true && actor.tenantId !== segnalazione.tenantId) {
    return fail(ApplicationErrorCode.CrossTenantAccess, "Cross-tenant access is not allowed", {
      actorTenantId: actor.tenantId,
      tenantId: segnalazione.tenantId,
    });
  }

  if (!canViewSegnalazione(actor, segnalazione)) {
    return fail(ApplicationErrorCode.Forbidden, "Actor cannot view this segnalazione", { id });
  }

  return ok(segnalazione);
}

export function ensureCanManage(actor: ApplicationActor, segnalazione: Segnalazione): ApplicationResult<void> {
  if (!canManageSegnalazione(actor, segnalazione)) {
    return fail(ApplicationErrorCode.Forbidden, "Actor cannot manage this segnalazione", {
      id: segnalazione.id,
    });
  }

  return ok(undefined);
}

export function ensureCanComment(actor: ApplicationActor, segnalazione: Segnalazione): ApplicationResult<void> {
  if (!canCommentSegnalazione(actor, segnalazione)) {
    return fail(ApplicationErrorCode.Forbidden, "Actor cannot comment this segnalazione", {
      id: segnalazione.id,
    });
  }

  if (isClosed(segnalazione.status)) {
    return fail(ApplicationErrorCode.InvalidTransition, "Closed segnalazioni cannot receive comments", {
      status: segnalazione.status,
    });
  }

  return ok(undefined);
}

export function applyStatusTransition(
  deps: SegnalazioniUseCaseDependencies,
  actor: ApplicationActor,
  segnalazione: Segnalazione,
  status: StatoSegnalazione,
  note?: string,
): ApplicationResult<Segnalazione> {
  if (!canTransition(segnalazione.status, status)) {
    return fail(ApplicationErrorCode.InvalidTransition, "Status transition is not allowed", {
      from: segnalazione.status,
      to: status,
    });
  }

  const now = deps.clock.now();
  const workflowEvent: WorkflowEvento = {
    id: deps.ids.nextId("workflow"),
    segnalazioneId: segnalazione.id,
    statoDa: segnalazione.status,
    statoA: status,
    eseguitoDaId: actor.userId,
    eseguitoDaNome: `${actor.firstName} ${actor.lastName}`,
    note,
    createdAt: now,
  };

  return ok({
    ...segnalazione,
    status,
    updatedAt: now,
    closedAt: status === StatoSegnalazione.Chiusa ? now : segnalazione.closedAt,
    workflow: [...(segnalazione.workflow ?? []), workflowEvent],
  });
}

export function makeComment(
  deps: SegnalazioniUseCaseDependencies,
  actor: ApplicationActor,
  segnalazione: Segnalazione,
  text: string,
  isPublic = true,
): Commento {
  const now = deps.clock.now();
  return {
    id: deps.ids.nextId("comment"),
    segnalazioneId: segnalazione.id,
    testo: text,
    autoreId: actor.userId,
    autoreNome: `${actor.firstName} ${actor.lastName}`,
    pubblico: isPublic,
    createdAt: now,
    updatedAt: now,
  };
}

export function makeEvent(
  type: ApplicationEventType,
  actor: ApplicationActor,
  segnalazione: Segnalazione,
  timestamp: string,
  metadata?: Record<string, unknown>,
): ApplicationEvent {
  return {
    type,
    tenantId: segnalazione.tenantId,
    companyId: segnalazione.companyId,
    userId: actor.userId,
    actorPersonId: actor.personId,
    actorRole: actor.role,
    entityType: "Segnalazione",
    entityId: segnalazione.id,
    timestamp,
    metadata,
  };
}

export async function recordEvent(
  deps: SegnalazioniUseCaseDependencies,
  event: ApplicationEvent,
): Promise<void> {
  await deps.audit.record(event);
  await deps.notification.notify(event);
}

export async function persistStatusChange(
  deps: SegnalazioniUseCaseDependencies,
  actor: ApplicationActor,
  segnalazione: Segnalazione,
  status: StatoSegnalazione,
  eventType: ApplicationEventType,
  note?: string,
): Promise<ApplicationResult<Segnalazione>> {
  const manageResult = ensureCanManage(actor, segnalazione);
  if (!manageResult.success) return manageResult;

  const transitionResult = applyStatusTransition(deps, actor, segnalazione, status, note);
  if (!transitionResult.success) return transitionResult;

  await deps.repository.update(transitionResult.data);
  await recordEvent(
    deps,
    makeEvent(eventType, actor, transitionResult.data, deps.clock.now(), {
      from: segnalazione.status,
      to: status,
      note,
    }),
  );

  return ok(transitionResult.data);
}
