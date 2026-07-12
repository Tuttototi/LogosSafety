# ADR-0002: Audit Log persistente e Notification Outbox

## Stato

Accepted

## Contesto

Il modulo Segnalazioni emette eventi applicativi tramite `AuditPort` e `NotificationPort`.
Prima di questa decisione, nel boundary API gli adapter erano deferred/noop: la timeline operativa era persistita, ma non esistevano Audit Log globale e Notification Outbox atomici.

Nel database esistevano gia':

- `audit_logs`, tabella legacy usata dal router Audit generale, non tenant-bound e non adatta agli eventi applicativi string-id di Segnalazioni;
- `notification_logs`, tabella legata a Microclima e allo stato di delivery, non una outbox cross-module.

Queste strutture non soddisfano requisiti di tenant isolation, correlationId, payload minimale e transazionalita' con la mutation applicativa.

## Decisione

1. Creare una tabella append-only dedicata `audit_log_entries`.
2. Creare una tabella outbox dedicata `notification_outbox`.
3. Mantenere separate:
   - Timeline Segnalazione: storico operativo visibile nel dettaglio;
   - Audit Log globale: tracciamento tecnico/compliance;
   - Notification Outbox: coda persistente di eventi notificabili futuri.
4. Segnalazioni continua a dipendere solo da `AuditPort` e `NotificationPort`.
5. Gli adapter concreti vivono nei moduli infrastrutturali `audit` e `notifications`.
6. Le mutation API Segnalazioni sono eseguite dentro `DrizzleTransactionCoordinator`.
7. Repository Segnalazioni, AuditPort e NotificationPort condividono la stessa transazione tramite contesto Drizzle server-side.
8. Il correlationId e' generato server-side nel wiring applicativo e condiviso da audit/outbox della stessa operazione.
9. Non vengono implementati provider email, SMS, push, WhatsApp, worker, cron, Kafka, RabbitMQ o Redis Streams.

## Matrice Audit

| Evento applicativo | Audit event type |
|---|---|
| `SEGNALAZIONE_CREATED` | `segnalazione_created` |
| `SEGNALAZIONE_TAKEN_IN_CHARGE` | `segnalazione_taken_in_charge` |
| `COMMENT_ADDED` | `segnalazione_comment_added` |
| `INTEGRATION_REQUESTED` | `segnalazione_integration_requested` |
| `SEGNALAZIONE_INTEGRATED` | `segnalazione_integrated` |
| `STATUS_CHANGED` | `segnalazione_status_changed` |
| `SEGNALAZIONE_RESOLVED` | `segnalazione_resolved` |
| `SEGNALAZIONE_CLOSED` | `segnalazione_closed` |
| `SEGNALAZIONE_ACKNOWLEDGED` | `segnalazione_acknowledged` |

Metadata audit consentiti:

- `code`;
- `status`;
- `previousStatus`;
- `newStatus`;
- `commentId`.

Il testo completo di commenti, note, motivazioni e risoluzioni non viene duplicato nell'audit.

## Matrice Notification Outbox

| Evento applicativo | Outbox | Audience futura |
|---|---:|---|
| `SEGNALAZIONE_CREATED` | Si | `scope_safety_managers` |
| `SEGNALAZIONE_TAKEN_IN_CHARGE` | Si | `reporter` |
| `COMMENT_ADDED` | Si | `authorized_participants` |
| `INTEGRATION_REQUESTED` | Si | `reporter` |
| `SEGNALAZIONE_INTEGRATED` | Si | `responsible_managers` |
| `SEGNALAZIONE_RESOLVED` | Si | `reporter` |
| `SEGNALAZIONE_CLOSED` | Si | `reporter` |
| `STATUS_CHANGED` | No | evento generico non notificabile in questo sprint |
| `SEGNALAZIONE_ACKNOWLEDGED` | No | presa visione idempotente, nessuna notifica |

## Conseguenze

- Le mutation critiche Segnalazioni persistono mutation operativa, workflow event, audit e outbox nella stessa transazione.
- Un errore audit o outbox causa rollback della mutation applicativa.
- La presa visione duplicata ritorna il record esistente e non crea audit/outbox duplicati.
- `audit_logs` legacy resta disponibile per il router Audit esistente ma non e' il modello target per eventi modulari.
- `notification_logs` resta legata a Microclima; la nuova outbox non rappresenta notifiche consegnate.

## Rischi e follow-up

- Serve una retention policy audit dedicata.
- Serve un worker outbox futuro con retry, backoff, locking e idempotenza delivery.
- Serve una UI amministrativa per consultare `audit_log_entries`.
- Serve una strategia per migrare o affiancare il router Audit legacy.
- Serve normalizzare Core tenant/person/role per sostituire progressivamente gli ID legacy.
