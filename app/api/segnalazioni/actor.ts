import type { User } from "@db/schema";
import type { ApplicationActor } from "@/modules/segnalazioni/application";
import {
  createCoreIdentityService,
  toSegnalazioniActor,
  type CoreIdentityService,
} from "../core/identity";

export async function buildSegnalazioniActor(
  user: User,
  identityService: CoreIdentityService = createCoreIdentityService(),
): Promise<ApplicationActor> {
  const actorContext = await identityService.resolveActorContext(user);
  return toSegnalazioniActor(actorContext);
}
