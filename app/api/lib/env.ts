import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

const isProduction = process.env.NODE_ENV === "production";
const devAuthEnabled =
  !isProduction && process.env.DEV_AUTH_ENABLED === "true";
const databaseUrl =
  (!isProduction && process.env.DEV_DATABASE_URL?.trim()) ||
  required("DATABASE_URL");

function requiredForDevAuth(name: string): string {
  const value = process.env[name]?.trim();
  if (devAuthEnabled && !value) {
    throw new Error(
      `Missing required environment variable for dev auth: ${name}`
    );
  }
  return value ?? "";
}

export const env = {
  appId: required("APP_ID"),
  appSecret: required("APP_SECRET"),
  isProduction,
  databaseUrl,
  kimiAuthUrl: required("KIMI_AUTH_URL"),
  kimiOpenUrl: required("KIMI_OPEN_URL"),
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
  devAuthEnabled,
  devAdminUnionId: requiredForDevAuth("DEV_ADMIN_UNION_ID"),
  devAdminEmail: requiredForDevAuth("DEV_ADMIN_EMAIL"),
  devAdminName: requiredForDevAuth("DEV_ADMIN_NAME"),
};
