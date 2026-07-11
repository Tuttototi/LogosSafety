import type {
  DomainId,
  OrganizationalScope,
  Permission,
  Role,
} from "../../core/domain";

/**
 * Backend-built actor context passed to application use cases and events.
 * It must be derived from trusted authentication/session data, never raw client input.
 */
export interface ActorContext {
  tenantId: DomainId;
  companyId: DomainId;
  personId?: DomainId;
  userId?: DomainId;
  role: Role;
  roles: Role[];
  active: boolean;
  organizationalScope: OrganizationalScope;
  scopes: OrganizationalScope[];
  permissions: Permission[];
  canAccessAllTenants: boolean;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}
