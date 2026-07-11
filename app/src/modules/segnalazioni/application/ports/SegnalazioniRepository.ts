import type { Commento, DomainId, OrganizationalScope, Segnalazione } from "../../domain";
import type { AcknowledgementRecord, ApplicationActor } from "../types";

export interface ListVisibleByScopeContext {
  actor: ApplicationActor;
  organizationalScope?: OrganizationalScope;
}

export interface SegnalazioniRepository {
  findById(id: DomainId, tenantId?: DomainId): Promise<Segnalazione | null>;
  listVisibleByScope(context: ListVisibleByScopeContext): Promise<Segnalazione[]>;
  create(segnalazione: Segnalazione): Promise<void>;
  update(segnalazione: Segnalazione): Promise<void>;
  addComment(comment: Commento): Promise<void>;
  saveAcknowledgement(acknowledgement: AcknowledgementRecord): Promise<void>;
  findAcknowledgement(segnalazioneId: DomainId, userId: DomainId, tenantId?: DomainId): Promise<AcknowledgementRecord | null>;
  listAcknowledgements(segnalazioneId: DomainId, tenantId?: DomainId): Promise<AcknowledgementRecord[]>;
  hasAcknowledgement(segnalazioneId: DomainId, userId: DomainId, tenantId?: DomainId): Promise<boolean>;
  existsByCode(code: string, tenantId?: DomainId): Promise<boolean>;
}
