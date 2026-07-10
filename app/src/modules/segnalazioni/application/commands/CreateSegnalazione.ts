import {
  canCreateSegnalazione,
  canSubmitSegnalazione,
  StatoSegnalazione,
  toReporterSnapshot,
  type Segnalazione,
} from "../../domain";
import { ApplicationErrorCode, fail, ok, type ApplicationResult } from "../errors/ApplicationError";
import type { SegnalazioniUseCaseDependencies } from "../dependencies";
import { ApplicationEventType, type CreateSegnalazioneInput } from "../types";
import { makeEvent, recordEvent, validateActor } from "../helpers";

export function createCreateSegnalazioneUseCase(deps: SegnalazioniUseCaseDependencies) {
  return async function createSegnalazione(input: CreateSegnalazioneInput): Promise<ApplicationResult<Segnalazione>> {
    const actorResult = validateActor(input.actor);
    if (!actorResult.success) return actorResult;

    const submitResult = canSubmitSegnalazione({
      tenantId: input.actor.tenantId,
      companyId: input.actor.companyId,
      reporter: input.actor,
      organizationalScope: input.organizationalScope,
      title: input.title,
      description: input.description,
      priority: input.priority,
      severity: input.severity,
      category: input.category,
      type: input.type,
      attachments: input.attachments,
    });

    if (!submitResult.valid) {
      return fail(ApplicationErrorCode.ValidationError, "Segnalazione input is invalid", {
        errors: submitResult.errors,
      });
    }

    if (!canCreateSegnalazione(input.actor, input.organizationalScope)) {
      return fail(ApplicationErrorCode.Forbidden, "Actor cannot create a segnalazione in this scope");
    }

    const code = deps.ids.nextCode("SEG");
    if (await deps.repository.existsByCode(code)) {
      return fail(ApplicationErrorCode.Conflict, "Generated segnalazione code already exists", { code });
    }

    const now = deps.clock.now();
    const segnalazione: Segnalazione = {
      id: deps.ids.nextId("segnalazione"),
      code,
      tenantId: input.actor.tenantId,
      companyId: input.actor.companyId,
      reporter: toReporterSnapshot(input.actor),
      createdByUserId: input.actor.userId,
      createdByPersonId: input.actor.personId,
      organizationalScope: input.organizationalScope,
      title: input.title.trim(),
      description: input.description.trim(),
      priority: input.priority,
      severity: input.severity,
      status: StatoSegnalazione.Nuova,
      category: input.category,
      type: input.type,
      attachments: input.attachments ?? [],
      comments: [],
      workflow: [],
      createdAt: now,
      updatedAt: now,
    };

    await deps.repository.create(segnalazione);
    await recordEvent(
      deps,
      makeEvent(ApplicationEventType.SegnalazioneCreated, input.actor, segnalazione, now, {
        code,
        status: segnalazione.status,
      }),
    );

    return ok(segnalazione);
  };
}

