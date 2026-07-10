import type { DomainId, ISODateTimeString } from "./types";

/**
 * Operational site belonging to an organization.
 */
export interface Site {
  id: DomainId;
  tenantId: DomainId;
  organizationId: DomainId;
  name: string;
  code?: string;
  address?: string;
  active: boolean;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}
