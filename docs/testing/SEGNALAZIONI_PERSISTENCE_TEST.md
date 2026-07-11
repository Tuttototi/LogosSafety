# Test persistenza Segnalazioni su MySQL locale

## Obiettivo

Validare realmente lo schema Drizzle e il repository persistente del modulo Segnalazioni contro un database MySQL locale isolato.

Il test non collega UI, tRPC, Hono, auth o backend runtime.

## Container usato

- Nome container: `logos-safety-mysql`
- Immagine: `mysql:8.4`
- Porta locale: `localhost:3306`
- Database: `logos_safety`
- Versione verificata: MySQL `8.4.10`

Le credenziali non sono documentate. Il test deve usare solo un `DATABASE_URL` locale e non deve puntare a database remoti o di produzione.

## Configurazione locale

La configurazione applicativa deve puntare a:

- host: `localhost`
- porta: `3306`
- database: `logos_safety`
- user: utente locale del container

Nel run validato, `.env` puntava gia' a host, porta, database e user locali. La connessione di test e' stata eseguita con override di processo di `DATABASE_URL`, senza modificare `.env` e senza stampare URL completi.

## Migrazioni applicate

Comando usato:

```bash
npm run db:migrate
```

Migrazioni applicate da Drizzle:

- `0000_sprint2_initial`
- `0001_purple_cobalt_man`
- `0002_talented_omega_flight`

La tabella `__drizzle_migrations` contiene tre record, incluso quello corrispondente alla migrazione Segnalazioni `0002_talented_omega_flight`.

## Tabelle verificate

Sono state verificate su MySQL reale:

- `segnalazioni`
- `segnalazione_comments`
- `segnalazione_attachments`
- `segnalazione_workflow_events`
- `segnalazione_acknowledgements`

## Constraint e indici verificati

Verificati tramite `INFORMATION_SCHEMA`:

- primary key sulle cinque tabelle;
- unique `idx_segnalazioni_tenant_code` su `tenant_id`, `code`;
- unique `idx_segnalazione_ack_unique` su `tenant_id`, `segnalazione_id`, `user_id`;
- FK interne da commenti, allegati, workflow e prese visione verso `segnalazioni`;
- FK allegato-commento verso `segnalazione_comments`;
- indici principali per tenant, status, autore, scope, impianto/area e soft delete.

## Test repository reale

Test creato:

```bash
api/segnalazioni-persistence.integration.test.ts
```

Il test e' opt-in e si abilita solo con:

```bash
SEGNALAZIONI_MYSQL_INTEGRATION=1
```

Il test usa il vero `DrizzleSegnalazioniRepository` e valida:

- create;
- findById;
- update;
- addComment;
- saveAcknowledgement;
- blocco duplicazione acknowledgement;
- tenant isolation;
- assenza risultato cross-tenant;
- filtro autore tramite ruolo segnalatore;
- filtro `plantId`;
- unique code nello stesso tenant;
- stesso code su tenant differente;
- snapshot autore preservato;
- mapping stato valido;
- esclusione soft delete dalle query ordinarie.

## Isolamento dati

I dati usano tenant dedicati:

- `it-seg-mysql-tenant-a`
- `it-seg-mysql-tenant-b`

Il cleanup e' mirato esclusivamente a questi tenant e viene eseguito prima e dopo il test.

Non vengono usati:

- `truncate`;
- `drop database`;
- reset globali;
- delete senza filtro.

## Limiti residui

- Il test richiede un MySQL locale disponibile su `localhost:3306`.
- `.env` non e' stato modificato; se le credenziali locali non coincidono con il container, usare override di processo sicuro di `DATABASE_URL`.
- Il repository non e' ancora collegato a API, Hono/tRPC, auth o UI.
- Non sono stati implementati outbox, audit persistence o notifiche reali.
