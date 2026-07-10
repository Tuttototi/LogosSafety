import { canViewSegnalazione, type Segnalazione } from "../../domain";
import { ApplicationErrorCode, fail, ok, type ApplicationResult } from "../errors/ApplicationError";
import type { SegnalazioniUseCaseDependencies } from "../dependencies";
import type { ListVisibleSegnalazioniInput } from "../types";
import { validateActor } from "../helpers";

export function createListVisibleSegnalazioniUseCase(deps: SegnalazioniUseCaseDependencies) {
  return async function listVisibleSegnalazioni(
    input: ListVisibleSegnalazioniInput,
  ): Promise<ApplicationResult<Segnalazione[]>> {
    const actorResult = validateActor(input.actor);
    if (!actorResult.success) return actorResult;

    if (
      input.organizationalScope &&
      input.actor.canAccessAllTenants !== true &&
      input.organizationalScope.tenantId !== input.actor.tenantId
    ) {
      return fail(ApplicationErrorCode.CrossTenantAccess, "Cross-tenant listing is not allowed", {
        actorTenantId: input.actor.tenantId,
        tenantId: input.organizationalScope.tenantId,
      });
    }

    const candidates = await deps.repository.listVisibleByScope({
      actor: input.actor,
      organizationalScope: input.organizationalScope,
    });

    return ok(candidates.filter((segnalazione) => canViewSegnalazione(input.actor, segnalazione)));
  };
}

