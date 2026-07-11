import type { DomainId, Role } from "@/modules/core/domain";

export type OperationalScopeRole = Role | "sicurezza";

export type OperationalScopeBoundary = {
  tenantId: DomainId;
  companyId: DomainId;
  contractId?: DomainId;
  siteId?: DomainId;
  plantId?: DomainId;
  areaId?: DomainId;
};

export type OrganizationalScopeActor = {
  tenantId: DomainId;
  companyId: DomainId;
  role: OperationalScopeRole;
  active: boolean;
  organizationalScope: OperationalScopeBoundary;
  assignedScopes?: OperationalScopeBoundary[];
  canAccessAllTenants?: boolean;
};

export type OperationalScopeSelection = {
  contractId?: DomainId;
  siteId?: DomainId;
  plantId?: DomainId;
  areaId?: DomainId;
};

export type AccessibleContract = {
  id: DomainId;
  code: string;
  name: string;
  siteId?: DomainId;
};

export type AccessibleSite = {
  id: DomainId;
  name: string;
  contractId?: DomainId;
};

export type AccessiblePlant = {
  id: DomainId;
  name: string;
  siteId?: DomainId;
  contractId?: DomainId;
};

export type AccessibleArea = {
  id: DomainId;
  name: string;
  plantId?: DomainId;
};

export type AccessibleOperationalScope = {
  contracts: AccessibleContract[];
  sites: AccessibleSite[];
  plants: AccessiblePlant[];
  areas: AccessibleArea[];
};

export type ResolvedOperationalScope = OperationalScopeBoundary;

export const OperationalScopeErrorCode = {
  InvalidSelection: "INVALID_SELECTION",
  Forbidden: "FORBIDDEN",
} as const;

export type OperationalScopeErrorCode =
  (typeof OperationalScopeErrorCode)[keyof typeof OperationalScopeErrorCode];

export type OperationalScopeError = {
  code: OperationalScopeErrorCode;
  message: string;
};

export type OperationalScopeResult<T> =
  | { success: true; data: T }
  | { success: false; error: OperationalScopeError };

export function ok<T>(data: T): OperationalScopeResult<T> {
  return { success: true, data };
}

export function fail<T = never>(
  code: OperationalScopeErrorCode,
  message: string,
): OperationalScopeResult<T> {
  return { success: false, error: { code, message } };
}
