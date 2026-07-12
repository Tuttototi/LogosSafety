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
