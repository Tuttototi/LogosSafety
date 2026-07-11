import { eq, inArray } from "drizzle-orm";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql, { type Pool } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  companies,
  contracts,
  microclimateSites,
  sites,
} from "@db/schema";
import * as schema from "@db/schema";
import { DrizzleOrganizationalScopeRepository, type OrganizationalScopeDatabase } from "./core/organizational-scope";
import type { OrganizationalScopeActor } from "@/modules/core/application/organizational-scope";

const integrationEnabled = process.env.ORGANIZATIONAL_SCOPE_MYSQL_INTEGRATION === "1";
const describeIntegration = integrationEnabled ? describe : describe.skip;

const COMPANY_NAME = "IT Organizational Scope Company";
const SITE_A_NAME = "IT Organizational Scope Site A";
const SITE_B_NAME = "IT Organizational Scope Site B";
const CONTRACT_A_CODE = "IT-ORG-SCOPE-CONTRACT-A";
const CONTRACT_B_CODE = "IT-ORG-SCOPE-CONTRACT-B";
const CONTRACT_INACTIVE_CODE = "IT-ORG-SCOPE-CONTRACT-INACTIVE";
const PLANT_A_CODE = "IT-ORG-SCOPE-PLANT-A";
const PLANT_B_CODE = "IT-ORG-SCOPE-PLANT-B";

let pool: Pool;
let db: MySql2Database<typeof schema>;
let companyId = 0;
let siteAId = 0;
let siteBId = 0;
let contractAId = 0;
let contractBId = 0;
let plantAId = 0;

function requireLocalDatabaseUrl(): string {
  const databaseUrl = process.env.DEV_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for organizational scope integration tests");

  const parsed = new URL(databaseUrl);
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (!localHosts.has(parsed.hostname)) {
    throw new Error("Organizational scope integration tests require a local database host");
  }
  if ((parsed.port || "3306") !== "3306") {
    throw new Error("Organizational scope integration tests require local port 3306");
  }
  if (parsed.pathname.replace("/", "") !== "logos_safety") {
    throw new Error("Organizational scope integration tests require the logos_safety database");
  }

  return databaseUrl;
}

async function cleanupTestData(): Promise<void> {
  await db.delete(microclimateSites).where(inArray(microclimateSites.code, [PLANT_A_CODE, PLANT_B_CODE]));
  await db.delete(contracts).where(inArray(contracts.code, [CONTRACT_A_CODE, CONTRACT_B_CODE, CONTRACT_INACTIVE_CODE]));
  await db.delete(sites).where(inArray(sites.name, [SITE_A_NAME, SITE_B_NAME]));
  await db.delete(companies).where(eq(companies.name, COMPANY_NAME));
}

function makeActor(overrides: Partial<OrganizationalScopeActor> = {}): OrganizationalScopeActor {
  const tenantId = String(companyId);
  const company = String(companyId);
  return {
    tenantId,
    companyId: company,
    role: "admin",
    active: true,
    organizationalScope: { tenantId, companyId: company },
    assignedScopes: [{ tenantId, companyId: company }],
    canAccessAllTenants: false,
    ...overrides,
  };
}

describeIntegration("DrizzleOrganizationalScopeRepository MySQL integration", () => {
  beforeAll(async () => {
    pool = mysql.createPool(requireLocalDatabaseUrl());
    db = drizzle(pool, { schema, mode: "default" });
    await cleanupTestData();

    await db.insert(companies).values({
      name: COMPANY_NAME,
      vatNumber: "00000000001",
      fiscalCode: "00000000001",
      active: true,
    });
    const [company] = await db.select().from(companies).where(eq(companies.name, COMPANY_NAME)).limit(1);
    if (!company) throw new Error("Company fixture was not created");
    companyId = company.id;

    await db.insert(sites).values([
      { companyId, name: SITE_A_NAME, code: "IT-ORG-A", active: true },
      { companyId, name: SITE_B_NAME, code: "IT-ORG-B", active: true },
    ]);
    const siteRows = await db.select().from(sites).where(inArray(sites.name, [SITE_A_NAME, SITE_B_NAME]));
    siteAId = siteRows.find((site) => site.name === SITE_A_NAME)?.id ?? 0;
    siteBId = siteRows.find((site) => site.name === SITE_B_NAME)?.id ?? 0;
    if (!siteAId || !siteBId) throw new Error("Site fixtures were not created");

    await db.insert(contracts).values([
      { code: CONTRACT_A_CODE, name: "IT Contract A", clientCompanyId: companyId, siteId: siteAId, status: "attivo", active: true },
      { code: CONTRACT_B_CODE, name: "IT Contract B", clientCompanyId: companyId, siteId: siteBId, status: "attivo", active: true },
      { code: CONTRACT_INACTIVE_CODE, name: "IT Contract inactive", clientCompanyId: companyId, siteId: siteAId, status: "sospeso", active: false },
    ]);
    const contractRows = await db.select().from(contracts).where(inArray(contracts.code, [CONTRACT_A_CODE, CONTRACT_B_CODE]));
    contractAId = contractRows.find((contract) => contract.code === CONTRACT_A_CODE)?.id ?? 0;
    contractBId = contractRows.find((contract) => contract.code === CONTRACT_B_CODE)?.id ?? 0;
    if (!contractAId || !contractBId) throw new Error("Contract fixtures were not created");

    await db.insert(microclimateSites).values([
      { companyId, siteId: siteAId, name: "IT Plant A", code: PLANT_A_CODE, active: true },
      { companyId, siteId: siteBId, name: "IT Plant B", code: PLANT_B_CODE, active: true },
    ]);
    const [plantA] = await db.select().from(microclimateSites).where(eq(microclimateSites.code, PLANT_A_CODE)).limit(1);
    plantAId = plantA?.id ?? 0;
    if (!plantAId) throw new Error("Plant fixture was not created");
  });

  afterAll(async () => {
    if (db) await cleanupTestData();
    if (pool) await pool.end();
  });

  it("lists active contracts, sites and plants inside actor company scope", async () => {
    const repository = new DrizzleOrganizationalScopeRepository(db as unknown as OrganizationalScopeDatabase);

    const result = await repository.listAccessibleScope(makeActor());

    expect(result.contracts.map((contract) => contract.id)).toEqual([String(contractAId), String(contractBId)]);
    expect(result.sites.map((site) => site.id).sort()).toEqual([String(siteAId), String(siteBId)].sort());
    expect(result.plants.map((plant) => plant.id)).toContain(String(plantAId));
    expect(result.contracts.map((contract) => contract.code)).not.toContain(CONTRACT_INACTIVE_CODE);
  });

  it("limits a site-scoped actor and validates selections server-side", async () => {
    const repository = new DrizzleOrganizationalScopeRepository(db as unknown as OrganizationalScopeDatabase);
    const actor = makeActor({
      role: "referente_commessa",
      organizationalScope: { tenantId: String(companyId), companyId: String(companyId), siteId: String(siteAId) },
      assignedScopes: [{ tenantId: String(companyId), companyId: String(companyId), siteId: String(siteAId) }],
    });

    const accessible = await repository.listAccessibleScope(actor);
    expect(accessible.contracts.map((contract) => contract.id)).toEqual([String(contractAId)]);

    const valid = await repository.validateOperationalSelection(actor, { contractId: String(contractAId) });
    expect(valid).toMatchObject({ success: true, data: { contractId: String(contractAId), siteId: String(siteAId) } });

    const forbidden = await repository.validateOperationalSelection(actor, { contractId: String(contractBId) });
    expect(forbidden).toMatchObject({ success: false, error: { code: "FORBIDDEN" } });

    const incoherent = await repository.validateOperationalSelection(makeActor(), {
      contractId: String(contractAId),
      siteId: String(siteBId),
    });
    expect(incoherent).toMatchObject({ success: false, error: { code: "INVALID_SELECTION" } });
  });
});
