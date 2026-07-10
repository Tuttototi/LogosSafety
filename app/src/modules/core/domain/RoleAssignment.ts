import type { Role } from "./Role";
import type { OrganizationalScope } from "./OrganizationalScope";
import type { DomainId, ISODateTimeString } from "./types";

/**
 * Scoped role assignment for a person or user account.
 * A role without organizationalScope is not valid in LogosSafety.
 */
export interface RoleAssignment {
  id: DomainId;
  tenantId: DomainId;
  personId?: DomainId;
  userId?: DomainId;
  role: Role;
  organizationalScope: OrganizationalScope;
  validFrom: ISODateTimeString;
  validTo?: ISODateTimeString;
  active: boolean;
}
