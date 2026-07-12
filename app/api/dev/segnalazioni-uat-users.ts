import mysql from "mysql2/promise";

export type UatIdentityKey = "admin" | "segnalatore";

export type UatIdentity = {
  key: UatIdentityKey;
  unionId: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: "admin" | "segnalatore";
  fiscalCode: string;
};

export type UatSeedSummary = {
  roleEnumUpdated: boolean;
  company: { id: number; name: string };
  site: { id: number; name: string };
  contract: { id: number; code: string; name: string };
  plant?: { id: number; code: string | null; name: string };
  admin: UatIdentity & { userId: number; workerId: number };
  segnalatore: UatIdentity & { userId: number; workerId: number };
};

type DbConnection = Awaited<ReturnType<typeof mysql.createConnection>>;

type EnvLike = Pick<NodeJS.ProcessEnv, "NODE_ENV" | "DEV_DATABASE_URL" | "DATABASE_URL">;
type NodeEnvLike = Pick<NodeJS.ProcessEnv, "NODE_ENV">;

type CompanyRow = { id: number; name: string };
type SiteRow = { id: number; name: string; companyId?: number };
type ContractRow = { id: number; code: string; name: string; siteId?: number | null };
type PlantRow = { id: number; code: string | null; name: string };
type JobRoleRow = { id: number; name: string };
type UserRow = { id: number };
type WorkerRow = { id: number };
type RoleColumnRow = { Type: string };

const LOCAL_DATABASE_NAME = "logos_safety";

export const UAT_IDENTITIES: Record<UatIdentityKey, UatIdentity> = {
  admin: {
    key: "admin",
    unionId: "uat-segnalazioni-admin",
    email: "uat.admin.segnalazioni@logosafety.local",
    firstName: "Salvatore",
    lastName: "Candura",
    name: "Salvatore Candura",
    role: "admin",
    fiscalCode: "CNDSVT80A01H501U",
  },
  segnalatore: {
    key: "segnalatore",
    unionId: "uat-segnalazioni-segnalatore",
    email: "uat.segnalatore.segnalazioni@logosafety.local",
    firstName: "Mario",
    lastName: "Rossi",
    name: "Mario Rossi",
    role: "segnalatore",
    fiscalCode: "RSSMRA80A01H501U",
  },
};

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

function firstRow<T>(rows: unknown): T | undefined {
  return Array.isArray(rows) ? rows[0] as T | undefined : undefined;
}

function hasRole(columnType: string, role: string): boolean {
  return columnType.includes(`'${role}'`);
}

function roleEnumSql(): string {
  return REQUIRED_USER_ROLES.map((role) => `'${role}'`).join(",");
}

export function getUatDatabaseUrl(env: EnvLike = process.env as EnvLike): string {
  return (env.DEV_DATABASE_URL || env.DATABASE_URL || "").trim();
}

export function assertLocalUatDatabaseUrl(databaseUrl: string): URL {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL or DEV_DATABASE_URL is required for Segnalazioni UAT seed");
  }

  const parsed = new URL(databaseUrl);
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (!localHosts.has(parsed.hostname)) {
    throw new Error("Segnalazioni UAT seed requires a local database host");
  }
  if ((parsed.port || "3306") !== "3306") {
    throw new Error("Segnalazioni UAT seed requires local port 3306");
  }
  if (parsed.pathname.replace("/", "") !== LOCAL_DATABASE_NAME) {
    throw new Error("Segnalazioni UAT seed requires the logos_safety database");
  }

  return parsed;
}

export function assertUatSeedAllowed(
  env: NodeEnvLike = process.env as NodeEnvLike,
  databaseUrl = getUatDatabaseUrl(),
): URL {
  if (env.NODE_ENV === "production") {
    throw new Error("Segnalazioni UAT seed is not available in production");
  }

  return assertLocalUatDatabaseUrl(databaseUrl);
}

export function getUatIdentity(identity?: string | null): UatIdentity {
  if (!identity) return UAT_IDENTITIES.admin;
  if (identity === "admin" || identity === "segnalatore") return UAT_IDENTITIES[identity];
  throw new Error("Unsupported DEV identity");
}

export function assertDevIdentitySelectionAllowed(
  options: { devAuthEnabled: boolean; isProduction: boolean },
): void {
  if (!options.devAuthEnabled || options.isProduction) {
    throw new Error("DEV identity selection is not available");
  }
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

async function findPreferredCompany(connection: DbConnection): Promise<CompanyRow | undefined> {
  const [rows] = await connection.query(
    `SELECT id, name FROM companies
     WHERE active = 1 AND name IN ('Codex Runtime Company', 'UAT - Azienda Segnalazioni')
     ORDER BY CASE WHEN name = 'Codex Runtime Company' THEN 0 ELSE 1 END
     LIMIT 1`,
  );
  return firstRow<CompanyRow>(rows);
}

async function ensureCompany(connection: DbConnection): Promise<CompanyRow> {
  const existing = await findPreferredCompany(connection);
  if (existing) return existing;

  await connection.query(
    `INSERT INTO companies (name, vat_number, fiscal_code, city, province, active)
     VALUES ('UAT - Azienda Segnalazioni', '00000000010', '00000000010', 'Milano', 'MI', 1)`,
  );

  const [rows] = await connection.query(
    "SELECT id, name FROM companies WHERE name = 'UAT - Azienda Segnalazioni' LIMIT 1",
  );
  const company = firstRow<CompanyRow>(rows);
  if (!company) throw new Error("UAT company was not created");
  return company;
}

async function ensureSite(connection: DbConnection, company: CompanyRow): Promise<SiteRow> {
  const [existingRows] = await connection.query(
    `SELECT id, name, company_id AS companyId FROM sites
     WHERE active = 1 AND company_id = ?
     ORDER BY CASE WHEN name = 'Codex Runtime Site' THEN 0 WHEN name = 'UAT - Sede Segnalazioni' THEN 1 ELSE 2 END, id
     LIMIT 1`,
    [company.id],
  );
  const existing = firstRow<SiteRow>(existingRows);
  if (existing) return existing;

  await connection.query(
    `INSERT INTO sites (company_id, name, code, city, province, active)
     VALUES (?, 'UAT - Sede Segnalazioni', 'UAT-SEGN-SEDE', 'Milano', 'MI', 1)`,
    [company.id],
  );
  const [rows] = await connection.query(
    "SELECT id, name, company_id AS companyId FROM sites WHERE company_id = ? AND name = 'UAT - Sede Segnalazioni' LIMIT 1",
    [company.id],
  );
  const site = firstRow<SiteRow>(rows);
  if (!site) throw new Error("UAT site was not created");
  return site;
}

async function ensureContract(connection: DbConnection, company: CompanyRow, site: SiteRow): Promise<ContractRow> {
  const [existingRows] = await connection.query(
    `SELECT id, code, name, site_id AS siteId FROM contracts
     WHERE active = 1 AND status = 'attivo' AND site_id = ?
     ORDER BY CASE WHEN code = 'CODEX-RUNTIME-CONTRACT' THEN 0 WHEN code = 'UAT-SEGN-CONTRACT' THEN 1 ELSE 2 END, id
     LIMIT 1`,
    [site.id],
  );
  const existing = firstRow<ContractRow>(existingRows);
  if (existing) return existing;

  await connection.query(
    `INSERT INTO contracts (code, name, client_company_id, site_id, status, active)
     VALUES ('UAT-SEGN-CONTRACT', 'UAT - Appalto Segnalazioni', ?, ?, 'attivo', 1)`,
    [company.id, site.id],
  );
  const [rows] = await connection.query(
    "SELECT id, code, name, site_id AS siteId FROM contracts WHERE code = 'UAT-SEGN-CONTRACT' LIMIT 1",
  );
  const contract = firstRow<ContractRow>(rows);
  if (!contract) throw new Error("UAT contract was not created");
  return contract;
}

async function ensurePlant(connection: DbConnection, company: CompanyRow, site: SiteRow): Promise<PlantRow> {
  const [existingRows] = await connection.query(
    `SELECT id, code, name FROM microclimate_sites
     WHERE active = 1 AND company_id = ? AND site_id = ?
     ORDER BY CASE WHEN code = 'UAT-SEGN-PLANT' THEN 0 ELSE 1 END, id
     LIMIT 1`,
    [company.id, site.id],
  );
  const existing = firstRow<PlantRow>(existingRows);
  if (existing) return existing;

  await connection.query(
    `INSERT INTO microclimate_sites (company_id, site_id, name, code, description, active)
     VALUES (?, ?, 'UAT - Impianto Segnalazioni', 'UAT-SEGN-PLANT', 'Fixture UAT locale per scope Segnalazioni', 1)`,
    [company.id, site.id],
  );
  const [rows] = await connection.query(
    "SELECT id, code, name FROM microclimate_sites WHERE code = 'UAT-SEGN-PLANT' LIMIT 1",
  );
  const plant = firstRow<PlantRow>(rows);
  if (!plant) throw new Error("UAT plant was not created");
  return plant;
}

async function ensureJobRole(connection: DbConnection): Promise<JobRoleRow> {
  const [existingRows] = await connection.query(
    `SELECT id, name FROM job_roles
     WHERE active = 1 AND name IN ('Codex Runtime Job', 'UAT - Mansione Segnalazioni')
     ORDER BY CASE WHEN name = 'Codex Runtime Job' THEN 0 ELSE 1 END
     LIMIT 1`,
  );
  const existing = firstRow<JobRoleRow>(existingRows);
  if (existing) return existing;

  await connection.query(
    `INSERT INTO job_roles (name, code, description, risk_level, requires_medical_visit, active)
     VALUES ('UAT - Mansione Segnalazioni', 'UAT-SEGN-JOB', 'Fixture UAT locale per utenti Segnalazioni', 'basso', 0, 1)`,
  );
  const [rows] = await connection.query(
    "SELECT id, name FROM job_roles WHERE name = 'UAT - Mansione Segnalazioni' LIMIT 1",
  );
  const jobRole = firstRow<JobRoleRow>(rows);
  if (!jobRole) throw new Error("UAT job role was not created");
  return jobRole;
}

async function upsertUser(connection: DbConnection, identity: UatIdentity): Promise<number> {
  await connection.query(
    `INSERT INTO users (unionId, name, email, avatar, role, active, lastSignInAt)
     VALUES (?, ?, ?, NULL, ?, 1, NOW())
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       email = VALUES(email),
       role = VALUES(role),
       active = 1,
       lastSignInAt = NOW()`,
    [identity.unionId, identity.name, identity.email, identity.role],
  );
  const [rows] = await connection.query(
    "SELECT id FROM users WHERE unionId = ? LIMIT 1",
    [identity.unionId],
  );
  const user = firstRow<UserRow>(rows);
  if (!user) throw new Error(`UAT user was not created: ${identity.unionId}`);
  return user.id;
}

async function upsertWorker(
  connection: DbConnection,
  identity: UatIdentity,
  company: CompanyRow,
  site: SiteRow,
  contract: ContractRow,
  jobRole: JobRoleRow,
): Promise<number> {
  const [existingRows] = await connection.query(
    "SELECT id FROM workers WHERE email = ? AND deleted_at IS NULL ORDER BY id LIMIT 1",
    [identity.email],
  );
  const existing = firstRow<WorkerRow>(existingRows);
  if (existing) {
    await connection.query(
      `UPDATE workers
       SET first_name = ?, last_name = ?, fiscal_code = ?, company_id = ?, site_id = ?, contract_id = ?,
           job_role_id = ?, status = 'attivo', active = 1, updated_at = NOW()
       WHERE id = ?`,
      [
        identity.firstName,
        identity.lastName,
        identity.fiscalCode,
        company.id,
        site.id,
        contract.id,
        jobRole.id,
        existing.id,
      ],
    );
    return existing.id;
  }

  await connection.query(
    `INSERT INTO workers
      (first_name, last_name, fiscal_code, company_id, site_id, contract_id, job_role_id, hire_date,
       status, requires_medical_visit, email, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, '2026-07-12', 'attivo', 0, ?, 1)`,
    [
      identity.firstName,
      identity.lastName,
      identity.fiscalCode,
      company.id,
      site.id,
      contract.id,
      jobRole.id,
      identity.email,
    ],
  );
  const [rows] = await connection.query(
    "SELECT id FROM workers WHERE email = ? AND deleted_at IS NULL ORDER BY id LIMIT 1",
    [identity.email],
  );
  const worker = firstRow<WorkerRow>(rows);
  if (!worker) throw new Error(`UAT worker was not created: ${identity.email}`);
  return worker.id;
}

async function ensureScope(
  connection: DbConnection,
  userId: number,
  company: CompanyRow,
  siteId: number | null,
  contractId: number | null,
): Promise<void> {
  const [existingRows] = await connection.query(
    `SELECT id FROM user_organization_scopes
     WHERE user_id = ? AND company_id = ? AND site_id <=> ? AND contract_id <=> ?
     LIMIT 1`,
    [userId, company.id, siteId, contractId],
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
     VALUES (?, ?, ?, ?, 1)`,
    [userId, company.id, siteId, contractId],
  );
}

async function seedIdentity(
  connection: DbConnection,
  identity: UatIdentity,
  company: CompanyRow,
  site: SiteRow,
  contract: ContractRow,
  jobRole: JobRoleRow,
): Promise<UatIdentity & { userId: number; workerId: number }> {
  const userId = await upsertUser(connection, identity);
  const workerId = await upsertWorker(connection, identity, company, site, contract, jobRole);

  if (identity.role === "admin") {
    await ensureScope(connection, userId, company, null, null);
  } else {
    await ensureScope(connection, userId, company, site.id, contract.id);
  }

  return { ...identity, userId, workerId };
}

export async function seedSegnalazioniUatUsers(options: {
  databaseUrl?: string;
  env?: NodeEnvLike;
} = {}): Promise<UatSeedSummary> {
  const databaseUrl = options.databaseUrl ?? getUatDatabaseUrl();
  assertUatSeedAllowed(options.env ?? process.env as NodeEnvLike, databaseUrl);

  const connection = await mysql.createConnection(databaseUrl);
  try {
    const roleEnumUpdated = await ensureRoleEnum(connection);
    const company = await ensureCompany(connection);
    const site = await ensureSite(connection, company);
    const contract = await ensureContract(connection, company, site);
    const plant = await ensurePlant(connection, company, site);
    const jobRole = await ensureJobRole(connection);
    const admin = await seedIdentity(connection, UAT_IDENTITIES.admin, company, site, contract, jobRole);
    const segnalatore = await seedIdentity(connection, UAT_IDENTITIES.segnalatore, company, site, contract, jobRole);

    return {
      roleEnumUpdated,
      company,
      site,
      contract,
      plant,
      admin,
      segnalatore,
    };
  } finally {
    await connection.end();
  }
}

export function summarizeUatSeed(summary: UatSeedSummary): Record<string, unknown> {
  return {
    roleEnumUpdated: summary.roleEnumUpdated,
    company: summary.company,
    site: summary.site,
    contract: summary.contract,
    plant: summary.plant,
    admin: {
      name: summary.admin.name,
      unionId: summary.admin.unionId,
      email: summary.admin.email,
      role: summary.admin.role,
      userId: summary.admin.userId,
      workerId: summary.admin.workerId,
    },
    segnalatore: {
      name: summary.segnalatore.name,
      unionId: summary.segnalatore.unionId,
      email: summary.segnalatore.email,
      role: summary.segnalatore.role,
      userId: summary.segnalatore.userId,
      workerId: summary.segnalatore.workerId,
    },
  };
}
