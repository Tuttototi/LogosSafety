# Organizational Scope Resolver

## Obiettivo

L'Organizational Scope Resolver espone al modulo Segnalazioni solo i contesti operativi realmente disponibili per l'attore autenticato:

- appalti / commesse;
- sedi;
- impianti disponibili nello schema attuale;
- aree, quando il modello dati sara' disponibile.

Il client non invia tenant, azienda, ruolo o privilegi. Questi valori derivano sempre dal Core Identity Context backend.

## Boundary

Il contratto applicativo vive in:

```text
app/src/modules/core/application/organizational-scope
```

Il repository Drizzle concreto vive in:

```text
app/api/core/organizational-scope
```

Il modulo Segnalazioni usa il resolver tramite la procedura tRPC protetta:

```text
segnalazioni.availableScope
```

## Fonti dati

| Concetto operativo | Tabella attuale | Note |
|---|---|---|
| Tenant | `companies.id` | boundary temporaneo ereditato dal Core Identity Context |
| Azienda | `companies` | usata come company dell'attore |
| Scope utente | `user_organization_scopes` | risolto dal Core Identity Context |
| Appalto / Commessa | `contracts` | filtrato per azienda cliente o sede collegata |
| Sede | `sites` | filtrata per azienda e stato attivo |
| Impianto | `microclimate_sites` | usato come sorgente reale temporanea per plant |
| Area | nessuna tabella affidabile | oggi restituisce lista vuota |

Le query escludono record inattivi:

- `contracts.active = true`;
- `contracts.status = "attivo"`;
- `sites.active = true`;
- `microclimate_sites.active = true`.

## Regole autorizzative

Il resolver usa solo lo scope gia' validato dell'attore:

- `tenantId`;
- `companyId`;
- `organizationalScope`;
- `assignedScopes`;
- `role`;
- `active`;
- `canAccessAllTenants`.

Le regole comuni sono:

- attore inattivo: nessuno scope disponibile;
- nessun cross-tenant;
- nessun cross-company;
- nessun record fuori dagli scope assegnati;
- nessun dato finanziario, personale o interno nei DTO;
- duplicati rimossi per id;
- output ordinato per nome.

Le differenze fra ruoli derivano dagli scope assegnati dal Core Identity Context:

| Ruolo | Effetto operativo |
|---|---|
| `admin`, `responsabile_sicurezza`, `sicurezza` | visibilita' sul perimetro company o sugli scope assegnati |
| `capo_area` | visibilita' limitata a sedi/appalti/impianti assegnati |
| `capo_impianto` | visibilita' limitata agli impianti e ai contesti collegati |
| `referente_commessa` | visibilita' limitata alle commesse e ai contesti collegati |
| `segnalatore`, `dipendente`, `operatore_sicurezza` | visibilita' limitata al proprio contesto operativo |

Il ruolo non viene mai letto dal payload client.

## Output API

La procedura `segnalazioni.availableScope` restituisce DTO minimali:

```ts
{
  contracts: Array<{ id: string; code: string; name: string; siteId?: string }>;
  sites: Array<{ id: string; name: string; contractId?: string }>;
  plants: Array<{ id: string; name: string; siteId?: string; contractId?: string }>;
  areas: Array<{ id: string; name: string; plantId?: string }>;
}
```

Non vengono restituiti tenant, company, ruoli, permessi, metadati interni o dati economici dell'appalto.

## Validazione create Segnalazione

`segnalazioni.create` valida lo scope operativo lato backend prima di creare la segnalazione.

Sono accettati solo gli id presenti nello scope accessibile dell'attore:

- `contractId`;
- `siteId`;
- `plantId`;
- `areaId`.

Il resolver rifiuta:

- appalti non accessibili;
- sedi non accessibili;
- impianti non accessibili;
- aree non disponibili;
- combinazioni incoerenti fra appalto, sede e impianto.

Se il client non invia una selezione, viene usato il perimetro base dell'attore:

```ts
{
  tenantId: actor.tenantId,
  companyId: actor.companyId
}
```

## Integrazione frontend

`SegnalatoreApp` carica i contesti con `useAvailableOperationalScope()` e mostra solo campi con dati reali:

- `Appalto / Commessa *`;
- `Sede`;
- `Impianto`;
- `Area`, oggi nascosta perche' non esiste una sorgente dati reale.

La UI gestisce:

- loading: `Caricamento contesti operativi...`;
- empty state: `Nessun appalto o impianto disponibile per il tuo profilo`;
- errore con retry: `Impossibile caricare i contesti operativi. Riprova.`;
- preselezione automatica quando esiste una sola opzione valida;
- selezione esplicita quando sono presenti piu' opzioni.

Il payload create invia solo gli id selezionati. Non invia tenant, company, ruolo o privilegi.

## Test

La copertura aggiunta include:

- test puri del resolver su ruoli e scope;
- blocco cross-tenant;
- esclusione record inattivi;
- deduplica;
- validazione appalto valido;
- blocco appalto fuori scope;
- blocco combinazioni appalto/sede incoerenti;
- DTO minimali esposti dalla API;
- stati frontend loading/empty/error;
- preselezione con una sola opzione;
- payload client senza tenant/company/role;
- integration test MySQL opt-in sul repository Drizzle reale.

## Debiti tecnici

- `companies.id` resta tenant boundary temporaneo.
- Plant usa `microclimate_sites`, non una tabella Core dedicata.
- Aree non disponibili nello schema attuale.
- Ruoli e assegnazioni scope derivano ancora dagli adapter legacy del Core Identity Context.
- Manca una matrice permessi completa per azione/modulo.
- Audit atomico, allegati reali, commenti e workflow operativo restano fuori da questo intervento.
