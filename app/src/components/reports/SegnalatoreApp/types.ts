import type { ChangeEvent, FormEvent } from "react";

export type SegnalatoreAppVariant = "page" | "mobile";
export type SegnalatoreRoleGroup = "operational" | "manager" | "safety";
export type ReportPriority = "Bassa" | "Media" | "Alta";
export type ReportStatus = "Nuova" | "In carico" | "In attesa integrazione" | "Chiusa";
export type AppTab = "new" | "reports" | "communications";
export type CommunicationType = "Video" | "Circolare" | "Infografica" | "Avviso";
export type CommunicationStatus = "Da vedere" | "Vista" | "Presa visione";

export type SegnalatoreAppProps = {
  variant?: SegnalatoreAppVariant;
  role?: string;
  className?: string;
};

export type SegnalatoreReport = {
  code: string;
  title: string;
  status: ReportStatus;
  priority: ReportPriority;
  date: string;
  location: string;
  update: string;
  description: string;
  visibleTo: SegnalatoreRoleGroup[];
};

export type DraftReport = {
  location: string;
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
