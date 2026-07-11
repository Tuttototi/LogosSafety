import type { ChangeEvent, FormEvent } from "react";

export type SegnalatoreAppVariant = "page" | "mobile";
export type SegnalatoreRoleGroup = "operational" | "manager" | "safety";
export type ReportPriority = "Bassa" | "Media" | "Alta" | "Critica";
export type ReportStatus =
  | "Nuova"
  | "Presa in carico"
  | "In lavorazione"
  | "Richiesta integrazione"
  | "Integrata"
  | "Risolta"
  | "Chiusa";
export type AppTab = "new" | "reports" | "communications";
export type CommunicationType = "Video" | "Circolare" | "Infografica" | "Avviso";
export type CommunicationStatus = "Da vedere" | "Vista" | "Presa visione";

export type SegnalatoreAppProps = {
  variant?: SegnalatoreAppVariant;
  role?: string;
  className?: string;
};

export type SegnalatoreReport = {
  id: string;
  code: string;
  title: string;
  status: ReportStatus;
  priority: ReportPriority;
  severity: ReportPriority;
  category: string;
  type: string;
  date: string;
  location: string;
  update: string;
  description: string;
  reporterDisplayName?: string;
  comments?: SegnalazioneCommentDto[];
  timeline?: SegnalazioneTimelineItemDto[];
  capabilities?: SegnalazioneCapabilitiesDto;
  acknowledgement?: {
    acknowledged: boolean;
    acknowledgedAt?: string;
  };
};

export type DraftReport = {
  contractId: string;
  siteId: string;
  plantId: string;
  areaId: string;
  title: string;
  description: string;
  priority: ReportPriority;
};

export type SafetyCommunication = {
  id: string;
  title: string;
  type: CommunicationType;
  status: CommunicationStatus;
  publishedAt: string;
  acknowledgementDue?: string;
  description: string;
};

export type DraftChangeHandler = (
  field: keyof DraftReport,
) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;

export type ReportActionHandler = (action: string, report: SegnalatoreReport) => void;
export type CommunicationActionHandler = (communication: SafetyCommunication) => void;
export type SubmitHandler = (event: FormEvent<HTMLFormElement>) => void;

export type SegnalazioniListItemDto = {
  id: string;
  code: string;
  title: string;
  priority: ReportPriority;
  severity: ReportPriority;
  status: ReportStatus;
  category: string;
  type: string;
  scope?: {
    contractId?: string;
    siteId?: string;
    plantId?: string;
    areaId?: string;
  };
  reporterDisplayName?: string;
  createdAt: string;
  updatedAt: string;
};

export type TimelineEventType =
  | "created"
  | "taken_in_charge"
  | "comment_added"
  | "integration_requested"
  | "integrated"
  | "status_changed"
  | "resolved"
  | "closed"
  | "acknowledged";

export type SegnalazioneCommentDto = {
  id: string;
  segnalazioneId: string;
  testo: string;
  autoreId?: string;
  autoreNome?: string;
  pubblico: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type SegnalazioneTimelineItemDto = {
  id: string;
  type: TimelineEventType;
  occurredAt: string;
  actorDisplayName?: string;
  actorRole?: string;
  previousStatus?: ReportStatus;
  newStatus?: ReportStatus;
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
  allowedStatusTransitions: ReportStatus[];
};

export type SegnalazioneDetailDto = SegnalazioniListItemDto & {
  description: string;
  comments?: SegnalazioneCommentDto[];
  attachments?: unknown[];
  workflow?: unknown[];
  timeline?: SegnalazioneTimelineItemDto[];
  capabilities?: SegnalazioneCapabilitiesDto;
  acknowledgement?: {
    acknowledged: boolean;
    acknowledgedAt?: string;
  };
  closedAt?: string;
};

export type CreateSegnalazionePayload = {
  title: string;
  description: string;
  priority: ReportPriority;
  severity: ReportPriority;
  category: "Sicurezza";
  type: "Pericolo";
  organizationalScope?: {
    contractId?: string;
    siteId?: string;
    plantId?: string;
    areaId?: string;
  };
};

export type OperationalScopeOption = {
  id: string;
  name: string;
  code?: string;
  siteId?: string;
  contractId?: string;
  plantId?: string;
};

export type AvailableOperationalScope = {
  contracts: OperationalScopeOption[];
  sites: OperationalScopeOption[];
  plants: OperationalScopeOption[];
  areas: OperationalScopeOption[];
};

export type OperationalScopeField = "contractId" | "siteId" | "plantId" | "areaId";

export type OperationalScopeLoadState = "loading" | "error" | "empty" | "ready";
