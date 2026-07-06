import type { User, UserOrganizationScope } from "@db/schema";
import { userOrganizationScopes } from "@db/schema";
import { and, eq } from "drizzle-orm";

export type OrganizationScopeAssignment = Pick<
  UserOrganizationScope,
  "companyId" | "siteId" | "contractId"
>;

export type SiteScopeTarget = {
  companyId: number;
  siteId: number;
};

export type ContractScopeTarget = {
  companyId: number;
  siteId?: number | null;
  contractId: number;
};

const GLOBAL_ORGANIZATION_ROLES: ReadonlySet<User["role"]> = new Set([
  "admin",
  "responsabile_sicurezza",
]);

export function isGlobalOrganizationRole(role: User["role"]): boolean {
  return GLOBAL_ORGANIZATION_ROLES.has(role);
}

export async function getUserOrganizationScopes(
  user: Pick<User, "id" | "role">
): Promise<OrganizationScopeAssignment[]> {
  if (isGlobalOrganizationRole(user.role)) {
    return [];
  }

  const { getDb } = await import("./queries/connection");
  const db = getDb();

  return db
    .select({
      companyId: userOrganizationScopes.companyId,
      siteId: userOrganizationScopes.siteId,
      contractId: userOrganizationScopes.contractId,
    })
    .from(userOrganizationScopes)
    .where(
      and(
        eq(userOrganizationScopes.userId, user.id),
        eq(userOrganizationScopes.active, true)
      )
    );
}

export function canAccessCompany(
  role: User["role"],
  scopes: readonly OrganizationScopeAssignment[],
  companyId: number
): boolean {
  if (isGlobalOrganizationRole(role)) {
    return true;
  }

  return scopes.some(scope => scope.companyId === companyId);
}

export function canAccessSite(
  role: User["role"],
  scopes: readonly OrganizationScopeAssignment[],
  target: SiteScopeTarget
): boolean {
  if (isGlobalOrganizationRole(role)) {
    return true;
  }

  return scopes.some(scope => {
    if (scope.companyId !== target.companyId) {
      return false;
    }

    const isCompanyScope =
      scope.siteId === null && scope.contractId === null;
    return isCompanyScope || scope.siteId === target.siteId;
  });
}

export function canAccessContract(
  role: User["role"],
  scopes: readonly OrganizationScopeAssignment[],
  target: ContractScopeTarget
): boolean {
  if (isGlobalOrganizationRole(role)) {
    return true;
  }

  return scopes.some(scope => {
    if (scope.companyId !== target.companyId) {
      return false;
    }

    const isCompanyScope =
      scope.siteId === null && scope.contractId === null;
    if (isCompanyScope) {
      return true;
    }

    if (scope.contractId !== null) {
      return scope.contractId === target.contractId;
    }

    return (
      scope.siteId !== null &&
      target.siteId !== null &&
      target.siteId !== undefined &&
      scope.siteId === target.siteId
    );
  });
}
