import type { DomainId, ISODateTimeString } from "./types";

/**
 * Application access account linked to a real person.
 * Passwords, tokens and OAuth secrets are infrastructure concerns and must not live here.
 */
export interface UserAccount {
  id: DomainId;
  tenantId: DomainId;
  personId: DomainId;
  loginIdentifier: string;
  active: boolean;
  locked: boolean;
  lastLoginAt?: ISODateTimeString;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}
