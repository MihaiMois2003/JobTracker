# Ledger

Jurnal personal pentru căutarea de job. Lipești linkul unui anunț, iar detaliile se completează singure. Tu alegi statusul și scrii notițele.

React + Vite + TypeScript, Firebase (Auth Google, Firestore, Storage, Cloud Functions v2, Hosting), interfață în română și engleză.

## Structura

```
src/
  app/          shell, router, navigare, paleta de comenzi, scurtături
  components/   componente de bază scrise de la zero (Button, Dialog, Field, Menu…)
  features/     ecranele: add, applications, auth, calendar, cvs, job, jobs, settings, stats, today
  i18n/         ro.ts (sursa cheilor), en.ts
  lib/          firebase, date, bani, utilitare
  styles/       tokens (culori, tipografie, spațiere) și stiluri de bază
functions/src/
  extract/      JSON-LD, curățare HTML, Claude (Haiku), pipeline
  lib/          fetch sigur (SSRF), URL-uri, cache și limita zilnică
  config.ts     limite și setări ale extragerii
```

## Rulare locală

1. `npm install` și `npm --prefix functions install`
2. Copiază `.env.example` în `.env` și completează valorile `VITE_FIREBASE_*` din consola Firebase (Project settings → Your apps).
3. `npm run dev`. Aplicația pornește pe http://localhost:5173 și folosește proiectul Firebase real.

### Cu emulatoarele Firebase (fără date reale)

```bash
npm --prefix functions run build
firebase emulators:start --only auth,firestore,functions,storage
# în alt terminal:
VITE_USE_EMULATORS=1 npm run dev        # PowerShell: $env:VITE_USE_EMULATORS='1'; npm run dev
```

Emulatorul de Functions citește secretul `ANTHROPIC_API_KEY` din Secret Manager (ai nevoie de `firebase login`). Ca alternativă, îl poți pune în `functions/.secret.local`, fișier ignorat de git. Firestore rulează pe portul 8085, iar Storage pe 9199.

### Testarea extragerii direct, pe URL-uri reale

```bash
cd functions
npm run build
node scripts/try-extract.js https://jobs.lever.co/... https://job-boards.greenhouse.io/...
```

Fără `ANTHROPIC_API_KEY` în mediu se folosește doar JSON-LD.

## CV-uri și Firebase Storage

CV-urile (PDF) stau în Firebase Storage, la `users/{uid}/cvs/{cvId}/{versionId}.pdf`. Metadatele sunt în Firestore: `users/{uid}/cvs/{cvId}` (nume, limbă, descriere, implicit, arhivat) și subcolecția `versions/{versionId}` (număr, nume fișier, mărime, cale, notă, dată). Pe joburi se salvează doar legătura (`cvId`, `cvVersionId`) și eticheta din momentul alegerii (`cvLabelSnapshot`, de ex. „Frontend · v3 · RO”). Câmpul vechi `cvVersion` (text liber) rămâne neatins.

- **Limita e 5 MB pe fișier, doar PDF.** Se verifică în aplicație (tip, semnătura `%PDF-`, mărime) și în `storage.rules`, care acceptă la scriere doar `application/pdf` de maximum 5 MB, numai în `users/{uid}/` al utilizatorului conectat. Ca s-o schimbi, modifică `CV_MAX_BYTES` în `src/features/cvs/types.ts` și condiția din `storage.rules`, apoi publică regulile.
- Bucket-ul vine din `VITE_FIREBASE_STORAGE_BUCKET` (`.env`). SDK-ul Storage se încarcă doar când e nevoie de un fișier, deci nu încetinește pornirea aplicației.
- Exportul JSON include metadatele CV-urilor și legăturile cu joburile, dar **nu și fișierele PDF**. Exporturile vechi (fără CV-uri) se importă ca înainte.
- „Șterge-mi toate datele” șterge și fișierele din Storage.
- Opțional, pentru ca „Descarcă” să salveze direct fișierul cu numele lui (fără să-l deschidă într-un tab), configurează CORS pe bucket:

  ```bash
  echo '[{"origin":["https://<proiect>.web.app","http://localhost:5173"],"method":["GET"],"maxAgeSeconds":3600}]' > cors.json
  gcloud storage buckets update gs://<bucket> --cors-file=cors.json
  ```

## Deploy

```bash
npm run build && firebase deploy
```

Comanda publică Hosting (din `dist`), regulile Firestore și Storage și funcțiile `extractJob` / `extractJobFromText` (regiunea `europe-west1`). Doar o parte:

```bash
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only storage
npm run build && firebase deploy --only storage,firestore:rules,hosting   # după schimbări la CV-uri
```

În Firebase Console → Authentication → Sign-in method, providerul Google trebuie să fie activ, iar domeniul de producție trebuie adăugat la „Authorized domains” (domeniile `*.web.app` și `*.firebaseapp.com` sunt deja acolo).

## Schimbarea limitei de extrageri

Editează `DAILY_EXTRACTION_LIMIT` în `functions/src/config.ts` (implicit 30 pe zi pentru fiecare utilizator), apoi rulează `firebase deploy --only functions`. Tot acolo găsești timeout-ul, dimensiunea maximă a paginii, câte caractere ajung la model și modelul folosit. Rezultatele din cache nu consumă din limită.

## Adăugarea unei limbi

1. Creează `src/i18n/de.ts` după modelul lui `en.ts`: `export const de: Messages = { … }`. TypeScript semnalează orice cheie lipsă.
2. În `src/i18n/index.ts`: adaugă `'de'` în `LANGUAGES` și `de: { translation: de }` în `resources`.
3. Adaugă numele limbii la cheile `language` (în toate fișierele) și opțiunea în `src/features/settings/SettingsPage.tsx`.
4. Pentru formatul datelor, adaugă locale-ul `date-fns` în `src/lib/dates.ts` (`dateLocale`).

Pluralele folosesc sufixele i18next (`_one`, `_few`, `_other`). Româna are trei forme, iar celelalte limbi pot repeta textul.
