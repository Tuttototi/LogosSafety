import { StatoSegnalazione } from "../../domain";
import type { ApplicationResult } from "../errors/ApplicationError";
import type { SegnalazioniUseCaseDependencies } from "../dependencies";
import { ApplicationEventType, type CloseSegnalazioneInput } from "../types";
import { loadVisibleSegnalazione, persistStatusChange } from "../helpers";
import type { Segnalazione } from "../../domain";

export function createCloseSegnalazioneUseCase(deps: SegnalazioniUseCaseDependencies) {
  return async function closeSegnalazione(input: CloseSegnalazioneInput): Promise<ApplicationResult<Segnalazione>> {
    const loadResult = await loadVisibleSegnalazione(deps, input.actor, input.id);
    if (!loadResult.success) return loadResult;

    return persistStatusChange(
      deps,
      input.actor,
      loadResult.data,
      StatoSegnalazione.Chiusa,
      ApplicationEventType.SegnalazioneClosed,
      input.note,
    );
  };
}

