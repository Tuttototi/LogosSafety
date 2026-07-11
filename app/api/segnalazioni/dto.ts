import type { Segnalazione } from "@/modules/segnalazioni/domain";

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

export function toSegnalazioneDetailDto(segnalazione: Segnalazione) {
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
    closedAt: segnalazione.closedAt,
  };
}

export type SegnalazioneListItemDto = ReturnType<typeof toSegnalazioneListItemDto>;
export type SegnalazioneDetailDto = ReturnType<typeof toSegnalazioneDetailDto>;
