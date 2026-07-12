import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "../middleware";
import { buildSegnalazioniActor } from "./actor";
import {
  createSegnalazioniDependencies,
  type SegnalazioniApiDependencies,
  type SegnalazioniDependencyFactory,
} from "./dependencies";
import { DrizzleOrganizationalScopeRepository } from "../core/organizational-scope";
import {
  toSegnalazioneDetailDto,
  toSegnalazioneListItemDto,
  type SegnalazioneListItemDto,
} from "./dto";
import { mapUnexpectedSegnalazioniError, unwrapResult } from "./error-mapper";
import {
  acknowledgeInputSchema,
  addCommentInputSchema,
  byIdSegnalazioneInputSchema,
  changeStatusInputSchema,
  closeInputSchema,
  createSegnalazioneInputSchema,
  integrateInputSchema,
  listSegnalazioniInputSchema,
  requestIntegrationInputSchema,
  resolveInputSchema,
  takeInChargeInputSchema,
  type ListSegnalazioniApiInput,
} from "./schemas";
import { StatoSegnalazione } from "@/modules/segnalazioni/domain";
import type { Commento, Segnalazione, WorkflowEvento } from "@/modules/segnalazioni/domain";
import type { ApplicationActor } from "@/modules/segnalazioni/application";
import {
  OperationalScopeErrorCode,
  createListAccessibleOperationalScopeUseCase,
  createResolveOperationalScopeUseCase,
  type OperationalScopeResult,
  type OrganizationalScopeRepository,
  type ResolvedOperationalScope,
} from "@/modules/core/application/organizational-scope";
import type { TrpcContext } from "../context";
import { CoreIdentityError, CoreIdentityErrorCode } from "../core/identity";

type NormalizedListSegnalazioniApiInput = NonNullable<ListSegnalazioniApiInput>;
export type SegnalazioniActorResolver = (ctx: TrpcContext) => Promise<ApplicationActor>;
export type OrganizationalScopeRepositoryFactory = (ctx: TrpcContext) => OrganizationalScopeRepository;

export type SegnalazioniNotificationDto = {
  id: string;
  reportId: string;
  reportCode: string;
  reportTitle: string;
  type: "taken_in_charge" | "comment_received" | "integration_requested" | "resolved" | "closed";
  title: string;
  message: string;
  occurredAt: string;
  actorDisplayName?: string;
  read: boolean;
  detailPath: string;
};

async function defaultActorResolver(ctx: TrpcContext): Promise<ApplicationActor> {
  if (!ctx.user) {
    throw new CoreIdentityError(
      CoreIdentityErrorCode.IdentityNotFound,
      "Authenticated user is required",
    );
  }

  return buildSegnalazioniActor(ctx.user);
}

function bySortValue(report: SegnalazioneListItemDto, sortBy: "createdAt" | "updatedAt" | "priority" | "status"): string {
  return String(report[sortBy]);
}

function sortReports(
  reports: SegnalazioneListItemDto[],
  sortBy: "createdAt" | "updatedAt" | "priority" | "status",
  sortDirection: "asc" | "desc",
): SegnalazioneListItemDto[] {
  return [...reports].sort((left, right) => {
    const comparison = bySortValue(left, sortBy).localeCompare(bySortValue(right, sortBy));
    return sortDirection === "asc" ? comparison : -comparison;
  });
}

function startOfDayIso(value: string): string {
  return `${value}T00:00:00.000Z`;
}

function endOfDayIso(value: string): string {
  return `${value}T23:59:59.999Z`;
}

function isCreatedInsidePeriod(
  report: Segnalazione,
  input: NormalizedListSegnalazioniApiInput,
): boolean {
  if (input.createdFrom && report.createdAt < startOfDayIso(input.createdFrom)) return false;
  if (input.createdTo && report.createdAt > endOfDayIso(input.createdTo)) return false;
  return true;
}

function isCurrentActor(actor: ApplicationActor, userId?: string, personId?: string): boolean {
  return Boolean(
    (userId && userId === actor.userId) ||
    (personId && personId === actor.personId),
  );
}

function buildDetailPath(reportId: string): string {
  return `/segnalazioni?report=${encodeURIComponent(reportId)}`;
}

function workflowNotification(
  actor: ApplicationActor,
  report: Segnalazione,
  event: WorkflowEvento,
): SegnalazioniNotificationDto | undefined {
  if (isCurrentActor(actor, event.eseguitoDaId)) return undefined;

  const base = {
    id: `${report.id}:workflow:${event.id}`,
    reportId: report.id,
    reportCode: report.code,
    reportTitle: report.title,
    occurredAt: event.createdAt,
    actorDisplayName: event.eseguitoDaNome,
    read: false,
    detailPath: buildDetailPath(report.id),
  };

  if (event.statoA === StatoSegnalazione.PresaInCarico) {
    return {
      ...base,
      type: "taken_in_charge",
      title: "Segnalazione presa in carico",
      message: `${report.code} e' stata presa in carico.`,
    };
  }

  if (event.statoA === StatoSegnalazione.RichiestaIntegrazione) {
    return {
      ...base,
      type: "integration_requested",
      title: "Richiesta integrazione",
      message: `Serve un'integrazione su ${report.code}.`,
    };
  }

  if (event.statoA === StatoSegnalazione.Risolta) {
    return {
      ...base,
      type: "resolved",
      title: "Segnalazione risolta",
      message: `${report.code} e' stata risolta.`,
    };
  }

  if (event.statoA === StatoSegnalazione.Chiusa) {
    return {
      ...base,
      type: "closed",
      title: "Segnalazione chiusa",
      message: `${report.code} e' stata chiusa.`,
    };
  }

  return undefined;
}

function commentNotification(
  actor: ApplicationActor,
  report: Segnalazione,
  comment: Commento,
): SegnalazioniNotificationDto | undefined {
  if (isCurrentActor(actor, comment.autoreId)) return undefined;

  return {
    id: `${report.id}:comment:${comment.id}`,
    reportId: report.id,
    reportCode: report.code,
    reportTitle: report.title,
    type: "comment_received",
    title: "Nuovo commento",
    message: `Nuovo commento su ${report.code}.`,
    occurredAt: comment.createdAt,
    actorDisplayName: comment.autoreNome,
    read: false,
    detailPath: buildDetailPath(report.id),
  };
}

function buildSegnalazioniNotifications(
  actor: ApplicationActor,
  reports: readonly Segnalazione[],
): SegnalazioniNotificationDto[] {
  return reports.flatMap((report) => [
    ...(report.workflow ?? []).map((event) => workflowNotification(actor, report, event)),
    ...(report.comments ?? []).map((comment) => commentNotification(actor, report, comment)),
  ])
    .filter((notification): notification is SegnalazioniNotificationDto => Boolean(notification))
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
    .slice(0, 20);
}

function defaultScopeRepositoryFactory(): OrganizationalScopeRepository {
  return new DrizzleOrganizationalScopeRepository();
}

function unwrapOperationalScopeResult(
  result: OperationalScopeResult<ResolvedOperationalScope>,
): ResolvedOperationalScope {
  if (result.success) return result.data;

  throw new TRPCError({
    code: result.error.code === OperationalScopeErrorCode.Forbidden ? "FORBIDDEN" : "BAD_REQUEST",
    message: result.error.message,
  });
}

async function toDetailResponse(
  deps: SegnalazioniApiDependencies,
  actor: ApplicationActor,
  segnalazione: Segnalazione,
) {
  const [acknowledgedByCurrentUser, acknowledgements] = await Promise.all([
    deps.hasAcknowledgement({ actor, id: segnalazione.id }),
    deps.listAcknowledgements({ actor, id: segnalazione.id }),
  ]);

  return toSegnalazioneDetailDto(segnalazione, {
    actor,
    acknowledgedByCurrentUser,
    acknowledgements,
  });
}

export function createSegnalazioniRouter(
  dependencyFactory: SegnalazioniDependencyFactory = createSegnalazioniDependencies,
  actorResolver: SegnalazioniActorResolver = defaultActorResolver,
  scopeRepositoryFactory: OrganizationalScopeRepositoryFactory = defaultScopeRepositoryFactory,
) {
  return createRouter({
    availableScope: authedQuery.query(async ({ ctx }) => {
      try {
        const actor = await actorResolver(ctx);
        const repository = scopeRepositoryFactory(ctx);
        return createListAccessibleOperationalScopeUseCase(repository)(actor);
      } catch (error) {
        mapUnexpectedSegnalazioniError(error);
      }
    }),

    create: authedQuery
      .input(createSegnalazioneInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const actor = await actorResolver(ctx);
          const scopeRepository = scopeRepositoryFactory(ctx);
          const organizationalScope = unwrapOperationalScopeResult(
            await createResolveOperationalScopeUseCase(scopeRepository)(actor, input.organizationalScope),
          );
          const deps = dependencyFactory(ctx);
          const segnalazione = unwrapResult(await deps.createSegnalazione({
            actor,
            title: input.title,
            description: input.description,
            priority: input.priority,
            severity: input.severity,
            category: input.category,
            type: input.type,
            organizationalScope,
          }));

          return toDetailResponse(deps, actor, segnalazione);
        } catch (error) {
          mapUnexpectedSegnalazioniError(error);
        }
      }),

    list: authedQuery
      .input(listSegnalazioniInputSchema)
      .query(async ({ ctx, input }) => {
        try {
          const actor = await actorResolver(ctx);
          const normalizedInput: NormalizedListSegnalazioniApiInput = input ?? {};
          const page = normalizedInput.page ?? 1;
          const pageSize = normalizedInput.pageSize ?? 20;
          const sortBy = normalizedInput.sortBy ?? "createdAt";
          const sortDirection = normalizedInput.sortDirection ?? "desc";
          const deps = dependencyFactory(ctx);
          const organizationalScope = normalizedInput.organizationalScope
            ? unwrapOperationalScopeResult(
              await createResolveOperationalScopeUseCase(scopeRepositoryFactory(ctx))(actor, normalizedInput.organizationalScope),
            )
            : undefined;

          const visibleReports: Segnalazione[] = unwrapResult(await deps.listVisibleSegnalazioni({
            actor,
            organizationalScope,
          }));

          const filteredReports = visibleReports.filter((report) => {
            if (normalizedInput.status && report.status !== normalizedInput.status) return false;
            if (normalizedInput.priority && report.priority !== normalizedInput.priority) return false;
            if (!isCreatedInsidePeriod(report, normalizedInput)) return false;
            if (
              normalizedInput.createdByMe === true &&
              report.createdByUserId !== actor.userId &&
              report.createdByPersonId !== actor.personId &&
              report.reporter.userId !== actor.userId &&
              report.reporter.personId !== actor.personId
            ) {
              return false;
            }

            return true;
          });

          const sortedReports = sortReports(filteredReports.map(toSegnalazioneListItemDto), sortBy, sortDirection);
          const offset = (page - 1) * pageSize;

          return {
            items: sortedReports.slice(offset, offset + pageSize),
            total: sortedReports.length,
            page,
            pageSize,
          };
        } catch (error) {
          mapUnexpectedSegnalazioniError(error);
        }
      }),

    notifications: authedQuery
      .query(async ({ ctx }) => {
        try {
          const actor = await actorResolver(ctx);
          const deps = dependencyFactory(ctx);
          const visibleReports = unwrapResult(await deps.listVisibleSegnalazioni({ actor }));
          const items = buildSegnalazioniNotifications(actor, visibleReports);

          return {
            items,
            unreadCount: items.filter((item) => item.read === false).length,
            source: "timeline-derived" as const,
            readState: "not-persisted" as const,
          };
        } catch (error) {
          mapUnexpectedSegnalazioniError(error);
        }
      }),

    byId: authedQuery
      .input(byIdSegnalazioneInputSchema)
      .query(async ({ ctx, input }) => {
        try {
          const actor = await actorResolver(ctx);
          const deps = dependencyFactory(ctx);
          const segnalazione = unwrapResult(await deps.getSegnalazioneById({
            actor,
            id: input.id,
          }));

          return toDetailResponse(deps, actor, segnalazione);
        } catch (error) {
          mapUnexpectedSegnalazioniError(error);
        }
      }),

    addComment: authedQuery
      .input(addCommentInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const actor = await actorResolver(ctx);
          const deps = dependencyFactory(ctx);
          const comment = unwrapResult(await deps.addComment({
            actor,
            id: input.id,
            text: input.text,
          }));

          return { comment };
        } catch (error) {
          mapUnexpectedSegnalazioniError(error);
        }
      }),

    requestIntegration: authedQuery
      .input(requestIntegrationInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const actor = await actorResolver(ctx);
          const deps = dependencyFactory(ctx);
          const segnalazione = unwrapResult(await deps.requestIntegration({
            actor,
            id: input.id,
            reason: input.message,
          }));

          return toDetailResponse(deps, actor, segnalazione);
        } catch (error) {
          mapUnexpectedSegnalazioniError(error);
        }
      }),

    integrate: authedQuery
      .input(integrateInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const actor = await actorResolver(ctx);
          const deps = dependencyFactory(ctx);
          const segnalazione = unwrapResult(await deps.integrateSegnalazione({
            actor,
            id: input.id,
            text: input.message,
          }));

          return toDetailResponse(deps, actor, segnalazione);
        } catch (error) {
          mapUnexpectedSegnalazioniError(error);
        }
      }),

    takeInCharge: authedQuery
      .input(takeInChargeInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const actor = await actorResolver(ctx);
          const deps = dependencyFactory(ctx);
          const segnalazione = unwrapResult(await deps.takeInChargeSegnalazione({
            actor,
            id: input.id,
          }));

          return toDetailResponse(deps, actor, segnalazione);
        } catch (error) {
          mapUnexpectedSegnalazioniError(error);
        }
      }),

    changeStatus: authedQuery
      .input(changeStatusInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const actor = await actorResolver(ctx);
          const deps = dependencyFactory(ctx);
          const segnalazione = unwrapResult(await deps.changeSegnalazioneStatus({
            actor,
            id: input.id,
            status: input.targetStatus,
          }));

          return toDetailResponse(deps, actor, segnalazione);
        } catch (error) {
          mapUnexpectedSegnalazioniError(error);
        }
      }),

    resolve: authedQuery
      .input(resolveInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const actor = await actorResolver(ctx);
          const deps = dependencyFactory(ctx);
          const segnalazione = unwrapResult(await deps.resolveSegnalazione({
            actor,
            id: input.id,
            resolution: input.resolutionNote,
          }));

          return toDetailResponse(deps, actor, segnalazione);
        } catch (error) {
          mapUnexpectedSegnalazioniError(error);
        }
      }),

    close: authedQuery
      .input(closeInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const actor = await actorResolver(ctx);
          const deps = dependencyFactory(ctx);
          const segnalazione = unwrapResult(await deps.closeSegnalazione({
            actor,
            id: input.id,
            note: input.closingNote,
          }));

          return toDetailResponse(deps, actor, segnalazione);
        } catch (error) {
          mapUnexpectedSegnalazioniError(error);
        }
      }),

    acknowledge: authedQuery
      .input(acknowledgeInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const actor = await actorResolver(ctx);
          const deps = dependencyFactory(ctx);
          const acknowledgement = unwrapResult(await deps.acknowledgeSegnalazione({
            actor,
            id: input.id,
          }));

          return {
            acknowledged: true,
            acknowledgedAt: acknowledgement.acknowledgedAt,
          };
        } catch (error) {
          mapUnexpectedSegnalazioniError(error);
        }
      }),
  });
}

export const segnalazioniRouter = createSegnalazioniRouter();
