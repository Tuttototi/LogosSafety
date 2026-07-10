import type { DomainId, ISODateTimeString } from "./types";

/**
 * Operational plant. It is not represented by a dedicated table yet.
 */
export interface Plant {
  id: DomainId;
  tenantId: DomainId;
  organizationId: DomainId;
  siteId: DomainId;
  contractId?: DomainId;
  name: string;
  code?: string;
  active: boolean;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}
