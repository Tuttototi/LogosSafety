import type { DomainId, ISODateString } from "./types";

export const MembershipType = {
  Employee: "employee",
  Collaborator: "collaborator",
  Consultant: "consultant",
  AuthorizedExternal: "authorized_external",
  Client: "client",
  Supplier: "supplier",
} as const;

export type MembershipType =
  (typeof MembershipType)[keyof typeof MembershipType];

export const MEMBERSHIP_TYPE_VALUES = Object.values(MembershipType);

/**
 * Relationship between a person and an organization.
 */
export interface Membership {
  id: DomainId;
  tenantId: DomainId;
  personId: DomainId;
  organizationId: DomainId;
  membershipType: MembershipType;
  employeeCode?: string;
  startDate: ISODateString;
  endDate?: ISODateString;
  active: boolean;
}

export function isMembershipType(
  value: string | null | undefined
): value is MembershipType {
  return MEMBERSHIP_TYPE_VALUES.includes(value as MembershipType);
}
