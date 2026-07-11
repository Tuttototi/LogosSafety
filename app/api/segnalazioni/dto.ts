import {
  StatoSegnalazione,
  canCommentSegnalazione,
  canManageSegnalazione,
  canTransition,
  canViewSegnalazione,
  getAllowedTransitions,
  isClosed,
  type Commento,
  type Segnalazione,
  type StatoSegnalazione as StatoSegnalazioneValue,
  type WorkflowEvento,
} from "@/modules/segnalazioni/domain";
import type { AcknowledgementRecord, ApplicationActor } from "@/modules/segnalazioni/application";

export type SegnalazioneTimelineEventType =
  | "created"
  | "taken_in_charge"
  | "comment_added"
  | "integration_requested"
  | "integrated"
  | "status_changed"
  | "resolved"
  | "closed"
  | "acknowledged";

export type SegnalazioneTimelineItemDto = {
  id: string;
  type: SegnalazioneTimelineEventType;
  occurredAt: string;
  actorDisplayName?: string;
  actorRole?: string;
  previousStatus?: StatoSegnalazioneValue;
  newStatus?: StatoSegnalazioneValue;
  text?: string;
};

export type SegnalazioneCapabilitiesDto = {
  canComment: boolean;
  canTakeInCharge: boolean;
  canRequestIntegration: boolean;
  canIntegrate: boolean;
  canResolve: boolean;
  canClose: boolean;
  canAcknowledge: boolean;
  allowedStatusTransitions: StatoSegnalazioneValue[];
};

type DetailDtoOptions = {
  actor?: ApplicationActor;
  acknowledgements?: AcknowledgementRecord[];
  acknowledgedByCurrentUser?: boolean;
};

function reporterDisplayName(segnalazione: Segnalazione): string {
  return `${segnalazione.reporter.firstName} ${segnalazione.reporter.lastName}`.trim();
}

function toScopeDto(segnalazione: Segnalazione) {
  return {
    contractId: segnalazione.organizationalScope.contractId,
    siteId: segnalazione.organizationalScope.siteId,
    plantId: segnalazione.organizationalScope.plantId,
    areaId: segnalazione.organizationalScope.areaId,
  };
}

function workflowEventType(event: WorkflowEvento): SegnalazioneTimelineEventType {
  if (event.statoA === StatoSegnalazione.PresaInCarico) return "taken_in_charge";
  if (event.statoA === StatoSegnalazione.RichiestaIntegrazione) return "integration_requested";
  if (event.statoA === StatoSegnalazione.Integrata) return "integrated";
  if (event.statoA === StatoSegnalazione.Risolta) return "resolved";
  if (event.statoA === StatoSegnalazione.Chiusa) return "closed";
  return "status_changed";
}

function toCommentTimelineItem(comment: Commento): SegnalazioneTimelineItemDto {
  return {
    id: `comment-${comment.id}`,
    type: "comment_added",
    occurredAt: comment.createdAt,
    actorDisplayName: comment.autoreNome,
    text: comment.testo,
  };
}

function toWorkflowTimelineItem(event: WorkflowEvento): SegnalazioneTimelineItemDto {
  return {
    id: `workflow-${event.id}`,
    type: workflowEventType(event),
    occurredAt: event.createdAt,
    actorDisplayName: event.eseguitoDaNome,
    previousStatus: event.statoDa,
    newStatus: event.statoA,
    text: event.note,
  };
}

function toAcknowledgementTimelineItem(
  acknowledgement: AcknowledgementRecord,
  segnalazione: Segnalazione,
): SegnalazioneTimelineItemDto {
  const isReporter = acknowledgement.userId === segnalazione.reporter.userId;
  return {
    id: `acknowledgement-${acknowledgement.id}`,
    type: "acknowledged",
    occurredAt: acknowledgement.acknowledgedAt,
    actorDisplayName: isReporter ? reporterDisplayName(segnalazione) : undefined,
    actorRole: isReporter ? segnalazione.reporter.role : undefined,
  };
}

function toCreatedTimelineItem(segnalazione: Segnalazione): SegnalazioneTimelineItemDto {
  return {
    id: `created-${segnalazione.id}`,
    type: "created",
    occurredAt: segnalazione.createdAt,
    actorDisplayName: reporterDisplayName(segnalazione),
    actorRole: segnalazione.reporter.role,
    newStatus: StatoSegnalazione.Nuova,
    text: "Segnalazione creata",
  };
}

function buildTimeline(
  segnalazione: Segnalazione,
  acknowledgements: readonly AcknowledgementRecord[],
): SegnalazioneTimelineItemDto[] {
  return [
    toCreatedTimelineItem(segnalazione),
    ...(segnalazione.workflow ?? []).map(toWorkflowTimelineItem),
    ...(segnalazione.comments ?? []).map(toCommentTimelineItem),
    ...acknowledgements.map((acknowledgement) => toAcknowledgementTimelineItem(acknowledgement, segnalazione)),
  ].sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
}

function buildCapabilities(
  segnalazione: Segnalazione,
  actor?: ApplicationActor,
  acknowledgedByCurrentUser = false,
): SegnalazioneCapabilitiesDto {
  if (!actor || !canViewSegnalazione(actor, segnalazione)) {
    return {
      canComment: false,
      canTakeInCharge: false,
      canRequestIntegration: false,
      canIntegrate: false,
      canResolve: false,
      canClose: false,
      canAcknowledge: false,
      allowedStatusTransitions: [],
    };
  }

  const canManage = canManageSegnalazione(actor, segnalazione);
  const canComment = canCommentSegnalazione(actor, segnalazione) && !isClosed(segnalazione.status);
  const allowedStatusTransitions = canManage ? getAllowedTransitions(segnalazione.status) : [];

  return {
    canComment,
    canTakeInCharge: canManage && canTransition(segnalazione.status, StatoSegnalazione.PresaInCarico),
    canRequestIntegration: canManage && canTransition(segnalazione.status, StatoSegnalazione.RichiestaIntegrazione),
    canIntegrate: (canComment || canManage) && canTransition(segnalazione.status, StatoSegnalazione.Integrata),
    canResolve: canManage && canTransition(segnalazione.status, StatoSegnalazione.Risolta),
    canClose: canManage && canTransition(segnalazione.status, StatoSegnalazione.Chiusa),
    canAcknowledge: !acknowledgedByCurrentUser,
    allowedStatusTransitions,
  };
}

export function toSegnalazioneListItemDto(segnalazione: Segnalazione) {
  return {
    id: segnalazione.id,
    code: segnalazione.code,
    title: segnalazione.title,
    priority: segnalazione.priority,
    severity: segnalazione.severity,
    status: segnalazione.status,
    category: segnalazione.category,
    type: segnalazione.type,
    scope: toScopeDto(segnalazione),
    reporterDisplayName: reporterDisplayName(segnalazione),
    createdAt: segnalazione.createdAt,
    updatedAt: segnalazione.updatedAt,
  };
}

export function toSegnalazioneDetailDto(
  segnalazione: Segnalazione,
  options: DetailDtoOptions = {},
) {
  const acknowledgements = options.acknowledgements ?? [];
  return {
    ...toSegnalazioneListItemDto(segnalazione),
    description: segnalazione.description,
    organizationalScope: segnalazione.organizationalScope,
    reporter: {
      firstName: segnalazione.reporter.firstName,
      lastName: segnalazione.reporter.lastName,
      companyId: segnalazione.reporter.companyId,
      role: segnalazione.reporter.role,
    },
    assignedToUserId: segnalazione.assignedToUserId,
    responsibleUserId: segnalazione.responsibleUserId,
    attachments: segnalazione.attachments ?? [],
    comments: segnalazione.comments ?? [],
    workflow: segnalazione.workflow ?? [],
    timeline: buildTimeline(segnalazione, acknowledgements),
    capabilities: buildCapabilities(segnalazione, options.actor, options.acknowledgedByCurrentUser),
    acknowledgement: {
      acknowledged: options.acknowledgedByCurrentUser === true,
      acknowledgedAt: acknowledgements.find((item) => item.userId === options.actor?.userId)?.acknowledgedAt,
    },
    closedAt: segnalazione.closedAt,
  };
}

export type SegnalazioneListItemDto = ReturnType<typeof toSegnalazioneListItemDto>;
export type SegnalazioneDetailDto = ReturnType<typeof toSegnalazioneDetailDto>;
