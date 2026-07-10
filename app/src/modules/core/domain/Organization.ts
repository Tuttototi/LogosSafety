import type { DomainId, ISODateTimeString } from "./types";

export const OrganizationType = {
  GroupCompany: "group_company",
  Client: "client",
  Supplier: "supplier",
  Cooperative: "cooperative",
  Subcontractor: "subcontractor",
  ManagedOrganization: "managed_organization",
  Other: "other",
} as const;

export type OrganizationType =
  (typeof OrganizationType)[keyof typeof OrganizationType];

export const ORGANIZATION_TYPE_VALUES = Object.values(OrganizationType);

/**
 * Legal or operational organization managed by LogosSafety.
 * It generalizes current companies and supports parent-child hierarchies.
 */
export interface Organization {
  id: DomainId;
  tenantId: DomainId;
  parentOrganizationId?: DomainId;
  type: OrganizationType;
  legalName: string;
  displayName: string;
  taxCode?: string;
  vatNumber?: string;
  active: boolean;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export function isOrganizationType(
  value: string | null | undefined
): value is OrganizationType {
  return ORGANIZATION_TYPE_VALUES.includes(value as OrganizationType);
}
