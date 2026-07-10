import type {
  SegnalazioneAcknowledgementRecord,
  SegnalazioneAttachmentRecord,
  SegnalazioneCommentRecord,
  SegnalazioneRecord,
  SegnalazioneWorkflowEventRecord,
} from "@db/schema";
import {
  CategoriaSegnalazione,
  GravitaSegnalazione,
  PrioritaSegnalazione,
  SegnalazioniRole,
  StatoSegnalazione,
  TipoAllegato,
  TipoSegnalazione,
  type Allegato,
  type Commento,
  type Segnalazione,
  type WorkflowEvento,
} from "../../domain";
import type { AcknowledgementRecord } from "../../application";
import { SegnalazioniPersistenceError } from "./errors";

type Nullable<T> = T | null | undefined;

const CATEGORIA_VALUES = Object.values(CategoriaSegnalazione);
const GRAVITA_VALUES = Object.values(GravitaSegnalazione);
const PRIORITA_VALUES = Object.values(PrioritaSegnalazione);
const ROLE_VALUES = Object.values(SegnalazioniRole);
const STATO_VALUES = Object.values(StatoSegnalazione);
const TIPO_ALLEGATO_VALUES = Object.values(TipoAllegato);
const TIPO_VALUES = Object.values(TipoSegnalazione);

function asDomainValue<T extends string>(
  field: string,
  value: string,
  allowedValues: readonly T[],
): T {
  if ((allowedValues as readonly string[]).includes(value)) {
    return value as T;
  }

  throw new SegnalazioniPersistenceError(`Invalid ${field} value from persistence`, {
    field,
    value,
  });
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toIsoOptional(value: Nullable<Date | string>): string | undefined {
  return value ? toIso(value) : undefined;
}

function toDate(value: string): Date {
  return new Date(value);
}

function nullable<T>(value: Nullable<T>): T | null {
  return value ?? null;
}

function optional<T>(value: Nullable<T>): T | undefined {
  return value ?? undefined;
}

export function mapSegnalazioneRowToDomain(
  row: SegnalazioneRecord,
  attachments: readonly Allegato[] = [],
  comments: readonly Commento[] = [],
  workflow: readonly WorkflowEvento[] = [],
): Segnalazione {
  return {
    id: row.id,
    code: row.code,
    tenantId: row.tenantId,
    companyId: row.companyId,
    reporter: {
      userId: row.reporterUserId,
      personId: row.reporterPersonId,
      employeeId: optional(row.reporterEmployeeId),
      firstName: row.reporterFirstName,
      lastName: row.reporterLastName,
      email: optional(row.reporterEmail),
      companyId: row.reporterCompanyId,
      role: asDomainValue("reporterRole", row.reporterRole, ROLE_VALUES),
    },
    createdByUserId: row.createdByUserId,
    createdByPersonId: row.createdByPersonId,
    organizationalScope: {
      tenantId: row.tenantId,
      companyId: row.companyId,
      contractId: optional(row.contractId),
      siteId: optional(row.siteId),
      plantId: optional(row.plantId),
      areaId: optional(row.areaId),
    },
    title: row.title,
    description: row.description,
    priority: asDomainValue("priority", row.priority, PRIORITA_VALUES),
    severity: asDomainValue("severity", row.severity, GRAVITA_VALUES),
    status: asDomainValue("status", row.status, STATO_VALUES),
    category: asDomainValue("category", row.category, CATEGORIA_VALUES),
    type: asDomainValue("type", row.type, TIPO_VALUES),
    assignedToUserId: optional(row.assignedToUserId),
    responsibleUserId: optional(row.responsibleUserId),
    attachments: [...attachments],
    comments: [...comments],
    workflow: [...workflow],
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    closedAt: toIsoOptional(row.closedAt),
  };
}

export function mapAttachmentRowToDomain(row: SegnalazioneAttachmentRecord): Allegato {
  return {
    id: row.id,
    nomeFile: row.fileName,
    mimeType: row.mimeType,
    dimensioneByte: row.fileSize,
    tipo: asDomainValue("attachmentType", row.attachmentType, TIPO_ALLEGATO_VALUES),
    descrizione: optional(row.description),
    checksum: optional(row.checksum),
    segnalazioneId: row.segnalazioneId,
    commentoId: optional(row.commentId),
    comunicazioneId: optional(row.comunicazioneId),
    caricatoDaId: optional(row.uploadedByUserId),
    caricatoDaNome: optional(row.uploadedByName),
    caricatoAt: toIso(row.createdAt),
  };
}

export function mapCommentRowToDomain(
  row: SegnalazioneCommentRecord,
  attachments: readonly Allegato[] = [],
): Commento {
  return {
    id: row.id,
    segnalazioneId: row.segnalazioneId,
    testo: row.body,
    autoreId: optional(row.authorUserId),
    autoreNome: optional(row.authorName),
    pubblico: row.public,
    allegati: [...attachments],
    createdAt: toIso(row.createdAt),
    updatedAt: toIsoOptional(row.updatedAt),
  };
}

export function mapWorkflowEventRowToDomain(row: SegnalazioneWorkflowEventRecord): WorkflowEvento {
  return {
    id: row.id,
    segnalazioneId: row.segnalazioneId,
    statoDa: row.fromStatus ? asDomainValue("fromStatus", row.fromStatus, STATO_VALUES) : undefined,
    statoA: asDomainValue("toStatus", row.toStatus, STATO_VALUES),
    eseguitoDaId: optional(row.actorUserId),
    eseguitoDaNome: optional(row.actorName),
    note: optional(row.note),
    createdAt: toIso(row.createdAt),
  };
}

export function mapSegnalazioneToInsert(segnalazione: Segnalazione) {
  return {
    id: segnalazione.id,
    code: segnalazione.code,
    tenantId: segnalazione.tenantId,
    companyId: segnalazione.companyId,
    contractId: nullable(segnalazione.organizationalScope.contractId),
    siteId: nullable(segnalazione.organizationalScope.siteId),
    plantId: nullable(segnalazione.organizationalScope.plantId),
    areaId: nullable(segnalazione.organizationalScope.areaId),
    reporterUserId: segnalazione.reporter.userId,
    reporterPersonId: segnalazione.reporter.personId,
    reporterEmployeeId: nullable(segnalazione.reporter.employeeId),
    reporterFirstName: segnalazione.reporter.firstName,
    reporterLastName: segnalazione.reporter.lastName,
    reporterEmail: nullable(segnalazione.reporter.email),
    reporterCompanyId: segnalazione.reporter.companyId,
    reporterRole: segnalazione.reporter.role,
    createdByUserId: segnalazione.createdByUserId,
    createdByPersonId: segnalazione.createdByPersonId,
    title: segnalazione.title,
    description: segnalazione.description,
    priority: segnalazione.priority,
    severity: segnalazione.severity,
    status: segnalazione.status,
    category: segnalazione.category,
    type: segnalazione.type,
    assignedToUserId: nullable(segnalazione.assignedToUserId),
    responsibleUserId: nullable(segnalazione.responsibleUserId),
    closedAt: segnalazione.closedAt ? toDate(segnalazione.closedAt) : null,
    deletedAt: null,
    deletedByUserId: null,
    createdAt: toDate(segnalazione.createdAt),
    updatedAt: toDate(segnalazione.updatedAt),
  };
}

export function mapSegnalazioneToUpdate(segnalazione: Segnalazione) {
  return {
    contractId: nullable(segnalazione.organizationalScope.contractId),
    siteId: nullable(segnalazione.organizationalScope.siteId),
    plantId: nullable(segnalazione.organizationalScope.plantId),
    areaId: nullable(segnalazione.organizationalScope.areaId),
    title: segnalazione.title,
    description: segnalazione.description,
    priority: segnalazione.priority,
    severity: segnalazione.severity,
    status: segnalazione.status,
    category: segnalazione.category,
    type: segnalazione.type,
    assignedToUserId: nullable(segnalazione.assignedToUserId),
    responsibleUserId: nullable(segnalazione.responsibleUserId),
    closedAt: segnalazione.closedAt ? toDate(segnalazione.closedAt) : null,
    updatedAt: toDate(segnalazione.updatedAt),
  };
}

export function mapCommentToInsert(
  comment: Commento,
  parent: Pick<Segnalazione, "tenantId" | "companyId">,
) {
  return {
    id: comment.id,
    segnalazioneId: comment.segnalazioneId,
    tenantId: parent.tenantId,
    companyId: parent.companyId,
    authorUserId: nullable(comment.autoreId),
    authorName: nullable(comment.autoreNome),
    body: comment.testo,
    public: comment.pubblico,
    deletedAt: null,
    createdAt: toDate(comment.createdAt),
    updatedAt: comment.updatedAt ? toDate(comment.updatedAt) : toDate(comment.createdAt),
  };
}

export function mapAttachmentToInsert(
  attachment: Allegato,
  parent: Pick<Segnalazione, "tenantId" | "companyId" | "id">,
  commentId?: string,
) {
  return {
    id: attachment.id,
    segnalazioneId: attachment.segnalazioneId ?? parent.id,
    commentId: attachment.commentoId ?? commentId ?? null,
    comunicazioneId: nullable(attachment.comunicazioneId),
    tenantId: parent.tenantId,
    companyId: parent.companyId,
    fileName: attachment.nomeFile,
    mimeType: attachment.mimeType,
    fileSize: attachment.dimensioneByte,
    attachmentType: attachment.tipo,
    description: nullable(attachment.descrizione),
    checksum: nullable(attachment.checksum),
    storageKey: null,
    uploadedByUserId: nullable(attachment.caricatoDaId),
    uploadedByName: nullable(attachment.caricatoDaNome),
    deletedAt: null,
    createdAt: toDate(attachment.caricatoAt),
  };
}

export function mapWorkflowEventToInsert(event: WorkflowEvento, parent: Segnalazione) {
  return {
    id: event.id,
    segnalazioneId: event.segnalazioneId,
    tenantId: parent.tenantId,
    companyId: parent.companyId,
    eventType: "status_transition",
    fromStatus: nullable(event.statoDa),
    toStatus: event.statoA,
    actorUserId: nullable(event.eseguitoDaId),
    actorName: nullable(event.eseguitoDaNome),
    note: nullable(event.note),
    createdAt: toDate(event.createdAt),
  };
}

export function mapAcknowledgementToInsert(acknowledgement: AcknowledgementRecord) {
  return {
    id: acknowledgement.id,
    segnalazioneId: acknowledgement.segnalazioneId,
    tenantId: acknowledgement.tenantId,
    companyId: acknowledgement.companyId,
    userId: acknowledgement.userId,
    personId: acknowledgement.personId,
    acknowledgedAt: toDate(acknowledgement.acknowledgedAt),
  };
}

export function mapAcknowledgementRowToApplication(
  row: SegnalazioneAcknowledgementRecord,
): AcknowledgementRecord {
  return {
    id: row.id,
    segnalazioneId: row.segnalazioneId,
    tenantId: row.tenantId,
    companyId: row.companyId,
    userId: row.userId,
    personId: row.personId,
    acknowledgedAt: toIso(row.acknowledgedAt),
  };
}
