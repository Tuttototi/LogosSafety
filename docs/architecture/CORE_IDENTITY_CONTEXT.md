# Core Identity Context

## Obiettivo

Il Core Identity Context e' il boundary backend che trasforma la sessione autenticata LogosSafety in un `ActorContext` applicativo affidabile.

Il client non puo' determinare tenant, azienda, persona, ruolo, scope o privilegi globali. Ogni modulo deve ricevere identita' e scope da questo servizio o da adapter che lo usano.

## Flusso

```text
sessione Kimi
  -> users
  -> workers come adapter legacy Person
  -> companies come adapter legacy Organization e tenant boundary
  -> users.role come adapter legacy RoleAssignment
  -> user_organization_scopes come adapter legacy OrganizationalScope
  -> ActorContext condiviso
```

## Dati risolti

Il servizio `CoreIdentityService` riceve solo l'utente autenticato backend (`ctx.user`) e carica dal database:

- account utente da `users`;
- persona da `workers`, collegata temporaneamente tramite email utente/lavoratore;
- azienda da `companies`;
- ruolo effettivo da `users.role`;
- scope espliciti da `user_organization_scopes`;
- sede e commessa di supporto da `sites` e `contracts`.

Il risultato e' il contratto condiviso:

```ts
ActorContext
```

con:

- `tenantId`;
- `companyId`;
- `userId`;
- `personId`;
- `role` e `roles`;
- `active`;
- `organizationalScope` aggregato;
- `scopes` assegnati;
- `permissions`;
- `canAccessAllTenants`;
- dati display minimali.

## Adapter legacy

Lo schema attuale non ha ancora tabelle Core dedicate per:

- `persons`;
- `memberships`;
- `role_assignments`;
- `tenants`;
- `plants`;
- `areas`.

Gli adapter temporanei sono isolati nel backend:

| Concetto Core | Adapter attuale |
|---|---|
| Person | `workers` collegato via email |
| UserAccount | `users` |
| Organization | `companies` |
| Tenant | `company.id` come boundary temporaneo |
| RoleAssignment | `users.role` |
| OrganizationalScope | `user_organization_scopes`, fallback controllato da worker/role |
| Plant/Area | non disponibili, array vuoti |

Il fallback di scope e' esplicito:

- ruoli gestori (`admin`, `responsabile_sicurezza`) senza righe scope ricevono scope aziendale;
- altri ruoli senza righe scope ricevono scope limitato ai dati del worker (`siteId`/`contractId`) quando disponibili;
- `canAccessAllTenants` resta sempre `false`.

## Regole di sicurezza

Il servizio blocca:

- assenza di utente autenticato;
- account inesistente;
- account inattivo;
- persona/lavoratore assente;
- persona/lavoratore inattivo, cancellato o non `attivo`;
- azienda assente o inattiva;
- ruolo sconosciuto;
- scope cross-company;
- scope duplicati;
- scope sede/commessa incoerenti;
- errori repository non tipizzati, convertiti in errore configurazione sanitizzato.

I codici errore tipizzati sono:

- `IDENTITY_NOT_FOUND`;
- `ACCOUNT_INACTIVE`;
- `ACCOUNT_LOCKED`;
- `PERSON_NOT_LINKED`;
- `COMPANY_NOT_LINKED`;
- `INVALID_ROLE`;
- `INVALID_SCOPE`;
- `CROSS_TENANT_SCOPE`;
- `IDENTITY_CONFIGURATION_ERROR`.

## Integrazione Segnalazioni

`app/api/segnalazioni/actor.ts` usa `CoreIdentityService` e `toSegnalazioniActor()`.

Le procedure pubbliche tRPC restano invariate:

- `segnalazioni.create`;
- `segnalazioni.list`;
- `segnalazioni.byId`.

Il mapping verso il dominio Segnalazioni converte:

- `ActorContext.tenantId` -> `ApplicationActor.tenantId`;
- `ActorContext.companyId` -> `ApplicationActor.companyId`;
- `ActorContext.role` -> `SegnalazioniRole`;
- `ActorContext.scopes` -> scope Segnalazioni assegnati.

## Limiti attuali

- Il collegamento utente/persona usa email `users.email = workers.email`; serve una FK esplicita futura.
- `company.id` e' tenant boundary temporaneo, non un tenant SaaS esplicito.
- Ruoli e permessi derivano ancora da `users.role`, non da `role_assignments`.
- Membership e role assignment sono costruiti in memoria come adapter, non persistiti.
- Plant e area non sono ancora disponibili nello schema legacy.
- Audit e Notifiche consumano ancora port differiti nei moduli non migrati.

## Migrazione futura

Passi consigliati:

1. introdurre tabelle `tenants`, `persons`, `memberships`, `role_assignments`;
2. aggiungere FK esplicita `users.person_id`;
3. migrare `workers` verso `persons` e membership aziendale;
4. migrare `user_organization_scopes` verso scope Core normalizzati;
5. sostituire `users.role` con assegnazioni ruolo scoped;
6. introdurre `plants` e `areas` quando il modello operativo sara' definito;
7. mantenere `CoreIdentityService` come unico punto di risoluzione attore per tutti i moduli.

