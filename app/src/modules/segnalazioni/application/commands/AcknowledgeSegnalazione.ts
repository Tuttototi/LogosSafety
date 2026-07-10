import { ApplicationErrorCode, fail, ok, type ApplicationResult } from "../errors/ApplicationError";
import type { SegnalazioniUseCaseDependencies } from "../dependencies";
import { ApplicationEventType, type AcknowledgeSegnalazioneInput, type AcknowledgementRecord } from "../types";
import { loadVisibleSegnalazione, makeEvent, recordEvent } from "../helpers";

export function createAcknowledgeSegnalazioneUseCase(deps: SegnalazioniUseCaseDependencies) {
  return async function acknowledgeSegnalazione(
    input: AcknowledgeSegnalazioneInput,
  ): Promise<ApplicationResult<AcknowledgementRecord>> {
    const loadResult = await loadVisibleSegnalazione(deps, input.actor, input.id);
    if (!loadResult.success) return loadResult;

    if (await deps.repository.hasAcknowledgement(input.id, input.actor.userId)) {
      return fail(ApplicationErrorCode.Conflict, "Segnalazione acknowledgement already exists", {
        id: input.id,
        userId: input.actor.userId,
      });
    }

    const acknowledgedAt = deps.clock.now();
    const acknowledgement: AcknowledgementRecord = {
      id: deps.ids.nextId("acknowledgement"),
      segnalazioneId: input.id,
      tenantId: loadResult.data.tenantId,
      companyId: loadResult.data.companyId,
      userId: input.actor.userId,
      personId: input.actor.personId,
      acknowledgedAt,
    };

    await deps.repository.saveAcknowledgement(acknowledgement);
    await recordEvent(
      deps,
      {
        ...makeEvent(ApplicationEventType.SegnalazioneAcknowledged, input.actor, loadResult.data, acknowledgedAt),
        entityType: "Acknowledgement",
        entityId: acknowledgement.id,
      },
    );

    return ok(acknowledgement);
  };
}

