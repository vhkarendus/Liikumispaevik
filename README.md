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

# 4. Käivita arendusserver
npm run dev

## Avaldamine GitHub Pages'is

Rakendus avaldatakse automaatselt GitHub Pages'is iga kord, kui `main` harusse lisatakse muudatusi (`.github/workflows/deploy.yml`).

Ühekordne seadistus:

1. GitHubis: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Supabase'is: **Authentication → URL Configuration**
   - Site URL: `https://<kasutaja>.github.io/<repo>/`
   - Redirect URLs: lisa sama aadress.
3. Supabase'is: **Authentication → Providers → Email** – parooli minimaalne pikkus 8.
4. Google'iga sisselogimiseks: loo Google Cloud Console'is OAuth Client ID (tüüp „Web application“), lisa *Authorized redirect URI*-ks `https://<projekt>.supabase.co/auth/v1/callback` ning sisesta Client ID ja Client Secret Supabase'is: **Authentication → Providers → Google**.
5. Andmebaasi muudatused (`supabase/migrations`) rakenda käsuga `supabase db push` või kopeeri SQL Supabase'i SQL Editori.

Supabase'i aadress ja avalik (publishable) võti on failis `.env`. Need on mõeldud brauseris nähtavaks; andmeid kaitsevad andmebaasi Row Level Security reeglid.
