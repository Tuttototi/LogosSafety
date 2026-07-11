import type { OrganizationalScope } from "@/modules/segnalazioni/domain";
import type { ApplicationActor } from "@/modules/segnalazioni/application";
import type { ScopeApiInput } from "./schemas";

export function buildScopeFromInput(
  actor: ApplicationActor,
  input?: ScopeApiInput,
): OrganizationalScope {
  return {
    tenantId: actor.tenantId,
    companyId: actor.companyId,
    contractId: input?.contractId,
    siteId: input?.siteId,
    plantId: input?.plantId,
    areaId: input?.areaId,
  };
}

