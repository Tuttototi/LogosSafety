import type { DomainId, OrganizationalScope, Role } from "../../core/domain";

/**
 * Backend-built actor context passed to application use cases and events.
 * It must be derived from trusted authentication/session data, never raw client input.
 */
export interface ActorContext {
  tenantId: DomainId;
  personId?: DomainId;
  userId?: DomainId;
  roles: Role[];
  scopes: OrganizationalScope[];
  displayName?: string;
}
