import type { DomainId, ISODateTimeString } from "./types";

/**
 * Operational area inside a plant or site. It is not represented by a dedicated table yet.
 */
export interface Area {
  id: DomainId;
  tenantId: DomainId;
  organizationId: DomainId;
  siteId?: DomainId;
  contractId?: DomainId;
  plantId?: DomainId;
  name: string;
  code?: string;
  active: boolean;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}
