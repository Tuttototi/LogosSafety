import { eq, inArray } from "drizzle-orm";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql, { type Pool } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  companies,
  contracts,
  jobRoles,
  sites,
  userOrganizationScopes,
  users,
  workers,
} from "@db/schema";
import * as schema from "@db/schema";
import {
  CoreIdentityService,
  DrizzleCoreIdentityRepository,
  type CoreIdentityDatabase,
} from "./core/identity";
import { Role } from "@/modules/core/domain";

const integrationEnabled = process.env.CORE_IDENTITY_MYSQL_INTEGRATION === "1";
const describeIntegration = integrationEnabled ? describe : describe.skip;

const TEST_UNION_ID = "it-core-identity-user";
const TEST_EMAIL = "it-core-identity@example.test";
const TEST_COMPANY_NAME = "IT Core Identity Company";
const TEST_SITE_NAME = "IT Core Identity Site";
const TEST_CONTRACT_CODE = "IT-CORE-IDENTITY-CONTRACT";
const TEST_JOB_ROLE_CODE = "IT-CORE-IDENTITY-JOB";

let pool: Pool;
let db: MySql2Database<typeof schema>;

function requireLocalDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for Core Identity integration tests");

  const parsed = new URL(databaseUrl);
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (!localHosts.has(parsed.hostname)) {
    throw new Error("Core Identity integration tests require a local database host");
  }

  if ((parsed.port || "3306") !== "3306") {
    throw new Error("Core Identity integration tests require local port 3306");
  }

  if (parsed.pathname.replace("/", "") !== "logos_safety") {
    throw new Error("Core Identity integration tests require the logos_safety database");
  }

  return databaseUrl;
}

async function cleanupTestData(): Promise<void> {
  const testUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.unionId, TEST_UNION_ID));
  const userIds = testUsers.map((user) => user.id);
  if (userIds.length > 0) {
    await db.delete(userOrganizationScopes).where(inArray(userOrganizationScopes.userId, userIds));
  }

  const testWorkers = await db
    .select({ id: workers.id })
    .from(workers)
    .where(eq(workers.email, TEST_EMAIL));
  const workerIds = testWorkers.map((worker) => worker.id);
  if (workerIds.length > 0) {
    await db.delete(workers).where(inArray(workers.id, workerIds));
  }

  await db.delete(contracts).where(eq(contracts.code, TEST_CONTRACT_CODE));
  await db.delete(sites).where(eq(sites.name, TEST_SITE_NAME));
  await db.delete(jobRoles).where(eq(jobRoles.code, TEST_JOB_ROLE_CODE));
  await db.delete(companies).where(eq(companies.name, TEST_COMPANY_NAME));
  if (userIds.length > 0) {
    await db.delete(users).where(inArray(users.id, userIds));
  }
}

describeIntegration("DrizzleCoreIdentityRepository MySQL integration", () => {
  beforeAll(async () => {
    pool = mysql.createPool(requireLocalDatabaseUrl());
    db = drizzle(pool, { schema, mode: "default" });
    await cleanupTestData();
  });

  afterAll(async () => {
    if (db) await cleanupTestData();
    if (pool) await pool.end();
  });

  it("loads account, worker/person, company and explicit organizational scope", async () => {
    await db.insert(users).values({
      unionId: TEST_UNION_ID,
      name: "Integration Identity",
      email: TEST_EMAIL,
      role: "operatore_sicurezza",
      active: true,
    });
    const [user] = await db.select().from(users).where(eq(users.unionId, TEST_UNION_ID)).limit(1);
    if (!user) throw new Error("Test user was not created");

    await db.insert(companies).values({
      name: TEST_COMPANY_NAME,
      vatNumber: "12345678901",
      fiscalCode: "12345678901",
      active: true,
    });
    const [company] = await db.select().from(companies).where(eq(companies.name, TEST_COMPANY_NAME)).limit(1);
    if (!company) throw new Error("Test company was not created");

    await db.insert(jobRoles).values({
      name: "IT Core Identity Job",
      code: TEST_JOB_ROLE_CODE,
      riskLevel: "basso",
      active: true,
    });
    const [jobRole] = await db.select().from(jobRoles).where(eq(jobRoles.code, TEST_JOB_ROLE_CODE)).limit(1);
    if (!jobRole) throw new Error("Test job role was not created");

    await db.insert(sites).values({
      companyId: company.id,
      name: TEST_SITE_NAME,
      code: "IT-ID-SITE",
      active: true,
    });
    const [site] = await db.select().from(sites).where(eq(sites.name, TEST_SITE_NAME)).limit(1);
    if (!site) throw new Error("Test site was not created");

    await db.insert(contracts).values({
      code: TEST_CONTRACT_CODE,
      name: "IT Core Identity Contract",
      clientCompanyId: company.id,
      siteId: site.id,
      status: "attivo",
      active: true,
    });
    const [contract] = await db.select().from(contracts).where(eq(contracts.code, TEST_CONTRACT_CODE)).limit(1);
    if (!contract) throw new Error("Test contract was not created");

    await db.insert(workers).values({
      firstName: "Integration",
      lastName: "Identity",
      email: TEST_EMAIL,
      companyId: company.id,
      siteId: site.id,
      contractId: contract.id,
      jobRoleId: jobRole.id,
      status: "attivo",
      active: true,
    });

    await db.insert(userOrganizationScopes).values({
      userId: user.id,
      companyId: company.id,
      siteId: site.id,
      contractId: contract.id,
      active: true,
    });

    const repository = new DrizzleCoreIdentityRepository(db as unknown as CoreIdentityDatabase);
    const loadedUser = await repository.findUserById(user.id);
    const people = await repository.findPeopleByUser(user);
    const scopes = await repository.listScopesByUserId(user.id);

    expect(loadedUser?.unionId).toBe(TEST_UNION_ID);
    expect(people).toHaveLength(1);
    expect(people[0]).toMatchObject({
      email: TEST_EMAIL,
      companyId: company.id,
      siteId: site.id,
      contractId: contract.id,
    });
    expect(scopes[0]).toMatchObject({
      companyId: company.id,
      siteId: site.id,
      contractId: contract.id,
      siteCompanyId: company.id,
      contractSiteId: site.id,
    });

    const actor = await new CoreIdentityService(repository).resolveActorContext(user);
    expect(actor).toMatchObject({
      tenantId: String(company.id),
      companyId: String(company.id),
      role: Role.OperatoreSicurezza,
      canAccessAllTenants: false,
    });
    expect(actor.organizationalScope.siteIds).toEqual([String(site.id)]);
    expect(actor.organizationalScope.contractIds).toEqual([String(contract.id)]);
  });
});

