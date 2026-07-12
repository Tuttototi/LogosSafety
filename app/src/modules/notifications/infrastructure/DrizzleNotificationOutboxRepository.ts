import { and, asc, eq, lte, sql } from "drizzle-orm";
import { notificationOutbox } from "@db/schema";
import type { NotificationOutboxRepository } from "../application";
import {
  NotificationOutboxStatus,
  type FindPendingNotificationsInput,
  type NewNotificationOutboxEntry,
  type NotificationOutboxEntry,
} from "../domain";
import {
  getActiveDrizzleDatabase,
  type LogosDrizzleDatabase,
} from "@/modules/shared/infrastructure/drizzle/TransactionContext";
import { NotificationOutboxPersistenceError } from "./errors";
import {
  mapNotificationOutboxEntryToInsert,
  mapNotificationOutboxRow,
} from "./mappers";

export class DrizzleNotificationOutboxRepository implements NotificationOutboxRepository {
  private readonly db: LogosDrizzleDatabase;

  constructor(db: LogosDrizzleDatabase) {
    this.db = db;
  }

  private currentDb(): LogosDrizzleDatabase {
    return getActiveDrizzleDatabase(this.db);
  }

  async enqueue(entry: NewNotificationOutboxEntry): Promise<NotificationOutboxEntry> {
    try {
      await this.currentDb().insert(notificationOutbox).values(mapNotificationOutboxEntryToInsert(entry));
      const rows = await this.currentDb()
        .select()
        .from(notificationOutbox)
        .where(and(eq(notificationOutbox.tenantId, entry.tenantId), eq(notificationOutbox.id, entry.id)))
        .limit(1);
      const row = rows.at(0);
      if (!row) throw new Error("Inserted notification outbox entry was not found");
      return mapNotificationOutboxRow(row);
    } catch (error) {
      if (error instanceof NotificationOutboxPersistenceError) throw error;
      throw new NotificationOutboxPersistenceError("Cannot enqueue notification outbox entry", {
        cause: error,
      });
    }
  }

  async findPending(input: FindPendingNotificationsInput): Promise<NotificationOutboxEntry[]> {
    const rows = await this.currentDb()
      .select()
      .from(notificationOutbox)
      .where(and(
        eq(notificationOutbox.status, NotificationOutboxStatus.Pending),
        lte(notificationOutbox.availableAt, new Date(input.now)),
      ))
      .orderBy(asc(notificationOutbox.availableAt), asc(notificationOutbox.createdAt), asc(notificationOutbox.id))
      .limit(input.limit);

    return rows.map(mapNotificationOutboxRow);
  }

  async markProcessing(id: string): Promise<void> {
    await this.currentDb()
      .update(notificationOutbox)
      .set({
        status: NotificationOutboxStatus.Processing,
        attempts: sql`${notificationOutbox.attempts} + 1`,
        lastErrorCode: null,
      })
      .where(eq(notificationOutbox.id, id));
  }

  async markProcessed(id: string, processedAt: string): Promise<void> {
    await this.currentDb()
      .update(notificationOutbox)
      .set({
        status: NotificationOutboxStatus.Processed,
        processedAt: new Date(processedAt),
        lastErrorCode: null,
      })
      .where(eq(notificationOutbox.id, id));
  }

  async markFailed(id: string, errorCode: string): Promise<void> {
    await this.currentDb()
      .update(notificationOutbox)
      .set({
        status: NotificationOutboxStatus.Failed,
        lastErrorCode: errorCode.slice(0, 120),
      })
      .where(eq(notificationOutbox.id, id));
  }
}
