import { AsyncLocalStorage } from "node:async_hooks";
import type { MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "@db/schema";

export type LogosDrizzleDatabase = MySql2Database<typeof schema>;

export interface DrizzleTransactionContextValue {
  db: LogosDrizzleDatabase;
  correlationId: string;
}

const transactionContext = new AsyncLocalStorage<DrizzleTransactionContextValue>();

export function getActiveDrizzleDatabase(defaultDb: LogosDrizzleDatabase): LogosDrizzleDatabase {
  return transactionContext.getStore()?.db ?? defaultDb;
}

export function hasActiveDrizzleTransaction(): boolean {
  return Boolean(transactionContext.getStore());
}

export function getActiveCorrelationId(): string | undefined {
  return transactionContext.getStore()?.correlationId;
}

export class DrizzleTransactionCoordinator {
  private readonly db: LogosDrizzleDatabase;

  constructor(db: LogosDrizzleDatabase) {
    this.db = db;
  }

  async run<T>(correlationId: string, operation: () => Promise<T>): Promise<T> {
    if (hasActiveDrizzleTransaction()) {
      return operation();
    }

    return this.db.transaction(async (tx) =>
      transactionContext.run(
        {
          db: tx as unknown as LogosDrizzleDatabase,
          correlationId,
        },
        operation,
      ),
    );
  }
}
