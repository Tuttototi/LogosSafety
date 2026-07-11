import type { DomainId, ISODateTimeString } from "../../core/domain";
import type { ActorContext } from "./ActorContext";
import type { EntityReference } from "./EntityReference";

export interface DomainEvent<
  TType extends string = string,
  TPayload extends Record<string, unknown> = Record<string, unknown>,
> {
  id: DomainId;
  type: TType;
  tenantId: DomainId;
  sourceModule: string;
  occurredAt: ISODateTimeString;
  actor?: ActorContext;
  entity?: EntityReference;
  payload: TPayload;
  correlationId?: DomainId;
  causationId?: DomainId;
}
