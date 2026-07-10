# Core Domain LogosSafety

## Obiettivo

Il Core Domain definisce il linguaggio condiviso per identita, organizzazioni, perimetri operativi, ruoli e permessi dei moduli LogosSafety.

Questo sprint introduce solo TypeScript puro. Non collega database, API, Hono, tRPC, React, autenticazione o UI.

## Modello concettuale

Il dominio e tenant-bound:

Tenant -> Organization -> Site -> Contract / Commessa -> Plant -> Area

Person rappresenta il soggetto reale.
UserAccount rappresenta l'accesso applicativo.
Membership collega Person e Organization.
RoleAssignment collega un ruolo a Person o UserAccount sempre dentro un OrganizationalScope.

## Entita

### Tenant

Confine SaaS principale. Ogni record operativo e ogni decisione autorizzativa devono appartenere a un tenant.

### Organization

Astrazione futura di `companies`.

Copre:

- societa del gruppo;
- cliente;
- fornitore;
- cooperativa;
- subappaltatore;
- altra organizzazione gestita.

Supporta `parentOrganizationId` per gerarchie organizzative.

### Person

Soggetto reale. Contiene solo dati minimi:

- nome;
- cognome;
- codice fiscale opzionale;
- email opzionale;
- telefono opzionale.

Non contiene dati sanitari.

### UserAccount

Accesso applicativo collegato a una Person.

Non contiene password, token, refresh token o secret OAuth.

### Membership

Relazione tra Person e Organization.

Supporta dipendente, collaboratore, consulente, esterno autorizzato, cliente e fornitore.

### Role e Permission

Ruoli e permessi sono separati.

I ruoli includono il set richiesto per i moduli futuri e i ruoli legacy gia presenti nello schema `users.role`, cosi da evitare breaking change immediati.

I permessi sono stringhe di dominio e non implementano ancora un RBAC completo.

### RoleAssignment

Associa un ruolo a una Person o UserAccount dentro un perimetro esplicito.

Un ruolo senza `organizationalScope` non e valido.

### OrganizationalScope

Rappresenta il perimetro autorizzativo tenant-bound:

- organizationIds;
- siteIds;
- contractIds;
- plantIds;
- areaIds;
- allOrganizations;
- allSites;
- allContracts;
- allPlants;
- allAreas.

Gli `all*` non sono globali: valgono solo dentro `tenantId` e dovranno essere costruiti esclusivamente lato backend.

## Analisi schema esistente

Entita gia presenti:

- `users`: account OAuth/Kimi con `unionId`, `name`, `email`, `role`, `active`, `lastSignInAt`;
- `companies`: anagrafica aziendale oggi usata come organizzazione;
- `sites`: sedi operative legate a `companyId`;
- `contracts`: appalti/commesse legati opzionalmente a `clientCompanyId` e `siteId`;
- `workers`: anagrafica lavoratori, oggi contiene anche dati personali e rapporto lavorativo;
- `user_organization_scopes`: perimetri utente su company/site/contract;
- `departments`: reparti;
- `job_roles`: mansioni operative, da non confondere con ruoli applicativi;
- `segnalazioni`: gia usa `tenant_id`, `company_id`, `plant_id`, `area_id` come stringhe di dominio.

Entita non presenti come core condiviso:

- `tenants`;
- `persons`;
- `memberships`;
- `role_assignments`;
- `permissions`;
- `plants`;
- `areas`.

## Duplicazioni e incoerenze

- `workers` contiene dati che nel core futuro appartengono a `Person` e `Membership`.
- `users` rappresenta l'account, ma non ha `personId`.
- `companies` copre solo parte del concetto futuro di `Organization`.
- `users.role` e un singolo enum legacy; il core prevede assignment multipli e scoping esplicito.
- `user_organization_scopes` usa ID numerici legacy e copre solo company/site/contract.
- Segnalazioni usa `DomainId` stringa, mentre molte tabelle legacy usano `serial/bigint`.
- `plant` e `area` esistono oggi solo nel dominio Segnalazioni, non come tabelle core.
- `medico_competente`, `auditor` e `sola_lettura` esistono nel DB ma non erano nel set iniziale del nuovo core; sono mantenuti per compatibilita.

## Confini

Il Core Domain non deve:

- leggere o scrivere database;
- applicare migrazioni;
- gestire sessioni o OAuth;
- esporre endpoint;
- importare React;
- dipendere da Drizzle, Hono o tRPC.

Il contesto autorizzativo definitivo deve essere costruito lato backend da dati affidabili.

## Validazioni pure

Sono state definite validazioni per:

- `validatePerson`;
- `validateUserAccount`;
- `validateOrganization`;
- `validateMembership`;
- `validateRoleAssignment`;
- `validateOrganizationalScope`.

Regole principali:

- nessun account senza persona;
- nessun ruolo senza perimetro;
- nessun accesso cross-tenant;
- persona e organizzazione devono appartenere allo stesso tenant;
- assignment scaduto o inattivo non valido;
- persona inattiva non puo operare;
- account bloccato non puo operare.

## Strategia integrazione con Segnalazioni

Tipi duplicati che potranno essere sostituiti:

- `SegnalazioniRole` -> `Role`;
- `Reporter` / `SegnalazioniActor` -> composizione di `Person`, `UserAccount`, `Membership`, `RoleAssignment`;
- `ReporterSnapshot` -> snapshot derivata da `Person` e `RoleAssignment`;
- `OrganizationalScope` Segnalazioni -> `core/domain/OrganizationalScope`.

File coinvolti in sprint futuri:

- `app/src/modules/segnalazioni/domain/Reporter.ts`;
- `app/src/modules/segnalazioni/domain/OrganizationalScope.ts`;
- `app/src/modules/segnalazioni/domain/Visibility.ts`;
- `app/src/modules/segnalazioni/domain/Validation.ts`;
- `app/src/modules/segnalazioni/application/types.ts`;
- `app/src/modules/segnalazioni/infrastructure/persistence/mappers.ts`.

Strategia consigliata:

1. Introdurre adapter di compatibilita tra tipi Segnalazioni e Core.
2. Migrare prima le policy pure usando il Core Domain.
3. Conservare alias temporanei nel modulo Segnalazioni.
4. Adeguare mapper e repository solo dopo test su DB reale.
5. Rimuovere duplicazioni quando API e auth produrranno un `ApplicationActor` costruito dal backend.

## Rischi

- Migrazione ID: il DB legacy usa numerici, il Core Domain usa `DomainId` stringa.
- Auth: `users` non ha ancora `personId`, quindi serve mapping controllato.
- Scope: lo scope legacy non copre plant/area.
- Ruoli: i ruoli legacy e quelli futuri non sono ancora normalizzati.
- Tenant: manca una tabella tenant persistente.
- Persone: dati personali oggi duplicati tra `users` e `workers`.

## Decisioni aperte

- Definire se `Tenant` diventera tabella persistente dedicata o derivata da configurazione SaaS.
- Decidere mapping definitivo `users.id` -> `UserAccount.id`.
- Decidere mapping definitivo `workers.id` -> `Person` / `Membership`.
- Definire tabelle o adapter per `Plant` e `Area`.
- Definire matrice RBAC completa ruolo-permesso.
- Definire formato ID canonico tra legacy numerico e domain string.
