# LogosSafety — Master Workflow Architetturale

## 1. Scopo e valore vincolante

Questo documento definisce il flusso architetturale obbligatorio di
LogosSafety. Ogni funzionalità nuova o modificata deve rispettare la seguente
catena:

> **Utente → Autenticazione → Ruolo → Permessi → Scope organizzativo → Modulo → Operazione → Audit → Database**

L'interfaccia frontend non costituisce mai un controllo di sicurezza. Ogni
richiesta che legge o modifica dati deve essere autorizzata dal backend prima
di accedere al database.

Le parole **DEVE**, **NON DEVE** e **OBBLIGATORIO** indicano requisiti
architetturali non derogabili.

## 2. Principi generali

1. Ogni richiesta protetta DEVE essere associata a un utente autenticato.
2. Ogni utente DEVE avere un'identità persistita e un solo ruolo applicativo
   attivo.
3. Il ruolo determina quali operazioni sono ammesse.
4. Lo scope organizzativo determina su quali aziende, sedi e commesse
   l'operazione è ammessa.
5. Ruolo e scope DEVONO essere verificati insieme lato backend.
6. In assenza di una concessione esplicita, l'accesso DEVE essere negato.
7. Ogni operazione rilevante DEVE produrre un audit log.
8. Il database DEVE essere interrogato o modificato solo dopo il superamento
   di autenticazione, permessi e scope.
9. Il frontend DEVE mostrare esclusivamente azioni realmente disponibili.
10. Nessun pulsante può essere pubblicato senza un flusso funzionante
    frontend → API → database → feedback utente.

## 3. Flusso completo della richiesta

### 3.1 Utente

L'utente interagisce con LogosSafety tramite interfaccia web o chiamata API.
La richiesta iniziale non è considerata attendibile.

### 3.2 Autenticazione

Il backend DEVE:

1. leggere il cookie di sessione HTTP-only;
2. verificarne firma, scadenza, issuer, audience e versione;
3. estrarre l'identificativo stabile dell'utente;
4. cercare l'utente nel database;
5. verificare che l'utente esista e sia attivo;
6. associare l'identità verificata al contesto della richiesta.

Una sessione valida senza un utente attivo nel database NON è sufficiente.

### 3.3 Ruolo

Dal record utente viene ricavato il ruolo applicativo. Il ruolo non deve
essere accettato da parametri frontend, header modificabili dal client o
payload della richiesta.

### 3.4 Permessi

Il backend verifica che il ruolo possa:

- accedere al modulo;
- eseguire l'operazione richiesta;
- leggere la specifica classe di dati;
- modificare o eliminare la specifica entità;
- effettuare import o export.

### 3.5 Scope organizzativo

Dopo il controllo del ruolo, il backend verifica che l'entità richiesta
appartenga allo scope dell'utente.

Il controllo DEVE utilizzare dati risolti dal database. Non è sufficiente
confrontare valori `companyId`, `siteId` o `contractId` forniti dal client.

### 3.6 Modulo

Il router del modulo riceve una richiesta già autenticata, ma rimane
responsabile dei controlli di permesso e scope specifici dell'operazione.

### 3.7 Operazione

Le operazioni ammesse sono, secondo il modulo:

- visualizzazione elenco;
- visualizzazione dettaglio;
- inserimento singolo;
- modifica;
- eliminazione o disattivazione;
- import Excel;
- export Excel;
- download o apertura documenti;
- azioni operative specialistiche.

### 3.8 Audit

L'operazione autorizzata DEVE produrre un evento audit coerente con il tipo di
azione e con l'esito.

### 3.9 Database

Solo dopo i controlli precedenti il backend può eseguire la query. Le query di
elenco DEVONO incorporare lo scope; le query puntuali DEVONO impedire accessi
IDOR anche quando l'utente conosce l'ID di un record esterno al proprio scope.

## 4. Autenticazione

### 4.1 Login reale

Il login reale usa il provider OAuth configurato. Il callback backend DEVE:

1. validare codice e stato OAuth;
2. scambiare il codice con un access token;
3. verificare il token del provider;
4. acquisire il profilo utente;
5. creare o aggiornare l'utente locale;
6. creare una sessione applicativa firmata;
7. impostare il cookie di sessione HTTP-only;
8. eliminare eventuali cookie legacy.

### 4.2 Login di sviluppo

Il dev login:

- è ammesso solo in ambiente non production;
- DEVE essere abilitato esplicitamente tramite configurazione;
- DEVE usare identità definite lato server;
- NON DEVE accettare dalla query string ruolo o identità arbitrari;
- NON DEVE contenere password hardcodate;
- NON DEVE essere registrato tra le route production.

### 4.3 Logout

Il logout DEVE:

- richiedere una sessione autenticata;
- invalidare il cookie di sessione corrente;
- eliminare i cookie legacy;
- invalidare la cache client dell'utente;
- riportare l'interfaccia alla pagina di login.

### 4.4 Cookie di sessione

Il cookie DEVE essere:

- HTTP-only;
- limitato al path applicativo necessario;
- `SameSite=Lax` in locale;
- `SameSite=None` e `Secure` fuori da localhost quando richiesto;
- firmato e con scadenza definita;
- privo di dati clinici o dati applicativi sensibili in chiaro.

## 5. Identità utente

L'identità applicativa minima comprende:

- ID interno;
- identificativo stabile del provider o dell'ambiente dev;
- nome visualizzato;
- email;
- ruolo;
- stato attivo;
- ultimo accesso;
- date di creazione e aggiornamento.

`auth.me` è la fonte autorevole frontend per identità e ruolo. Nome, email e
ruolo visualizzati nella UI DEVONO derivare dalla risposta di `auth.me`, non da
valori statici o memorizzati manualmente nel browser.

## 6. Ruoli

### 6.1 `admin`

- Accesso globale a tutte le organizzazioni.
- Gestione configurazioni, utenti, dati e audit.
- Accesso ai dati sanitari secondo le policy applicative.
- Può eseguire operazioni amministrative e operative.

### 6.2 `responsabile_sicurezza`

- Accesso globale oppure limitato agli scope assegnati, in base alla policy
  organizzativa attiva.
- Gestione dei moduli di sicurezza.
- Accesso ai dati sanitari consentito esclusivamente nei limiti della policy
  vigente.
- Accesso ad audit e report di competenza.

### 6.3 `operatore_sicurezza`

- Accesso esclusivamente alle organizzazioni assegnate.
- Gestione operativa di lavoratori, formazione, scadenze e documenti ordinari.
- Nessun accesso ai dettagli clinici completi.

### 6.4 `medico_competente`

- Accesso esclusivamente alle organizzazioni assegnate, salvo configurazione
  globale esplicita.
- Lettura e modifica dei dati clinici autorizzati.
- Accesso ai documenti sanitari.
- Nessun accesso implicito alle configurazioni amministrative non sanitarie.

### 6.5 `referente_commessa`

- Accesso alle sole commesse assegnate e ai dati organizzativi correlati.
- Nessun accesso a dati clinici completi.
- Operazioni limitate alle responsabilità della commessa.

### 6.6 `auditor`

- Accesso in lettura agli scope assegnati.
- Accesso ai dati e agli audit necessari alla verifica.
- Nessuna modifica salvo operazioni espressamente previste dal processo di
  audit.
- Nessun accesso automatico a dati clinici o documenti d'identità.

### 6.7 `sola_lettura`

- Accesso in sola lettura agli scope assegnati.
- Nessuna operazione di creazione, modifica, eliminazione o import.
- Export consentito solo quando previsto dalla policy del modulo.
- Nessun accesso automatico a dati sensibili.

## 7. Permessi

I permessi DEVONO essere verificati nel backend per ogni endpoint.

Le verifiche frontend servono esclusivamente a:

- nascondere azioni non disponibili;
- disabilitare controlli;
- migliorare l'esperienza utente.

Non sono controlli di sicurezza.

Ogni endpoint DEVE specificare almeno:

- ruoli ammessi;
- operazioni ammesse;
- classi di dati accessibili;
- scope richiesto;
- evento audit prodotto.

## 8. Scope organizzativo

### 8.1 Scope azienda

Uno scope azienda concede accesso ai dati dell'azienda e, secondo la policy
del modulo, alle relative sedi e commesse.

### 8.2 Scope sede

Uno scope sede concede accesso alla sola sede assegnata e alle entità
direttamente collegate. Non concede accesso alle altre sedi della stessa
azienda.

### 8.3 Scope commessa

Uno scope commessa concede accesso alla sola commessa assegnata e alle entità
collegate. Non concede accesso alle altre commesse della stessa azienda o
sede.

### 8.4 Regole di coerenza

- Una sede DEVE appartenere all'azienda dichiarata.
- Una commessa DEVE essere risolta dal database con azienda e sede effettive.
- Un lavoratore DEVE essere controllato usando i suoi riferimenti reali ad
  azienda, sede e commessa.
- Le entità indirette, come visite, attestati, alert e documenti, DEVONO
  ereditare lo scope dall'entità organizzativa principale.
- Gli ID forniti dal client non possono ampliare lo scope.

## 9. Default deny

La policy è **default deny**.

Per ogni ruolo non globale:

- nessuno scope assegnato = nessun dato organizzativo accessibile;
- scope non risolvibile = accesso negato;
- entità senza collegamento organizzativo determinabile = accesso negato;
- permesso non dichiarato = operazione negata;
- conflitto tra ruolo e scope = prevale il diniego;
- errore durante la verifica = accesso negato.

Il sistema NON DEVE usare fallback permissivi.

## 10. Contratto obbligatorio dei moduli

Ogni modulo deve offrire funzionalità reali e complete. La presenza di un
pulsante o di una voce menu implica l'esistenza del relativo flusso backend.

| Modulo | Inserimento singolo | Modifica | Import Excel dedicato | Export Excel dedicato | Template Excel dedicato |
|---|---:|---:|---:|---:|---:|
| Dashboard | N/A per dati aggregati | Configurazioni previste | Se applicabile | Obbligatorio per report | Se applicabile |
| Impostazioni / Aziende / Sedi | Obbligatorio | Obbligatorio | Obbligatorio | Obbligatorio | Obbligatorio |
| Dipendenti | Obbligatorio | Obbligatorio | Obbligatorio | Obbligatorio | Obbligatorio |
| Mansioni | Obbligatorio | Obbligatorio | Obbligatorio | Obbligatorio | Obbligatorio |
| Formazione | Obbligatorio | Obbligatorio | Obbligatorio | Obbligatorio | Obbligatorio |
| Sorveglianza sanitaria | Obbligatorio | Obbligatorio | Obbligatorio e riservato | Obbligatorio e riservato | Obbligatorio |
| Documenti | Upload singolo obbligatorio | Metadati/versione obbligatori | Se previsto dal formato | Obbligatorio per metadati autorizzati | Se applicabile |
| Scadenziario | Inserimento tramite entità origine | Gestione stato prevista | Se applicabile | Obbligatorio | Se applicabile |
| Microclima | Obbligatorio | Obbligatorio | Obbligatorio per rilevazioni | Obbligatorio | Obbligatorio |

“Dedicato” significa che colonne, validazioni, permessi, scope e audit sono
specifici dell'entità. Non è sufficiente un import/export generico non
tipizzato.

## 11. Workflow per modulo

### 11.1 Dashboard

- Mostra esclusivamente aggregati relativi agli scope accessibili.
- Ogni contatore DEVE derivare da query backend scoped.
- Drill-down e collegamenti DEVONO mantenere lo stesso scope.
- L'export DEVE contenere solo dati autorizzati.

### 11.2 Impostazioni / Aziende / Sedi

- Inserimento e modifica richiedono permessi amministrativi.
- La selezione di una sede DEVE essere subordinata all'azienda.
- Import, export e template DEVONO mantenere la relazione azienda-sede.
- Un utente scoped non può visualizzare o modificare organizzazioni esterne.

### 11.3 Dipendenti

- Il form singolo DEVE usare aziende, sedi, commesse e mansioni autorizzate.
- Creazione e modifica DEVONO validare i riferimenti lato backend.
- Elenco, dettaglio, import ed export DEVONO applicare gli scope.
- L'accesso tramite ID a un lavoratore esterno DEVE essere negato.

### 11.4 Mansioni

- CRUD, import, export e template sono obbligatori.
- Rischi, formazione richiesta e sorveglianza sanitaria associati alla
  mansione DEVONO essere validati.
- Le mansioni globali e quelle organizzative DEVONO essere distinte dalla
  policy del dominio.

### 11.5 Formazione

- Corsi e attestati DEVONO essere gestiti tramite flussi reali.
- Gli attestati ereditano lo scope dal lavoratore.
- Import ed export DEVONO evitare dati di lavoratori fuori scope.
- Allegati e documenti formativi seguono anche le regole documentali.

### 11.6 Sorveglianza sanitaria

- Flussi operativi e clinici DEVONO restare separati.
- I ruoli operativi ricevono esclusivamente DTO ridotti.
- I dettagli clinici sono accessibili solo ai ruoli autorizzati.
- Visite e documenti sanitari ereditano lo scope dal lavoratore.
- Letture, modifiche, import, export e download clinici DEVONO essere
  sottoposti ad audit.

### 11.7 Documenti

- Gli elenchi restituiscono solo metadati autorizzati.
- Contenuto, URL o base64 NON DEVONO essere inclusi nelle liste.
- Apertura e download usano endpoint dedicati.
- Ogni accesso al contenuto verifica ruolo, classe documentale e scope.
- Documenti sanitari e d'identità hanno policy più restrittive.

### 11.8 Scadenziario

- Aggrega solo scadenze appartenenti agli scope autorizzati.
- Ogni scadenza deve essere riconducibile all'entità origine.
- Risoluzione o modifica dello stato richiedono controllo backend e audit.
- L'export deve rispettare gli stessi filtri dell'elenco.

### 11.9 Microclima

- Siti, rilevazioni e alert DEVONO essere scoped per azienda e sede.
- Inserimento, modifica, import ed export richiedono permessi espliciti.
- Alert e notifiche ereditano lo scope del sito microclimatico.
- I report devono essere riproducibili e tracciati.

## 12. Import Excel

Ogni import DEVE:

1. usare un endpoint dedicato all'entità;
2. validare struttura, colonne obbligatorie e tipi;
3. validare riferimenti organizzativi;
4. verificare ruolo e scope per ogni riga;
5. definire la gestione dei duplicati;
6. non eseguire aggiornamenti fuori scope;
7. restituire esito per riga;
8. produrre audit con quantità importate, aggiornate, ignorate ed errate.

Il template dedicato DEVE corrispondere esattamente alle colonne accettate.

## 13. Export Excel

Ogni export DEVE:

1. essere generato da dati ottenuti dal backend;
2. applicare ruolo, permessi e scope;
3. contenere colonne specifiche dell'entità;
4. escludere campi sensibili non autorizzati;
5. rispettare i filtri attivi dichiarati;
6. produrre un audit;
7. mostrare loading, successo ed errore nel frontend.

## 14. Audit log

L'audit log DEVE registrare, quando applicabile:

- utente e ruolo;
- azione;
- modulo;
- tipo e ID entità;
- nome leggibile dell'entità;
- data e ora;
- valore precedente e nuovo valore per modifiche rilevanti;
- motivazione;
- esito;
- contesto organizzativo;
- apertura e download di documenti sensibili;
- consultazione e modifica di dati clinici;
- import ed export.

Azioni minime:

- `create`;
- `update`;
- `delete`;
- `view`;
- `upload`;
- `download`;
- `import`;
- `export`;
- `login`;
- `logout`;
- `approve`;
- `reject`.

L'audit non sostituisce i controlli di sicurezza e non deve contenere il
contenuto integrale di documenti, password, token o altri segreti.

## 15. Nessun pulsante finto

Un pulsante è considerato reale solo quando:

1. è collegato a un handler;
2. apre un form o avvia l'azione dichiarata;
3. chiama una API reale;
4. l'API esegue controlli backend;
5. l'operazione legge o modifica dati reali;
6. loading, errore e successo sono gestiti;
7. la UI viene aggiornata dopo il successo;
8. l'azione è sottoposta ad audit quando richiesto.

Placeholder, commenti “non implementato”, handler vuoti e toast che simulano
il successo NON sono ammessi nelle funzionalità esposte.

## 16. Permessi sempre lato backend

È vietato affidare la sicurezza a:

- visibilità del pulsante;
- stato disabilitato del controllo;
- route frontend;
- menu nascosti;
- valori presenti in local storage;
- ruolo inviato dal client;
- `companyId`, `siteId` o `contractId` non verificati;
- filtri applicati solo dopo aver restituito i dati al browser.

Il backend DEVE negare direttamente la richiesta non autorizzata con un errore
coerente e senza rivelare l'esistenza di dati fuori scope.

## 17. Sequenza obbligatoria di implementazione

Per ogni operazione:

1. definire ruoli autorizzati;
2. definire scope richiesto;
3. definire DTO di input e output;
4. implementare controllo backend;
5. implementare query scoped;
6. implementare audit;
7. implementare UI reale;
8. implementare loading, errori e successo;
9. aggiungere test RBAC e IDOR;
10. eseguire lint, check, build, test e audit dipendenze;
11. aggiornare documentazione e backlog.

## 18. Criterio di completamento

Un modulo non è completato finché non dispone, quando applicabile, di:

- CRUD completo;
- inserimento singolo reale;
- modifica reale;
- import Excel dedicato;
- export Excel dedicato;
- template Excel dedicato;
- audit log;
- permessi backend;
- scope organizzativo backend;
- test RBAC e IDOR;
- gestione loading, errore e successo;
- frontend responsive;
- TypeScript senza errori;
- lint, check, build e test verdi;
- documentazione aggiornata.

