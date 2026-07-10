import type { ApplicationEvent } from "../types";

export interface NotificationPort {
  notify(event: ApplicationEvent): Promise<void>;
}

