import type { DomainId } from "../../core/domain";

/**
 * Stable reference to an entity owned by a module.
 * It avoids importing another module's aggregate or persistence model.
 */
export interface EntityReference {
  module: string;
  type: string;
  id: DomainId;
  tenantId: DomainId;
  label?: string;
}
