# Test Audit Log e Notification Outbox

## Ambiente

Validazione eseguita su MySQL locale Docker:

- container: `logos-safety-mysql`;
- database: `logos_safety`;
- host: `localhost`;
- porta: `3306`.

La documentazione non contiene password o `DATABASE_URL` completi.

## Migrazione

Migration applicata:

```text
app/db/migrations/0003_volatile_human_cannonball.sql
```

Tabelle create:

- `audit_log_entries`;
- `notification_outbox`.

## Test automatici

Unit test:

```bash
npm test -- audit-notification-outbox
```

Integration test MySQL reale:

```bash
npm test -- audit-notification-outbox.integration
```

Il test reale richiede opt-in tramite variabile `AUDIT_NOTIFICATION_MYSQL_INTEGRATION=1` e `DATABASE_URL` locale.

## Copertura

Il test MySQL reale valida:

- create segnalazione;
- audit created;
- outbox created;
- presa in carico;
- audit/outbox presa in carico;
- cambio stato generico con audit ma zero outbox;
- commento con audit `commentId` e senza testo commento;
- richiesta integrazione con audit/outbox;
- integrazione con audit/outbox;
- risoluzione con audit/outbox;
- presa visione con audit e zero outbox;
- presa visione ripetuta senza audit/outbox duplicati;
- chiusura con audit/outbox;
- correlationId condiviso tra audit e outbox della stessa operazione;
- `findPending`;
- `markProcessing`;
- `markProcessed`;
- `markFailed`;
- query Audit tenant-safe;
- rollback se la mutation fallisce prima del commit;
- rollback se audit fallisce;
- rollback di mutation e audit se outbox fallisce.

## Cleanup

Il cleanup e' mirato ai soli tenant di test:

- `it-aob-main`;
- `it-aob-fa`;
- `it-aob-fo`;
- `it-aob-invalid`.

Non vengono usati truncate globali.

## Limiti residui

- Non viene testato un worker reale per processare outbox.
- Non viene testato invio email/SMS/push/WhatsApp.
- Non viene definita retention audit.
- Il router Audit legacy continua a leggere `audit_logs`, non `audit_log_entries`.
