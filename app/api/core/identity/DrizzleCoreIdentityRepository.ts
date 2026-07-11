import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  companies,
  contracts,
  sites,
  userOrganizationScopes,
  users,
  workers,
} from "@db/schema";
import { getDb } from "../../queries/connection";
import type { CoreIdentityRepository } from "./CoreIdentityRepository";
import type {
  IdentityCompanyRecord,
  IdentityPersonRecord,
  IdentityScopeRecord,
  IdentityUserRecord,
} from "./types";

export type CoreIdentityDatabase = ReturnType<typeof getDb>;

export class DrizzleCoreIdentityRepository implements CoreIdentityRepository {
  private readonly db: CoreIdentityDatabase;

  constructor(db: CoreIdentityDatabase = getDb()) {
    this.db = db;
  }

  async findUserById(userId: number): Promise<IdentityUserRecord | null> {
    const rows = await this.db
      .select({
        id: users.id,
        unionId: users.unionId,
        name: users.name,
        email: users.email,
        role: users.role,
        active: users.active,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        lastSignInAt: users.lastSignInAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return rows.at(0) ?? null;
  }

  async findPeopleByUser(user: Pick<IdentityUserRecord, "email">): Promise<IdentityPersonRecord[]> {
    const email = user.email?.trim();
    if (!email) return [];

    return this.db
      .select({
        id: workers.id,
        firstName: workers.firstName,
        lastName: workers.lastName,
        fiscalCode: workers.fiscalCode,
        email: workers.email,
        phone: workers.phone,
        companyId: workers.companyId,
        siteId: workers.siteId,
        contractId: workers.contractId,
        status: workers.status,
        active: workers.active,
        deletedAt: workers.deletedAt,
        createdAt: workers.createdAt,
        updatedAt: workers.updatedAt,
      })
      .from(workers)
      .where(
        and(
          eq(workers.email, email),
          eq(workers.active, true),
          isNull(workers.deletedAt),
        ),
      )
      .limit(2);
  }

  async findCompanyById(companyId: number): Promise<IdentityCompanyRecord | null> {
    const rows = await this.db
      .select({
        id: companies.id,
        name: companies.name,
        vatNumber: companies.vatNumber,
        fiscalCode: companies.fiscalCode,
        isCooperative: companies.isCooperative,
        active: companies.active,
        createdAt: companies.createdAt,
        updatedAt: companies.updatedAt,
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    return rows.at(0) ?? null;
  }

  async listScopesByUserId(userId: number): Promise<IdentityScopeRecord[]> {
    const scopeRows = await this.db
      .select({
        id: userOrganizationScopes.id,
        userId: userOrganizationScopes.userId,
        companyId: userOrganizationScopes.companyId,
        siteId: userOrganizationScopes.siteId,
        contractId: userOrganizationScopes.contractId,
        active: userOrganizationScopes.active,
      })
      .from(userOrganizationScopes)
      .where(
        and(
          eq(userOrganizationScopes.userId, userId),
          eq(userOrganizationScopes.active, true),
        ),
      );

    if (scopeRows.length === 0) return [];

    const siteIds = [...new Set(scopeRows.flatMap((scope) => scope.siteId ? [scope.siteId] : []))];
    const contractIds = [...new Set(scopeRows.flatMap((scope) => scope.contractId ? [scope.contractId] : []))];

    const siteRows = siteIds.length > 0
      ? await this.db
        .select({ id: sites.id, companyId: sites.companyId })
        .from(sites)
        .where(inArray(sites.id, siteIds))
      : [];
    const contractRows = contractIds.length > 0
      ? await this.db
        .select({ id: contracts.id, siteId: contracts.siteId })
        .from(contracts)
        .where(inArray(contracts.id, contractIds))
      : [];

    const siteCompanyById = new Map(siteRows.map((site) => [site.id, site.companyId]));
    const contractSiteById = new Map(contractRows.map((contract) => [contract.id, contract.siteId]));

    return scopeRows.map((scope) => ({
      ...scope,
      siteCompanyId: scope.siteId ? siteCompanyById.get(scope.siteId) : null,
      contractSiteId: scope.contractId ? contractSiteById.get(scope.contractId) : null,
    }));
  }
}

