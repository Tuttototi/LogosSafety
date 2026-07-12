import "dotenv/config";

type DatabaseEnvInput = Pick<
  NodeJS.ProcessEnv,
  "NODE_ENV" | "DEV_DATABASE_URL" | "DATABASE_URL"
>;

function required(name: string, source: NodeJS.ProcessEnv = process.env): string {
  const value = source[name];
  if (!value && source.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

function parseDatabaseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function normalizePort(url: URL): string {
  return url.port || "3306";
}

function pointsToSameLocalDatabase(first: URL, second: URL): boolean {
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  return (
    localHosts.has(first.hostname) &&
    localHosts.has(second.hostname) &&
    normalizePort(first) === normalizePort(second) &&
    first.pathname === second.pathname
  );
}

export function selectDatabaseUrlForEnvironment(
  source: DatabaseEnvInput = process.env as DatabaseEnvInput,
): string {
  const production = source.NODE_ENV === "production";
  const devDatabaseUrl = source.DEV_DATABASE_URL?.trim() ?? "";
  const databaseUrl = source.DATABASE_URL?.trim() ?? "";

  if (production) {
    return required("DATABASE_URL", source as NodeJS.ProcessEnv);
  }

  if (devDatabaseUrl && databaseUrl) {
    const parsedDevUrl = parseDatabaseUrl(devDatabaseUrl);
    const parsedDatabaseUrl = parseDatabaseUrl(databaseUrl);
    if (
      parsedDevUrl &&
      parsedDatabaseUrl &&
      !parsedDevUrl.password &&
      parsedDatabaseUrl.password &&
      pointsToSameLocalDatabase(parsedDevUrl, parsedDatabaseUrl)
    ) {
      return databaseUrl;
    }
  }

  return devDatabaseUrl || required("DATABASE_URL", source as NodeJS.ProcessEnv);
}

const isProduction = process.env.NODE_ENV === "production";
const devAuthEnabled =
  !isProduction && process.env.DEV_AUTH_ENABLED === "true";
const databaseUrl = selectDatabaseUrlForEnvironment();

export const env = {
  appId: required("APP_ID"),
  appSecret: required("APP_SECRET"),
  isProduction,
  databaseUrl,
  kimiAuthUrl: required("KIMI_AUTH_URL"),
  kimiOpenUrl: required("KIMI_OPEN_URL"),
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
  devAuthEnabled,
};
