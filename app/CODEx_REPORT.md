**Cosa ho modificato**

- **Aggiunto handler di login di sviluppo:** ho creato un handler che permette di autenticarsi in ambiente di sviluppo senza passare per Kimi OAuth. Questo evita il fallimento immediato dovuto a URL OAuth vuoti e accelera il testing locale.
- **Registrata route dev-only:** ho registrato una route dev `GET /api/dev/login` che usa l'handler sopra solo quando `NODE_ENV !== 'production'`.

**File toccati**

- **Modificato:** [api/kimi/auth.ts](api/kimi/auth.ts)
- **Modificato:** [api/boot.ts](api/boot.ts)

**Dettaglio delle modifiche**

- In `api/kimi/auth.ts` ho aggiunto `createDevLoginHandler()` che:
  - crea/aggiorna un utente di test (`upsertUser`),
  - firma un token di sessione con `signSessionToken`,
  - imposta il cookie di sessione `kimi_sid` e reindirizza a `/`.
- In `api/boot.ts` ho importato e registrato la route dev-only:
  - `app.get("/api/dev/login", createDevLoginHandler());` (solo in dev).

**Errori rimasti / rischi conosciuti**

- **Creazione JWKS a livello di modulo:** in `api/kimi/auth.ts` la variabile `jwks = jose.createRemoteJWKSet(new URL(`${env.kimiAuthUrl}/api/.well-known/jwks.json`))` viene costruita al caricamento del modulo. Se `KIMI_AUTH_URL` è vuota, questo genera ancora `Invalid URL` — benché la route dev aggiri il flusso OAuth, il problema si presenta all'import del modulo. Raccomando di rendere la creazione di `jwks` lazy o condizionata a `env.kimiAuthUrl`.
- **Variabili di ambiente non impostate:** per funzionare correttamente in produzione servono `KIMI_AUTH_URL`, `KIMI_OPEN_URL`, `APP_ID`, `APP_SECRET` e `DATABASE_URL`. In dev è possibile lavorare senza le prime impostando il dev-login, ma `DATABASE_URL` e `APP_SECRET` dovrebbero comunque essere configurati per evitare comportamenti imprevisti.
- **APP_SECRET mancante in dev:** `signSessionToken` usa `env.appSecret`. Se `APP_SECRET` è vuoto, la firma JWT è possibile ma insicura; consiglio di impostare un valore forte anche in `.env` locale.
- **Migrazioni/seed non eseguiti:** il DB deve essere migrato e seedato per l'import/export Excel funzionino correttamente.
- **Permessi utente per import:** il dev-login crea un utente ma potrebbe non impostare ruoli/permessi admin necessari per certe azioni. Potrebbe essere utile assegnare ruoli di test nell'upsert oppure avere un flag che promuove l'utente a admin in dev.

**Comandi suggeriti / eseguiti**

- Patches applicate tramite editor (modifiche ai file sopra). Non ho eseguito comandi shell nel tuo ambiente; qui le istruzioni consigliate da eseguire localmente:

```bash
# Avvia MySQL in Docker (esempio)
docker run --name logos-db -e MYSQL_ROOT_PASSWORD=secret -e MYSQL_DATABASE=logos_safety -p 3306:3306 -d mysql:8.0

# Imposta .env (esempio)
# Apri app/.env e imposta:
# DATABASE_URL=mysql://root:secret@localhost:3306/logos_safety
# APP_SECRET=una-stringa-lunga-e-segreta

# Esegui le migrazioni (drizzle)
npm run db:migrate

# Esegui seed (TypeScript)
# se necessario: npm i -D ts-node
npx ts-node db/seed.ts

# Avvia l'app in dev
npm run dev

# Test rapido dev-login (browser o curl)
# Browser: http://localhost:3000/api/dev/login?unionId=dev1&name=Dev%20User
curl -i "http://localhost:3000/api/dev/login?unionId=dev1&name=Dev%20User"
```

**Prossimo passo consigliato**

- 1. Applicare una patch rapida per rendere la creazione di `jwks` lazy/condizionata: spostare `createRemoteJWKSet` dentro `verifyAccessToken` o creare solo se `env.kimiAuthUrl` è non vuota. Questo rimuove l'errore `Invalid URL` a import-time.
- 2. Mettere su MySQL (Docker) e aggiornare `app/.env` con `DATABASE_URL` e `APP_SECRET` come mostrato sopra.
- 3. Eseguire `npm run db:migrate` e `npx ts-node db/seed.ts` per popolare il DB.
- 4. Testare import/export dalla UI: genera template, compila, carica e verifica i risultati. Controlla la console di Vite per eventuali errori backend.
- 5. (Opzionale) Aggiungere un pulsante/dev-toggle nel frontend (`src/pages/Login.tsx`) che punta a `/api/dev/login` quando `import.meta.env.MODE !== 'production'` oppure usare una variabile `VITE_DEV_AUTH_ENABLED` per controllare la visibilità.

Se vuoi, procedo subito con la patch suggerita per rendere la creazione di `jwks` lazy (fix critico per evitare l'errore `Invalid URL` quando `KIMI_AUTH_URL` non è impostata).
