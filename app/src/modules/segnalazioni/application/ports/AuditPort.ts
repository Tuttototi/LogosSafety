import type { ApplicationEvent } from "../types";

export interface AuditPort {
  record(event: ApplicationEvent): Promise<void>;
}

