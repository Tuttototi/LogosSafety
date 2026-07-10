import type { DomainId } from "./types";

/**
 * Tenant-bound authorization scope.
 * The all* flags are scoped to tenantId and must be built exclusively by backend adapters.
 */
export interface OrganizationalScope {
  tenantId: DomainId;
  organizationIds: DomainId[];
  siteIds: DomainId[];
  contractIds: DomainId[];
  plantIds: DomainId[];
  areaIds: DomainId[];
  allOrganizations: boolean;
  allSites: boolean;
  allContracts: boolean;
  allPlants: boolean;
  allAreas: boolean;
}

export function createEmptyOrganizationalScope(
  tenantId: DomainId
): OrganizationalScope {
  return {
    tenantId,
    organizationIds: [],
    siteIds: [],
    contractIds: [],
    plantIds: [],
    areaIds: [],
    allOrganizations: false,
    allSites: false,
    allContracts: false,
    allPlants: false,
    allAreas: false,
  };
}

export function hasAnyOrganizationalScope(scope: OrganizationalScope): boolean {
  return (
    scope.allOrganizations ||
    scope.allSites ||
    scope.allContracts ||
    scope.allPlants ||
    scope.allAreas ||
    scope.organizationIds.length > 0 ||
    scope.siteIds.length > 0 ||
    scope.contractIds.length > 0 ||
    scope.plantIds.length > 0 ||
    scope.areaIds.length > 0
  );
}
