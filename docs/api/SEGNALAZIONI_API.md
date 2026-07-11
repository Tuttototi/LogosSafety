# API Segnalazioni

## Stato

Il modulo Segnalazioni espone il primo boundary backend LogosSafety tramite tRPC/Hono:

- `segnalazioni.create`
- `segnalazioni.list`
- `segnalazioni.byId`

Gli endpoint usano i casi d'uso applicativi esistenti e il repository persistente `DrizzleSegnalazioniRepository`.
Non introducono UI, API pubbliche anonime, PHP, sessioni PHP, upload reali o bridge legacy.

## Autenticazione

Tutte le procedure usano `authedQuery`.

L'attore applicativo viene costruito solo dal contesto autenticato server-side (`ctx.user`):

- `userId`: risolto dal Core Identity Context;
- `personId`: risolto dal worker/person collegato all'account;
- `role`: mappato dal ruolo effettivo risolto server-side;
- `active`: derivato da account, persona, membership e ruolo;
- `tenantId` e `companyId`: risolti dal Core Identity Context.

Il client non puo' inviare `tenantId`, `companyId`, `role`, `userId` o `personId`.

## Core Identity Context

Segnalazioni usa `CoreIdentityService` tramite `app/api/segnalazioni/actor.ts`.

Il servizio carica da database:

- `users`;
- `workers` come adapter legacy Person;
- `companies` come Organization e tenant boundary temporaneo;
- `user_organization_scopes` come scope operativo.

Il dettaglio architetturale e' documentato in `docs/architecture/CORE_IDENTITY_CONTEXT.md`.

Il client puo' filtrare solo i sotto-scope operativi ammessi:

- `contractId`
- `siteId`
- `plantId`
- `areaId`

## Procedure

### `segnalazioni.create`

Crea una nuova segnalazione nel tenant/company dell'attore autenticato.

Input:

```ts
{
  title: string;
  description: string;
  priority: "Bassa" | "Media" | "Alta" | "Critica";
  severity: "Bassa" | "Media" | "Alta" | "Critica";
  category: "Sicurezza" | "Ambiente" | "Attrezzature" | "Procedura" | "Altro";
  type: "Pericolo" | "Incidente" | "Near miss" | "Non conformita" | "Suggerimento";
  organizationalScope?: {
    contractId?: string;
    siteId?: string;
    plantId?: string;
    areaId?: string;
  };
}
```

Comportamento:

- valida input con Zod strict;
- costruisce l'attore dal contesto autenticato;
- genera id e codice lato server;
- usa `createCreateSegnalazioneUseCase`;
- persiste tramite `DrizzleSegnalazioniRepository`.

### `segnalazioni.list`

Restituisce le segnalazioni visibili all'attore autenticato.

Input opzionale:

```ts
{
  page?: number;
  pageSize?: number; // massimo 50
  status?: "Nuova" | "Presa in carico" | "In lavorazione" | "Richiesta integrazione" | "Integrata" | "Risolta" | "Chiusa";
  priority?: "Bassa" | "Media" | "Alta" | "Critica";
  createdByMe?: boolean;
  organizationalScope?: {
    contractId?: string;
    siteId?: string;
    plantId?: string;
    areaId?: string;
  };
  sortBy?: "createdAt" | "updatedAt" | "priority" | "status";
  sortDirection?: "asc" | "desc";
}
```

Output:

```ts
{
  items: SegnalazioneDto[];
  total: number;
  page: number;
  pageSize: number;
}
```

Comportamento:

- usa `createListVisibleSegnalazioniUseCase`;
- mantiene tenant/company server-side;
- applica filtri locali su status, priority e autore corrente;
- limita `pageSize` a 50.

### `segnalazioni.byId`

Restituisce il dettaglio di una segnalazione visibile all'attore autenticato.

Input:

```ts
{
  id: string;
}
```

Comportamento:

- usa `createGetSegnalazioneByIdUseCase`;
- il dominio blocca accessi cross-tenant o fuori scope;
- gli errori non espongono dettagli di persistenza.

## Error mapping

| Application error | tRPC code |
|---|---|
| `VALIDATION_ERROR` | `BAD_REQUEST` |
| `UNAUTHORIZED` | `UNAUTHORIZED` |
| `FORBIDDEN` | `FORBIDDEN` |
| `NOT_FOUND` | `NOT_FOUND` |
| `INVALID_TRANSITION` | `BAD_REQUEST` |
| `CROSS_TENANT_ACCESS` | `FORBIDDEN` |
| `INACTIVE_USER` | `FORBIDDEN` |
| `CONFLICT` | `CONFLICT` |
| `INTERNAL_ERROR` | `INTERNAL_SERVER_ERROR` |

Gli errori inattesi del repository sono sanitizzati come `Segnalazioni operation failed`.

## Test

La suite `segnalazioni-router.test.ts` verifica:

- accesso autenticato;
- blocco chiamate anonime;
- rifiuto di tenant/company/role inviati dal client;
- mapping utente inattivo;
- tenant isolation;
- filtro scope operativo;
- filtro autore;
- paginazione e limite `pageSize`;
- dettaglio visibile;
- blocco cross-tenant;
- mapping validation/conflict;
- sanitizzazione errori inattesi.

La validazione reale del repository MySQL resta coperta dal test opt-in `segnalazioni-persistence.integration.test.ts`.

## Integrazione frontend

`SegnalatoreApp` usa queste procedure tramite il layer:

```text
app/src/modules/segnalazioni/ui
```

La UI invia a `segnalazioni.create` solo:

- `title`;
- `description`;
- `priority`;
- `severity`;
- `category`;
- `type`.

Non invia tenant, company, role, reporter, userId, personId o status.

Il campo Appalto/Commessa non usa mock: finche' non esiste una query sicura per gli appalti visibili, la create usa lo scope dell'attore backend senza `contractId` client-side.

La `list` senza filtro `organizationalScope` esplicito non viene ristretta al primo scope operativo dell'attore: carica il perimetro company autorizzato e lascia al domain layer il filtro di visibilita'. Questo permette al flusso create senza appalto selezionabile di mostrare subito la segnalazione appena creata.

## Limiti residui

- il Core Identity Context usa ancora adapter legacy per `workers`, `companies`, `users.role` e `user_organization_scopes`;
- manca una FK esplicita `users.person_id`;
- manca una tabella tenant SaaS dedicata;
- manca una query frontend/backend dedicata agli appalti visibili all'attore;
- audit e notifiche sono port differiti, non ancora collegati a outbox o audit persistente atomico;
- allegati, commenti, prese visione e transizioni workflow avanzate non sono esposti da questo sprint;
- Comunicazioni Sicurezza non sono ancora collegate a backend.
