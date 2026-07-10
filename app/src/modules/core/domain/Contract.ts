import type { DomainId, ISODateString, ISODateTimeString } from "./types";

export const ContractStatus = {
  Active: "active",
  Completed: "completed",
  Suspended: "suspended",
  Cancelled: "cancelled",
} as const;

export type ContractStatus =
  (typeof ContractStatus)[keyof typeof ContractStatus];

export const CONTRACT_STATUS_VALUES = Object.values(ContractStatus);

/**
 * Contract or commessa. Current persistence stores it as contracts.
 */
export interface Contract {
  id: DomainId;
  tenantId: DomainId;
  organizationId: DomainId;
  clientOrganizationId?: DomainId;
  siteId?: DomainId;
  code: string;
  name: string;
  description?: string;
  status: ContractStatus;
  startDate?: ISODateString;
  endDate?: ISODateString;
  active: boolean;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export function isContractStatus(
  value: string | null | undefined
): value is ContractStatus {
  return CONTRACT_STATUS_VALUES.includes(value as ContractStatus);
}
