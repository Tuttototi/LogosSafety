import type { DomainId } from "./Enums";

export type TenantId = DomainId;
export type CompanyId = DomainId;
export type ContractId = DomainId;
export type SiteId = DomainId;
export type PlantId = DomainId;
export type AreaId = DomainId;

/**
 * Organizational boundary in which a report is created and evaluated.
 * Tenant and company are mandatory; operational boundaries are optional when not applicable.
 */
export interface OrganizationalScope {
  tenantId: TenantId;
  companyId: CompanyId;
  contractId?: ContractId;
  siteId?: SiteId;
  plantId?: PlantId;
  areaId?: AreaId;
}

/**
 * Returns true when two scopes belong to the same tenant.
 */
export function isSameTenant(left: OrganizationalScope, right: OrganizationalScope): boolean {
  return left.tenantId === right.tenantId;
}

/**
 * Returns true when two scopes belong to the same tenant and company.
 */
export function isSameCompany(left: OrganizationalScope, right: OrganizationalScope): boolean {
  return isSameTenant(left, right) && left.companyId === right.companyId;
}

/**
 * Checks whether a target scope is included in an allowed scope.
 * Undefined operational fields in the allowed scope act as wildcards inside the same company.
 */
export function isWithinOrganizationalScope(target: OrganizationalScope, allowed: OrganizationalScope): boolean {
  if (!isSameCompany(target, allowed)) return false;
  if (allowed.contractId && target.contractId !== allowed.contractId) return false;
  if (allowed.siteId && target.siteId !== allowed.siteId) return false;
  if (allowed.plantId && target.plantId !== allowed.plantId) return false;
  if (allowed.areaId && target.areaId !== allowed.areaId) return false;
  return true;
}

/**
 * Checks whether a target scope is included in at least one assigned scope.
 */
export function isWithinAnyOrganizationalScope(
  target: OrganizationalScope,
  allowedScopes: readonly OrganizationalScope[],
): boolean {
  return allowedScopes.some((scope) => isWithinOrganizationalScope(target, scope));
}

