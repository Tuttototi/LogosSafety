# Notification Outbox LogosSafety

## Scopo

La Notification Outbox persiste eventi che dovranno generare notifiche future.
Non invia email, SMS, push mobile, WhatsApp o webhook in questo sprint.

## Tabella

Tabella Drizzle/MySQL:

```text
notification_outbox
```

Campi principali:

- `id`;
- `tenant_id`;
- `company_id`;
- `event_type`;
- `module`;
- `entity_type`;
- `entity_id`;
- `actor_user_id`;
- `occurred_at`;
- `payload`;
- `status`;
- `attempts`;
- `available_at`;
- `processed_at`;
- `last_error_code`;
- `correlation_id`;
- `created_at`.

Status:

- `pending`;
- `processing`;
- `processed`;
- `failed`.

Indici:

- `status + available_at`;
- `tenant_id + status`;
- `correlation_id`;
- `entity_type + entity_id`.

## Repository

Repository minimo:

- `enqueue`;
- `findPending`;
- `markProcessing`;
- `markProcessed`;
- `markFailed`.

`findPending` legge solo record `pending` con `availableAt <= now`, applica limite massimo e ordina per `availableAt`, `createdAt`, `id`.

## Payload

Il payload e' minimale:

- `entityId`;
- `eventType`;
- `futureAudienceType`;
- `actorUserId`;
- `occurredAt`.

Non include liste destinatari, email, telefono, PII non necessaria, testo commenti o allegati.

## Segnalazioni

Eventi notificabili:

- `segnalazione_created`;
- `segnalazione_taken_in_charge`;
- `segnalazione_comment_added`;
- `segnalazione_integration_requested`;
- `segnalazione_integrated`;
- `segnalazione_resolved`;
- `segnalazione_closed`.

Eventi non notificabili in questo sprint:

- `segnalazione_status_changed` generico;
- `segnalazione_acknowledged`.

## Limiti

Non esiste ancora:

- worker outbox;
- retry/backoff reale;
- template notifiche;
- risoluzione destinatari;
- preferenze canale;
- invio esterno.
