# Zeekr Garage

Uofficielt, uafhaengigt community- og fejl-board for Zeekr-ejere i Norden.

- **Fejl-board (skive 1, dette repo):** Next.js 14 (App Router) + TypeScript + Tailwind,
  data i selvhostet **Supabase** (Postgres + auth + RLS) paa hjemmeserveren Pixa.
  Alt er offentligt laesbart; login kraeves kun for at bidrage.
- **Forum (senere skive):** Discourse, selvhostet, med underfora pr. model og ét
  faelles login (SSO) - saa fejl-board og forum foeles som ét site.

Se `HANDOVER.md` for den fulde plan, arkitektur og status.

## Udvikling

```bash
cp .env.example .env.local   # udfyld NEXT_PUBLIC_SUPABASE_URL + ANON_KEY
npm install
npm run dev
```

## Database

Skemaet ligger i `supabase/migrations/` + `supabase/seed.sql` og er anvendt paa den
dedikerede Supabase-instans i Coolify (tag `zeekr-garage`). Studio paa LAN:
`http://192.168.1.18:8002`.

## Deploy

Docker (standalone) via Coolify paa Pixa. `NEXT_PUBLIC_*` skal saettes som
**build-args** (de bages ind ved build). Den offentlige Supabase-URL skal naas fra
brugerens browser (Cloudflare Tunnel).
