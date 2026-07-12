import { describe, expect, it } from "vitest";
import {
  ApplicationEventType,
  type ApplicationEvent,
} from "@/modules/segnalazioni/application";
import {
  mapSegnalazioniEventToAuditEntry,
  sanitizeAuditMetadata,
} from "@/modules/audit";
import {
  mapSegnalazioniEventToOutboxEntry,
} from "@/modules/notifications";

function makeEvent(overrides: Partial<ApplicationEvent> = {}): ApplicationEvent {
  return {
    type: ApplicationEventType.StatusChanged,
    tenantId: "tenant-1",
    companyId: "company-1",
    userId: "user-1",
    actorPersonId: "person-1",
    actorRole: "responsabile_sicurezza",
    entityType: "Segnalazione",
    entityId: "report-1",
    timestamp: "2026-07-12T09:00:00.000Z",
    metadata: {
      from: "In lavorazione",
      to: "Richiesta integrazione",
      note: "Testo libero da non duplicare",
      token: "secret",
    },
    ...overrides,
  };
}

describe("audit and notification outbox mapping", () => {
  it("sanitizes audit metadata and removes sensitive or free-text fields", () => {
    const metadata = sanitizeAuditMetadata({
      previousStatus: "Nuova",
      newStatus: "Presa in carico",
      commentId: "comment-1",
      password: "hidden",
      session_id: "hidden",
      stack: "hidden",
      nested: { unsafe: true },
    });

    expect(metadata).toEqual({
      previousStatus: "Nuova",
      newStatus: "Presa in carico",
      commentId: "comment-1",
    });
  });

  it("maps segnalazioni events to minimal append-only audit entries", () => {
    const entry = mapSegnalazioniEventToAuditEntry(
      makeEvent(),
      "audit-1",
      "correlation-1",
    );

    expect(entry).toMatchObject({
      id: "audit-1",
      tenantId: "tenant-1",
      companyId: "company-1",
      eventType: "segnalazione_status_changed",
      module: "segnalazioni",
      action: "change_status",
      entityType: "Segnalazione",
      entityId: "report-1",
      actorUserId: "user-1",
      actorPersonId: "person-1",
      actorRole: "responsabile_sicurezza",
      correlationId: "correlation-1",
      metadata: {
        previousStatus: "In lavorazione",
        newStatus: "Richiesta integrazione",
      },
    });
    expect(JSON.stringify(entry.metadata)).not.toContain("Testo libero");
    expect(JSON.stringify(entry.metadata)).not.toContain("secret");
  });

  it("stores only commentId for comment audit metadata", () => {
    const entry = mapSegnalazioniEventToAuditEntry(
      makeEvent({
        type: ApplicationEventType.CommentAdded,
        entityType: "Commento",
        entityId: "comment-1",
        metadata: {
          commentId: "comment-1",
          text: "Commento operativo completo",
        },
      }),
      "audit-1",
      "correlation-1",
    );

    expect(entry.metadata).toEqual({ commentId: "comment-1" });
    expect(JSON.stringify(entry.metadata)).not.toContain("Commento operativo completo");
  });

  it("maps only notificable events to minimal outbox payloads", () => {
    const created = mapSegnalazioniEventToOutboxEntry(
      makeEvent({ type: ApplicationEventType.SegnalazioneCreated }),
      "notification-1",
      "correlation-1",
    );
    const acknowledged = mapSegnalazioniEventToOutboxEntry(
      makeEvent({ type: ApplicationEventType.SegnalazioneAcknowledged }),
      "notification-2",
      "correlation-2",
    );
    const genericStatus = mapSegnalazioniEventToOutboxEntry(
      makeEvent({ type: ApplicationEventType.StatusChanged }),
      "notification-3",
      "correlation-3",
    );

    expect(created).toMatchObject({
      eventType: "segnalazione_created",
      status: "pending",
      attempts: 0,
      correlationId: "correlation-1",
      payload: {
        entityId: "report-1",
        eventType: "segnalazione_created",
        futureAudienceType: "scope_safety_managers",
        actorUserId: "user-1",
        occurredAt: "2026-07-12T09:00:00.000Z",
      },
    });
    expect(acknowledged).toBeNull();
    expect(genericStatus).toBeNull();
    expect(Object.keys(created?.payload ?? {})).toEqual([
      "entityId",
      "eventType",
      "futureAudienceType",
      "actorUserId",
      "occurredAt",
    ]);
  });
});
