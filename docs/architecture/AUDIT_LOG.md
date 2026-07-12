# Audit Log LogosSafety

## Scopo

L'Audit Log persistente registra eventi tecnici e di compliance prodotti dai moduli applicativi.
Non sostituisce la timeline operativa dei moduli e non diventa fonte di verita' business.

## Tabella

Tabella Drizzle/MySQL:

```text
audit_log_entries
```

Campi principali:

- `id`;
- `tenant_id`;
- `company_id`;
- `event_type`;
- `module`;
- `action`;
- `entity_type`;
- `entity_id`;
- `actor_user_id`;
- `actor_person_id`;
- `actor_role`;
- `occurred_at`;
- `correlation_id`;
- `metadata`;
- `created_at`.

Indici:

- `tenant_id + occurred_at`;
- `tenant_id + module + entity_type + entity_id`;
- `correlation_id`;
- `actor_user_id`.

## Regole

- Append-only: il repository espone solo append e query.
- Tenant-safe: ogni query richiede `tenantId`.
- Metadata minimali e sanitizzati.
- Nessun testo completo di commenti, note, descrizioni o risoluzioni.
- Nessun secret, token, cookie, session ID, stack trace, payload HTTP grezzo o contenuto binario.
- `commentId` e transizioni stato sono ammessi come riferimenti minimali.

## Query applicative

Repository:

- `listByEntity`;
- `listByActor`;
- `listByCorrelationId`.

Non esiste ancora una pagina admin dedicata per `audit_log_entries`.
Il router `/audit` attuale resta basato sulla tabella legacy `audit_logs`.

## Segnalazioni

Gli eventi Segnalazioni sono registrati tramite `SegnalazioniAuditPort`.
Il port riceve `ApplicationEvent`, calcola il mapping audit, sanitizza metadata e persiste su `audit_log_entries`.

Audit obbligatorio:

- creazione;
- presa in carico;
- commento;
- richiesta integrazione;
- integrazione;
- cambio stato;
- risoluzione;
- chiusura;
- presa visione.

## Retention

La retention non e' implementata in questo sprint.
Audit append-only non implica retention infinita: la policy dovra' essere definita separatamente.
