import { ApplicationEventType, type ChangeSegnalazioneStatusInput } from "../types";
import type { ApplicationResult } from "../errors/ApplicationError";
import type { SegnalazioniUseCaseDependencies } from "../dependencies";
import { loadVisibleSegnalazione, persistStatusChange } from "../helpers";
import type { Segnalazione } from "../../domain";

export function createChangeSegnalazioneStatusUseCase(deps: SegnalazioniUseCaseDependencies) {
  return async function changeSegnalazioneStatus(
    input: ChangeSegnalazioneStatusInput,
  ): Promise<ApplicationResult<Segnalazione>> {
    const loadResult = await loadVisibleSegnalazione(deps, input.actor, input.id);
    if (!loadResult.success) return loadResult;

    return persistStatusChange(
      deps,
      input.actor,
      loadResult.data,
      input.status,
      ApplicationEventType.StatusChanged,
      input.note,
    );
  };
}

