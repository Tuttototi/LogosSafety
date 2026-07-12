import mysql from "mysql2/promise";
import { selectDatabaseUrlForEnvironment } from "../lib/env";

type DbConnection = Awaited<ReturnType<typeof mysql.createConnection>>;
type EnvLike = Pick<NodeJS.ProcessEnv, "NODE_ENV" | "DEV_DATABASE_URL" | "DATABASE_URL">;
type NodeEnvLike = Pick<NodeJS.ProcessEnv, "NODE_ENV">;

type CompanyRow = { id: number; name: string };
type JobRoleRow = { id: number; name: string };
type UserRow = { id: number; unionId: string; role: string };
type WorkerRow = { id: number };
type RoleColumnRow = { Type: string };

const LOCAL_DATABASE_NAME = "logos_safety";

export const REAL_ADMIN_IDENTITY = {
  unionId: "local:safety.genoma@log6s.it",
  email: "safety.genoma@log6s.it",
  firstName: "Salvatore",
  lastName: "Candura",
  name: "Salvatore Candura",
  birthDate: "1975-09-08",
  birthPlace: "Milano",
  fiscalCode: "CNDSVT75P08F205J",
  phone: "+39 343 851 02",
  role: "admin",
} as const;

const REQUIRED_USER_ROLES = [
  "admin",
  "rspp",
  "aspp",
  "responsabile_sicurezza",
  "operatore_sicurezza",
  "capo_area",
  "capo_impianto",
  "referente_commessa",
  "segnalatore",
  "dipendente",
  "operatore",
  "medico_competente",
  "sola_lettura",
  "auditor",
] as const;

export type RealAdminBootstrapSummary = {
  roleEnumUpdated: boolean;
  company: { id: number; name: string };
  admin: {
    unionId: string;
    email: string;
    name: string;
    role: "admin";
    userId: number;
    workerId: number;
  };
};

function firstRow<T>(rows: unknown): T | undefined {
  return Array.isArray(rows) ? rows[0] as T | undefined : undefined;
}

function roleEnumSql(): string {
  return REQUIRED_USER_ROLES.map((role) => `'${role}'`).join(",");
}

function hasRole(columnType: string, role: string): boolean {
  return columnType.includes(`'${role}'`);
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeFiscalCode(value: string): string {
  return value.trim().toUpperCase();
}

export function maskFiscalCode(value: string | null | undefined): string {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return "";
  if (normalized.length <= 6) return `${normalized.slice(0, 2)}****`;
  return `${normalized.slice(0, 3)}**********${normalized.slice(-3)}`;
}

export function getRealAdminDatabaseUrl(env: EnvLike = process.env as EnvLike): string {
  return selectDatabaseUrlForEnvironment(env).trim();
}

export function assertLocalAdminBootstrapDatabaseUrl(databaseUrl: string): URL {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL or DEV_DATABASE_URL is required for local Admin bootstrap");
  }

  const parsed = new URL(databaseUrl);
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (!localHosts.has(parsed.hostname)) {
    throw new Error("Local Admin bootstrap requires a local database host");
  }
  if ((parsed.port || "3306") !== "3306") {
    throw new Error("Local Admin bootstrap requires local port 3306");
  }
  if (parsed.pathname.replace("/", "") !== LOCAL_DATABASE_NAME) {
    throw new Error("Local Admin bootstrap requires the logos_safety database");
  }

  return parsed;
}

export function assertRealAdminBootstrapAllowed(
  env: NodeEnvLike = process.env as NodeEnvLike,
  databaseUrl = getRealAdminDatabaseUrl(),
): URL {
  if (env.NODE_ENV === "production") {
    throw new Error("Local Admin bootstrap is not available in production");
  }

  return assertLocalAdminBootstrapDatabaseUrl(databaseUrl);
}

async function ensureRoleEnum(connection: DbConnection): Promise<boolean> {
  const [rows] = await connection.query("SHOW COLUMNS FROM users LIKE 'role'");
  const columnType = firstRow<RoleColumnRow>(rows)?.Type ?? "";
  const missingRole = REQUIRED_USER_ROLES.some((role) => !hasRole(columnType, role));
  if (!missingRole) return false;

  await connection.query(
    `ALTER TABLE users MODIFY role ENUM(${roleEnumSql()}) NOT NULL DEFAULT 'sola_lettura'`,
  );
  return true;
}

async function ensureCompany(connection: DbConnection): Promise<CompanyRow> {
  const [existingRows] = await connection.query(
    `SELECT id, name FROM companies
     WHERE active = 1 AND name IN ('Codex Runtime Company', 'Logos Safety - Tenant Locale', 'UAT - Azienda Segnalazioni')
     ORDER BY CASE
       WHEN name = 'Codex Runtime Company' THEN 0
       WHEN name = 'Logos Safety - Tenant Locale' THEN 1
       ELSE 2
     END, id
     LIMIT 1`,
  );
  const existing = firstRow<CompanyRow>(existingRows);
  if (existing) return existing;

  await connection.query(
    `INSERT INTO companies (name, vat_number, fiscal_code, city, province, active)
     VALUES ('Logos Safety - Tenant Locale', '00000000011', '00000000011', 'Milano', 'MI', 1)`,
  );

  const [rows] = await connection.query(
    "SELECT id, name FROM companies WHERE name = 'Logos Safety - Tenant Locale' LIMIT 1",
  );
  const company = firstRow<CompanyRow>(rows);
  if (!company) throw new Error("Local company was not created");
  return company;
}

async function ensureJobRole(connection: DbConnection): Promise<JobRoleRow> {
  const [existingRows] = await connection.query(
    `SELECT id, name FROM job_roles
     WHERE active = 1 AND name IN ('Codex Runtime Job', 'Amministratore LogosSafety', 'UAT - Mansione Segnalazioni')
     ORDER BY CASE
       WHEN name = 'Codex Runtime Job' THEN 0
       WHEN name = 'Amministratore LogosSafety' THEN 1
       ELSE 2
     END, id
     LIMIT 1`,
  );
  const existing = firstRow<JobRoleRow>(existingRows);
  if (existing) return existing;

  await connection.query(
    `INSERT INTO job_roles (name, code, description, risk_level, requires_medical_visit, active)
     VALUES ('Amministratore LogosSafety', 'LOGOS-ADMIN', 'Mansione tecnica locale per bootstrap Admin', 'basso', 0, 1)`,
  );

  const [rows] = await connection.query(
    "SELECT id, name FROM job_roles WHERE code = 'LOGOS-ADMIN' LIMIT 1",
  );
  const jobRole = firstRow<JobRoleRow>(rows);
  if (!jobRole) throw new Error("Local Admin job role was not created");
  return jobRole;
}

async function upsertAdminUser(connection: DbConnection): Promise<UserRow> {
  const email = normalizeEmail(REAL_ADMIN_IDENTITY.email);
  const [existingRows] = await connection.query(
    "SELECT id, unionId, role FROM users WHERE unionId = ? OR email = ? ORDER BY CASE WHEN unionId = ? THEN 0 ELSE 1 END, id LIMIT 1",
    [REAL_ADMIN_IDENTITY.unionId, email, REAL_ADMIN_IDENTITY.unionId],
  );
  const existing = firstRow<UserRow>(existingRows);

  if (existing) {
    await connection.query(
      `UPDATE users
       SET unionId = ?, name = ?, email = ?, role = 'admin', active = 1, updatedAt = NOW()
       WHERE id = ?`,
      [REAL_ADMIN_IDENTITY.unionId, REAL_ADMIN_IDENTITY.name, email, existing.id],
    );
    return { ...existing, unionId: REAL_ADMIN_IDENTITY.unionId, role: "admin" };
  }

  await connection.query(
    `INSERT INTO users (unionId, name, email, avatar, role, active, lastSignInAt)
     VALUES (?, ?, ?, NULL, 'admin', 1, NOW())`,
    [REAL_ADMIN_IDENTITY.unionId, REAL_ADMIN_IDENTITY.name, email],
  );

  const [rows] = await connection.query(
    "SELECT id, unionId, role FROM users WHERE unionId = ? LIMIT 1",
    [REAL_ADMIN_IDENTITY.unionId],
  );
  const user = firstRow<UserRow>(rows);
  if (!user) throw new Error("Local Admin account was not created");
  return user;
}

async function upsertAdminWorker(
  connection: DbConnection,
  company: CompanyRow,
  jobRole: JobRoleRow,
): Promise<number> {
  const email = normalizeEmail(REAL_ADMIN_IDENTITY.email);
  const fiscalCode = normalizeFiscalCode(REAL_ADMIN_IDENTITY.fiscalCode);
  const [existingRows] = await connection.query(
    `SELECT id FROM workers
     WHERE deleted_at IS NULL AND (email = ? OR fiscal_code = ?)
     ORDER BY CASE WHEN email = ? THEN 0 ELSE 1 END, id
     LIMIT 2`,
    [email, fiscalCode, email],
  );
  const existingWorkers = Array.isArray(existingRows) ? existingRows as WorkerRow[] : [];
  if (existingWorkers.length > 1) {
    throw new Error("Local Admin person is duplicated in workers");
  }

  const existing = existingWorkers[0];
  if (existing) {
    await connection.query(
      `UPDATE workers
       SET first_name = ?, last_name = ?, fiscal_code = ?, birth_date = ?, birth_place = ?,
           company_id = ?, job_role_id = ?, status = 'attivo', requires_medical_visit = 0,
           email = ?, phone = ?, active = 1, updated_at = NOW()
       WHERE id = ?`,
      [
        REAL_ADMIN_IDENTITY.firstName,
        REAL_ADMIN_IDENTITY.lastName,
        fiscalCode,
        REAL_ADMIN_IDENTITY.birthDate,
        REAL_ADMIN_IDENTITY.birthPlace,
        company.id,
        jobRole.id,
        email,
        REAL_ADMIN_IDENTITY.phone,
        existing.id,
      ],
    );
    return existing.id;
  }

  await connection.query(
    `INSERT INTO workers
      (first_name, last_name, fiscal_code, birth_date, birth_place, company_id, job_role_id,
       hire_date, status, requires_medical_visit, email, phone, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), 'attivo', 0, ?, ?, 1)`,
    [
      REAL_ADMIN_IDENTITY.firstName,
      REAL_ADMIN_IDENTITY.lastName,
      fiscalCode,
      REAL_ADMIN_IDENTITY.birthDate,
      REAL_ADMIN_IDENTITY.birthPlace,
      company.id,
      jobRole.id,
      email,
      REAL_ADMIN_IDENTITY.phone,
    ],
  );

  const [rows] = await connection.query(
    "SELECT id FROM workers WHERE email = ? AND deleted_at IS NULL ORDER BY id LIMIT 1",
    [email],
  );
  const worker = firstRow<WorkerRow>(rows);
  if (!worker) throw new Error("Local Admin person was not created");
  return worker.id;
}

async function ensureCompanyScope(
  connection: DbConnection,
  userId: number,
  companyId: number,
): Promise<void> {
  await connection.query(
    `UPDATE user_organization_scopes
     SET active = 0, updated_at = NOW()
     WHERE user_id = ? AND NOT (company_id = ? AND site_id IS NULL AND contract_id IS NULL)`,
    [userId, companyId],
  );

  const [existingRows] = await connection.query(
    `SELECT id FROM user_organization_scopes
     WHERE user_id = ? AND company_id = ? AND site_id IS NULL AND contract_id IS NULL
     LIMIT 1`,
    [userId, companyId],
  );
  const existing = firstRow<{ id: number }>(existingRows);
  if (existing) {
    await connection.query(
      "UPDATE user_organization_scopes SET active = 1, updated_at = NOW() WHERE id = ?",
      [existing.id],
    );
    return;
  }

  await connection.query(
    `INSERT INTO user_organization_scopes (user_id, company_id, site_id, contract_id, active)
     VALUES (?, ?, NULL, NULL, 1)`,
    [userId, companyId],
  );
}

export async function bootstrapRealAdmin(
  options: { databaseUrl?: string; env?: NodeEnvLike } = {},
): Promise<RealAdminBootstrapSummary> {
  const databaseUrl = options.databaseUrl ?? getRealAdminDatabaseUrl();
  assertRealAdminBootstrapAllowed(options.env ?? process.env as NodeEnvLike, databaseUrl);

  const connection = await mysql.createConnection(databaseUrl);
  try {
    const roleEnumUpdated = await ensureRoleEnum(connection);
    const company = await ensureCompany(connection);
    const jobRole = await ensureJobRole(connection);
    const user = await upsertAdminUser(connection);
    const workerId = await upsertAdminWorker(connection, company, jobRole);
    await ensureCompanyScope(connection, user.id, company.id);

    return {
      roleEnumUpdated,
      company,
      admin: {
        unionId: REAL_ADMIN_IDENTITY.unionId,
        email: normalizeEmail(REAL_ADMIN_IDENTITY.email),
        name: REAL_ADMIN_IDENTITY.name,
        role: "admin",
        userId: user.id,
        workerId,
      },
    };
  } finally {
    await connection.end();
  }
}

export function summarizeRealAdminBootstrap(
  summary: RealAdminBootstrapSummary,
): Record<string, unknown> {
  return {
    roleEnumUpdated: summary.roleEnumUpdated,
    company: summary.company,
    admin: {
      unionId: summary.admin.unionId,
      email: summary.admin.email,
      name: summary.admin.name,
      role: summary.admin.role,
      userId: summary.admin.userId,
      workerId: summary.admin.workerId,
      fiscalCode: maskFiscalCode(REAL_ADMIN_IDENTITY.fiscalCode),
    },
  };
}
