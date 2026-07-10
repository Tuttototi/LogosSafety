import type { DomainId, ISODateTimeString } from "./types";

/**
 * SaaS tenant boundary. Every authorization and ownership decision is tenant-bound.
 */
export interface Tenant {
  id: DomainId;
  name: string;
  active: boolean;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}
