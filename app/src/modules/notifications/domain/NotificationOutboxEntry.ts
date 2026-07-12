export const NotificationOutboxStatus = {
  Pending: "pending",
  Processing: "processing",
  Processed: "processed",
  Failed: "failed",
} as const;

export type NotificationOutboxStatus =
  (typeof NotificationOutboxStatus)[keyof typeof NotificationOutboxStatus];

export interface NotificationOutboxEntry {
  id: string;
  tenantId: string;
  companyId?: string;
  eventType: string;
  module: string;
  entityType: string;
  entityId: string;
  actorUserId?: string;
  occurredAt: string;
  payload: Record<string, unknown>;
  status: NotificationOutboxStatus;
  attempts: number;
  availableAt: string;
  processedAt?: string;
  lastErrorCode?: string;
  correlationId: string;
  createdAt: string;
}

export type NewNotificationOutboxEntry = Omit<NotificationOutboxEntry, "createdAt">;

export interface FindPendingNotificationsInput {
  now: string;
  limit: number;
}
