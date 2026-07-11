import { createRouter, authedQuery } from "../middleware";
import { buildSegnalazioniActor } from "./actor";
import { createSegnalazioniDependencies, type SegnalazioniDependencyFactory } from "./dependencies";
import {
  toSegnalazioneDetailDto,
  toSegnalazioneListItemDto,
  type SegnalazioneListItemDto,
} from "./dto";
import { mapUnexpectedSegnalazioniError, unwrapResult } from "./error-mapper";
import {
  byIdSegnalazioneInputSchema,
  createSegnalazioneInputSchema,
  listSegnalazioniInputSchema,
  type ListSegnalazioniApiInput,
} from "./schemas";
import { buildScopeFromInput } from "./scope";
import type { Segnalazione } from "@/modules/segnalazioni/domain";
import type { ApplicationActor } from "@/modules/segnalazioni/application";
import type { TrpcContext } from "../context";
import { CoreIdentityError, CoreIdentityErrorCode } from "../core/identity";

type NormalizedListSegnalazioniApiInput = NonNullable<ListSegnalazioniApiInput>;
export type SegnalazioniActorResolver = (ctx: TrpcContext) => Promise<ApplicationActor>;

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

export function createSegnalazioniRouter(
  dependencyFactory: SegnalazioniDependencyFactory = createSegnalazioniDependencies,
  actorResolver: SegnalazioniActorResolver = defaultActorResolver,
) {
  return createRouter({
    create: authedQuery
      .input(createSegnalazioneInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const actor = await actorResolver(ctx);
          const deps = dependencyFactory(ctx);
          const segnalazione = unwrapResult(await deps.createSegnalazione({
            actor,
            title: input.title,
            description: input.description,
            priority: input.priority,
            severity: input.severity,
            category: input.category,
            type: input.type,
            organizationalScope: buildScopeFromInput(actor, input.organizationalScope),
          }));

          return toSegnalazioneDetailDto(segnalazione);
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
            ? buildScopeFromInput(actor, normalizedInput.organizationalScope)
            : actor.organizationalScope;

          const visibleReports: Segnalazione[] = unwrapResult(await deps.listVisibleSegnalazioni({
            actor,
            organizationalScope,
          }));

          const filteredReports = visibleReports.filter((report) => {
            if (normalizedInput.status && report.status !== normalizedInput.status) return false;
            if (normalizedInput.priority && report.priority !== normalizedInput.priority) return false;
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

          return toSegnalazioneDetailDto(segnalazione);
        } catch (error) {
          mapUnexpectedSegnalazioniError(error);
        }
      }),
  });
}

export const segnalazioniRouter = createSegnalazioniRouter();
