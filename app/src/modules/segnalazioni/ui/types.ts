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
};

export type DraftReport = {
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

export type SegnalazioneDetailDto = SegnalazioniListItemDto & {
  description: string;
  comments?: unknown[];
  attachments?: unknown[];
  workflow?: unknown[];
  closedAt?: string;
};

export type CreateSegnalazionePayload = {
  title: string;
  description: string;
  priority: ReportPriority;
  severity: ReportPriority;
  category: "Sicurezza";
  type: "Pericolo";
};
