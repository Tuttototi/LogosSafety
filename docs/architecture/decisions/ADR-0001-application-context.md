# ADR-0001: Application Context e confini dei moduli LogosSafety

## Stato

Accepted

## Contesto

LogosSafety sta evolvendo da applicazione React/TypeScript con router backend e schema Drizzle condiviso verso un prodotto SaaS modulare.

Il Core Domain e gia stato definito e include tenant, organizzazioni, persone, account, membership, ruoli, permessi, role assignment, scope organizzativi, sedi, contratti, impianti e aree.

Il modulo Segnalazioni possiede gia Domain Layer, Application Layer, Infrastructure Layer e UI React. Altri moduli esistono in forma di router, pagine, tabelle o funzionalita legacy.

Serve una decisione esplicita per evitare dipendenze circolari, accesso diretto alle tabelle altrui e accoppiamento tra business logic, audit, notifiche e reporting.

## Decisione

1. Il Core Domain e la dipendenza condivisa per tutti i moduli.
2. Il Core non dipende da moduli funzionali.
3. I moduli funzionali restano indipendenti e possiedono i propri dati.
4. Nessun modulo funzionale accede direttamente a repository, mapper o tabelle private di un altro modulo.
5. L'integrazione tra moduli avviene tramite port, eventi, contratti applicativi o API interne esplicite.
6. Audit Log e Notifiche sono consumer di eventi, non dipendenze concrete incorporate nella business logic.
7. Dashboard/Reporting usa read model o query dedicate e non duplica regole di dominio.
8. Comunicazioni Sicurezza resta separato da Segnalazioni.
9. Sorveglianza Sanitaria mantiene confini GDPR piu restrittivi.
10. Il backend applicativo target e unico: LogosSafety.
11. Nessun backend PHP legacy viene considerato dipendenza architetturale futura.

## Alternative considerate

### Modulo monolitico unico

Scartato perche aumenta accoppiamento, rende difficile isolare GDPR e impedisce ownership chiara dei dati.

### Accesso diretto alle tabelle tra moduli

Scartato perche crea dipendenze implicite, rompe i confini e rende rischioso evolvere schema e policy.

### Audit e Notifiche chiamati direttamente da ogni use case

Scartato come modello dominante. Sono ammessi port astratti temporanei, ma la direzione architetturale e evento/consumer.

### Comunicazioni dentro Segnalazioni

Scartato. Le Comunicazioni Sicurezza condividono utenti, scope, allegati, audit e notifiche, ma hanno lifecycle e ownership distinti.

### Backend PHP legacy come modulo operativo

Scartato. Il backend unico target e LogosSafety.

## Conseguenze

- Ogni nuovo modulo deve dichiarare dati posseduti, eventi pubblicati, eventi consumati e dipendenze consentite.
- I router esistenti dovranno migrare gradualmente verso use case e port.
- Il Core Domain diventera il punto di convergenza per identita, ruoli e scope.
- I moduli dovranno usare contratti condivisi minimi per eventi e riferimenti entita.
- I read model diventeranno il canale preferito per dashboard, scadenze e reporting.

## Rischi

- Migrazione graduale con duplicazione temporanea di tipi tra Core e Segnalazioni.
- ID legacy numerici da mappare verso `DomainId` stringa.
- Possibile accoppiamento residuo nei router API esistenti che importano direttamente `@db/schema`.
- Necessita di disciplinare payload eventi per evitare esposizione di dati clinici.
- Mancanza attuale di event bus/outbox.

## Follow-up

- Definire adapter legacy per Core Domain.
- Definire matrice RBAC ruolo-permesso.
- Introdurre outbox/event bus interno.
- Migrare router esistenti verso application layer e port.
- Creare read model per dashboard, scadenze e notifiche.
