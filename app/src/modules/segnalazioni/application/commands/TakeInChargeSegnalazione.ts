import { StatoSegnalazione } from "../../domain";
import type { ApplicationResult } from "../errors/ApplicationError";
import type { SegnalazioniUseCaseDependencies } from "../dependencies";
import { ApplicationEventType, type SegnalazioneActionInput } from "../types";
import { loadVisibleSegnalazione, persistStatusChange } from "../helpers";
import type { Segnalazione } from "../../domain";

export function createTakeInChargeSegnalazioneUseCase(deps: SegnalazioniUseCaseDependencies) {
  return async function takeInChargeSegnalazione(
    input: SegnalazioneActionInput,
  ): Promise<ApplicationResult<Segnalazione>> {
    const loadResult = await loadVisibleSegnalazione(deps, input.actor, input.id);
    if (!loadResult.success) return loadResult;

    const assigned = {
      ...loadResult.data,
      assignedToUserId: input.actor.userId,
      responsibleUserId: input.actor.userId,
    };

    return persistStatusChange(
      deps,
      input.actor,
      assigned,
      StatoSegnalazione.PresaInCarico,
      ApplicationEventType.SegnalazioneTakenInCharge,
      input.note,
    );
  };
}

