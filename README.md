# Kooliprojekt

## Projekti kirjeldus

See on kooliprojekti raames loodud veebirakendus. Rakendus on arendatud tänapäevaste veebitehnoloogiate abil ning seda saab käivitada lokaalselt arenduskeskkonnas.

## Kasutatud tehnoloogiad

Projektis on kasutatud järgmisi tehnoloogiaid:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Node.js
- npm

## Eeltingimused

Enne projekti käivitamist peab arvutisse olema paigaldatud:

- Node.js
- npm

Node.js-i saab paigaldada näiteks nvm abil:  
https://github.com/nvm-sh/nvm#installing-and-updating

## Projekti käivitamine lokaalselt

Järgi neid samme, et projekt oma arvutis käivitada:

```sh
# 1. Klooni repositoorium
git clone <YOUR_GIT_URL>

# 2. Liigu projekti kausta
cd <YOUR_PROJECT_NAME>

# 3. Paigalda vajalikud sõltuvused
npm i

# 4. Loo .env fail ja täida see oma Supabase'i projekti andmetega
cp .env.example .env

# 5. Käivita arendusserver
npm run dev
```

## Supabase'i projekti loomine

1. Loo tasuta projekt aadressil https://supabase.com.
2. Rakenda andmebaasi struktuur (`supabase/migrations`, kõik failid järjekorras):
   ```sh
   npx supabase login
   npx supabase link --project-ref <projekt>
   npx supabase db push
   ```
   Teise võimalusena kopeeri iga faili SQL Supabase'i **SQL Editori** ja käivita.
3. **Authentication → Providers → Email**: lülita välja „Confirm email“ (rakendus kasutab kasutajanimesid, mitte päris e-posti aadresse) ja määra parooli minimaalseks pikkuseks 8.
4. **Project Settings → API**: kopeeri *Project URL* ja *publishable/anon key* faili `.env`.

## Avaldamine GitHub Pages'is

Rakendus avaldatakse automaatselt GitHub Pages'is iga kord, kui `main` harusse lisatakse muudatusi (`.github/workflows/deploy.yml`).

Ühekordne seadistus:

1. GitHubis: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. GitHubis: **Settings → Secrets and variables → Actions → Variables** – lisa `VITE_SUPABASE_URL` ja `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Supabase'is: **Authentication → URL Configuration**
   - Site URL: `https://<kasutaja>.github.io/<repo>/`
   - Redirect URLs: lisa sama aadress (ja kohalikuks arenduseks `http://localhost:8080/`).
4. Google'iga sisselogimiseks: loo Google Cloud Console'is OAuth Client ID (tüüp „Web application“), lisa *Authorized redirect URI*-ks `https://<projekt>.supabase.co/auth/v1/callback` ning sisesta Client ID ja Client Secret Supabase'is: **Authentication → Providers → Google**.

Supabase'i aadress ja avalik (publishable) võti jõuavad paratamatult brauserisse ega ole saladus. Andmeid kaitsevad andmebaasi Row Level Security reeglid. Saladusi (`service_role` / secret key, Google Client Secret) ei tohi kunagi lisada `.env` faili ega repositooriumisse.
