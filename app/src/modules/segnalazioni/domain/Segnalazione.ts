import type { Allegato } from "./Allegato";
import type { Commento } from "./Commento";
import type {
  CategoriaSegnalazione,
  DomainId,
  GravitaSegnalazione,
  ISODateTimeString,
  PrioritaSegnalazione,
  StatoSegnalazione,
  TipoSegnalazione,
} from "./Enums";
import type { CompanyId, OrganizationalScope, TenantId } from "./OrganizationalScope";
import type { Reporter, ReporterSnapshot } from "./Reporter";
import type { WorkflowEvento } from "./workflow";

/**
 * Aggregate root for a safety report.
 * createdByUserId and createdByPersonId are stable references to LogosSafety records.
 * reporter is a minimal descriptive snapshot of the authenticated author at creation time.
 */
export interface Segnalazione {
  id: DomainId;
  code: string;
  tenantId: TenantId;
  companyId: CompanyId;
  reporter: ReporterSnapshot;
  createdByUserId: DomainId;
  createdByPersonId: DomainId;
  organizationalScope: OrganizationalScope;
  title: string;
  description: string;
  priority: PrioritaSegnalazione;
  severity: GravitaSegnalazione;
  status: StatoSegnalazione;
  category: CategoriaSegnalazione;
  type: TipoSegnalazione;
  assignedToUserId?: DomainId;
  responsibleUserId?: DomainId;
  attachments?: Allegato[];
  comments?: Commento[];
  workflow?: WorkflowEvento[];
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  closedAt?: ISODateTimeString;
}

/**
 * Input shape for creating a report before backend persistence exists.
 */
export interface SegnalazioneInput {
  tenantId: TenantId;
  companyId: CompanyId;
  reporter: Reporter;
  organizationalScope: OrganizationalScope;
  title: string;
  description: string;
  priority: PrioritaSegnalazione;
  severity: GravitaSegnalazione;
  category: CategoriaSegnalazione;
  type: TipoSegnalazione;
  attachments?: Allegato[];
}

/**
 * Patch shape for status and assignment changes.
 */
export interface SegnalazioneUpdate {
  title?: string;
  description?: string;
  priority?: PrioritaSegnalazione;
  severity?: GravitaSegnalazione;
  status?: StatoSegnalazione;
  assignedToUserId?: DomainId;
  responsibleUserId?: DomainId;
}
