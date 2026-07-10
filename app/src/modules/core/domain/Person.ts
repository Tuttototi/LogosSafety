import type { DomainId, ISODateTimeString } from "./types";

/**
 * Real person. This model deliberately excludes health data and authentication secrets.
 */
export interface Person {
  id: DomainId;
  tenantId: DomainId;
  firstName: string;
  lastName: string;
  taxCode?: string;
  email?: string;
  phone?: string;
  active: boolean;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}
