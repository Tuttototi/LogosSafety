import type {
  FindPendingNotificationsInput,
  NewNotificationOutboxEntry,
  NotificationOutboxEntry,
} from "../domain";

export interface NotificationOutboxRepository {
  enqueue(entry: NewNotificationOutboxEntry): Promise<NotificationOutboxEntry>;
  findPending(input: FindPendingNotificationsInput): Promise<NotificationOutboxEntry[]>;
  markProcessing(id: string): Promise<void>;
  markProcessed(id: string, processedAt: string): Promise<void>;
  markFailed(id: string, errorCode: string): Promise<void>;
}
