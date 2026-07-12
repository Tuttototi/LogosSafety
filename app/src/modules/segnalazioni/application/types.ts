import type {
  Allegato,
  CategoriaSegnalazione,
  Commento,
  DomainId,
  GravitaSegnalazione,
  ISODateTimeString,
  OrganizationalScope,
  PrioritaSegnalazione,
  Segnalazione,
  SegnalazioniActor,
  StatoSegnalazione,
  TipoSegnalazione,
} from "../domain";

/**
 * Backend-built application actor.
 * Future API adapters must construct this from trusted authenticated server context, never from raw client input.
 */
export type ApplicationActor = SegnalazioniActor;

export const ApplicationEventType = {
  SegnalazioneCreated: "SEGNALAZIONE_CREATED",
  SegnalazioneTakenInCharge: "SEGNALAZIONE_TAKEN_IN_CHARGE",
  CommentAdded: "COMMENT_ADDED",
  IntegrationRequested: "INTEGRATION_REQUESTED",
  SegnalazioneIntegrated: "SEGNALAZIONE_INTEGRATED",
  StatusChanged: "STATUS_CHANGED",
  SegnalazioneResolved: "SEGNALAZIONE_RESOLVED",
  SegnalazioneClosed: "SEGNALAZIONE_CLOSED",
  SegnalazioneAcknowledged: "SEGNALAZIONE_ACKNOWLEDGED",
} as const;

export type ApplicationEventType = (typeof ApplicationEventType)[keyof typeof ApplicationEventType];

export interface ApplicationEvent {
  type: ApplicationEventType;
  tenantId: string;
  companyId: string;
  userId: DomainId;
  actorPersonId?: DomainId;
  actorRole?: string;
  entityType: "Segnalazione" | "Commento" | "Acknowledgement";
  entityId: DomainId;
  timestamp: ISODateTimeString;
  correlationId?: DomainId;
  metadata?: Record<string, unknown>;
}

export interface AcknowledgementRecord {
  id: DomainId;
  segnalazioneId: DomainId;
  tenantId: string;
  companyId: string;
  userId: DomainId;
  personId: DomainId;
  acknowledgedAt: ISODateTimeString;
}

export interface CreateSegnalazioneInput {
  actor: ApplicationActor;
  title: string;
  description: string;
  priority: PrioritaSegnalazione;
  severity: GravitaSegnalazione;
  category: CategoriaSegnalazione;
  type: TipoSegnalazione;
  organizationalScope: OrganizationalScope;
  attachments?: Allegato[];
}

export interface ListVisibleSegnalazioniInput {
  actor: ApplicationActor;
  organizationalScope?: OrganizationalScope;
}

export interface GetSegnalazioneByIdInput {
  actor: ApplicationActor;
  id: DomainId;
}

export interface SegnalazioneActionInput {
  actor: ApplicationActor;
  id: DomainId;
  note?: string;
}

export interface AddCommentInput {
  actor: ApplicationActor;
  id: DomainId;
  text: string;
  public?: boolean;
  attachments?: Allegato[];
}

export interface RequestIntegrationInput {
  actor: ApplicationActor;
  id: DomainId;
  reason: string;
}

export interface IntegrateSegnalazioneInput {
  actor: ApplicationActor;
  id: DomainId;
  text?: string;
  attachments?: Allegato[];
}

export interface ChangeSegnalazioneStatusInput {
  actor: ApplicationActor;
  id: DomainId;
  status: StatoSegnalazione;
  note?: string;
}

export interface ResolveSegnalazioneInput {
  actor: ApplicationActor;
  id: DomainId;
  resolution: string;
}

export interface CloseSegnalazioneInput {
  actor: ApplicationActor;
  id: DomainId;
  note?: string;
}

export interface AcknowledgeSegnalazioneInput {
  actor: ApplicationActor;
  id: DomainId;
}

export interface StatusChangeResult {
  segnalazione: Segnalazione;
  workflowComment?: Commento;
}
