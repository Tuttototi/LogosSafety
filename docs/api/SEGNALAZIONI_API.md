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

- `userId`: derivato dall'id utente LogosSafety legacy;
- `personId`: derivato dall'id utente LogosSafety legacy finche' non esiste il mapping persona reale;
- `role`: mappato dai ruoli legacy LogosSafety ai ruoli del dominio Segnalazioni;
- `active`: letto dal record utente autenticato;
- `tenantId` e `companyId`: assegnati dal boundary server-side temporaneo.

Il client non puo' inviare `tenantId`, `companyId`, `role`, `userId` o `personId`.

## Scope temporaneo

Il record utente legacy non contiene ancora tenant, company e person reali del Core Domain.
Per questa integrazione viene usato un adapter temporaneo e server-side:

- default tenant: `logos-safety-local`;
- default company: `logos-safety-company-local`;
- override locale ammesso via `SEGNALAZIONI_TENANT_ID` e `SEGNALAZIONI_COMPANY_ID`.

Questa scelta mantiene i filtri tenant/company nel dominio e nel repository, ma non sostituisce il futuro adapter Core Domain.
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

## Limiti residui

- l'adapter tenant/company/person e' temporaneo finche' il Core Domain non viene collegato agli utenti reali;
- audit e notifiche sono port differiti, non ancora collegati a outbox o audit persistente atomico;
- allegati, commenti, prese visione e transizioni workflow avanzate non sono esposti da questo sprint;
- non esiste ancora un client React collegato a queste procedure.

