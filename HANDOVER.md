# HANDOVER — Zeekr Garage

> Uofficielt, uafhængigt community-site for Zeekr-ejere i Danmark/Norden.
> Dette dokument er projektets sandhedskilde. **Opdateres ved hver ændring.**

**Sidst opdateret:** 2026-11-20

---

## Formål & positionering
- Nyt, uafhængigt, **uofficielt** Zeekr-ejer-community. Afløser/udvider bugherrer.dk (7GT-fejl-boardet folder ind her).
- Mål: så lækkert og værdifuldt, at Zeekr selv tager kontakt → åbner en jobmulighed for Torben.
- Positionering: struktureret, professionel ejer-QA-feedback — **konstruktiv medspiller, ikke en vred pressgruppe.** Spiller på Torbens 20 års QA-/leverandørbaggrund.
- **Ikke-kommercielt.** Ingen annoncer, ingen affiliate, ingen indtjening. (Evt. senere "tilbehør ejerne anbefaler" — uden provision.)

## Navn, domæne & jura
- Domæne: **zeekr-garage.dk** (tjek/registrér ledighed).
- Repo: `Tmat-code/zeekr-garage` — Claude-GitHub-app har skriveadgang; Claude committer + pusher direkte.
- Fire forholdsregler (holder os i den juridisk trygge "nominative fair use"-ende):
  1. Ikke-kommercielt.
  2. Tydelig disclaimer: *"Uofficielt ejer-community — ikke tilknyttet eller sponsoreret af Zeekr."*
  3. Intet Zeekr-logo og ikke Zeekrs firmafarver.
  4. Antyd aldrig officiel tilknytning.
- Undgå officielt-klingende navne (zeekrdanmark, zeekrnorden o.l.). Værste realistiske tilfælde ved en navne-tvist: brev om at skifte/overdrage domæne (ikke en retssag) — i DK via Klagenævnet for Domænenavne.

## Arkitektur — BESLUTTET: hybrid
- **Discourse** (selvhostet på Pixa, tematiseret, ét login via SSO) = forummet, fællesskabet, Garagen. Underfora pr. model, tråde, trust levels + moderering ud af boksen.
- **Custom Next.js + Supabase** = fejl-/issue-boardet + Zeekr-rapporterne. Kronjuvelen og differentieringen — Torbens egen bygning (portfolio til Zeekr).
- Ét domæne, ét login (Discourse SSO), samme tema → føles som ét site.
- Design: lækkert, rent, automotive. **Undgå "Claude-agtige" grøn/blå farver.** Renere end den annonce-rodede Fora/Polestar-platform (= inspiration for struktur, ikke for reklamer/affiliate).
- **Bekræftet 20-11-2026:** Discourse valgt til forum-delen (ikke custom, ikke hosted platform). Forum-UX-reference = polestar-forum.com (kategorier pr. model som rygrad). Rækkefølge: fejl-board (skive 1) bygges FØRST, forum bagefter. App-palet valgt: grafit + kobber (væk fra både Claude- og Zeekr-farver).

## Stack & hosting
- Next.js (genbrug bugherrers stack), TypeScript.
- **Supabase (selvhostet på Pixa)** — auth, rettigheder (RLS), realtime (giver "lever"-følelsen i feed/chat).
- Hosting: Pixa via Coolify. Mail via Resend. Ekstern adgang via Cloudflare Tunnel.
- **Pixa-kapacitet (20-11-2026):** 13 GB RAM, 5,6 GB tilgængelig, 4 GB swap, 401 GB fri disk → Discourse (~1–1,5 GB) passer med god luft. Nem ekstra-gevinst: ryd den ulabelede/ledige Supabase-instans.
- Note: Discourse kræver lidt mere opsætning i Coolify end en almindelig app (eget Docker-setup) — gørligt.

## Modeller & platforme (DK-lineup)
Én fejl kan tagges til **flere** modeller. Modeller deler softwareplatform → mange fejl er fælles på tværs → stærkere bevis/pres mod Zeekr. Fang **model + softwareversion (OTA)** på hver melding; hardware-variant = valgfri metadata.

| Model | Platform |
|---|---|
| Zeekr 9X | SEA-R |
| Zeekr 7X | PMA2+ |
| Zeekr 7GT | PMA2+ |
| Zeekr 001 | SEA1/SEA2 |
| Zeekr 001 Sport Edition | SEA1/SEA2 |
| Zeekr X | SEA1/SEA2 |

Platform-feltet lader systemet foreslå relaterede modeller og vise fx "fejl rammer hele PMA2+-platformen".

## Sektioner
- Forside/feed (levende aktivitet)
- Fejl-/issue-board pr. model + på tværs — **custom**
- Zeekr-rapporter: offentlige, pæne, samlede — **custom (portfolio-kronjuvel)**
- Forum/snak pr. model — **Discourse**
- Garage: ejernes biler/profiler — **Discourse**
- Spørgsmål & guides
- Om — med uofficielt-disclaimer

## Adgang — BESLUTTET: åbent
- Alt indhold er **offentligt læsbart** (også for Google og besøgende) — fejl-board, forum, guides, Zeekr-rapporter. Login kræves kun for at *bidrage* (melde, bekræfte/stemme, skrive, kommentere). Begrundelse: vækst/migration fra FB, SEO, og at Zeekr kan se kvaliteten uden at oprette en konto.
- Personlige detaljer (VIN, præcise bil-data) er **valgfrie/private**, selvom resten er offentligt. Rapporter til Zeekr er samlede/anonymiserede.
- Teknisk: Discourse-kategorier sat til "læs frit, login for at skrive"; custom fejl-board-sider offentlige (SSR, SEO), handlinger låst bag login.

## Datamodel (custom-delen, kerne)
- `profiles` (udvider Supabase auth-users; SSO-koblet til Discourse)
- `cars` (user, model, variant, softwareversion)
- `models` (6 ovenfor + platform)
- `issues` (titel, beskrivelse, kategori, alvorlighed, status: ny → bekræftet → sendt til Zeekr → løst i OTA; `type` fejl/ønske; `software_version`, `phone_model`, `phone_os`)
- `issue_models` (kobling — fejl ↔ flere modeller)
- `confirmations` (user, issue, model, softwareversion = "jeg har også det her")
- `software_versions` (model/platform, version, udgivet)
- `zeekr_reports` (periode, model-scope, udvalgte issues, status)

Forum-indhold (tråde, kategorier, Garage) ligger i **Discourse**, ikke her.

## Moderering
- **Kø, ikke patrulje:** struktur + Discourse trust levels + flag-kø + AI-dedup af fejlmeldinger (match ny melding mod eksisterende).
- Torben skaffer et par moderatorer.

## Byggemetode
- All in på visionen, men ship i **tynde skiver** (bugherrer-metoden: live hurtigt, iterér).
- **Skive 1:** custom Next.js + Supabase — login (SSO-klar) + modeller/platforme + fejl-board multi-model (meld → bekræft → stem). Dybest set bugherrer genfødt på ny stack + flere modeller.
- Senere skiver: Zeekr-rapporter · Discourse-opsætning + SSO + tematisering · Q&A/guides · AI-dedup + flag-kø.

## Repo-struktur (skive 1)
- `supabase/migrations/20261120090000_init.sql` — kerneskema: 10 tabeller, enums, triggers (auto-profil ved signup, updated_at), RLS (offentlig læsning, login for at bidrage, VIN privat i `car_private`), 20 policies. Syntaks-valideret mod Postgres.
- `supabase/seed.sql` — de 6 DK-modeller + platform. Idempotent.
- **Anvendt på Pixa 20-11-2026** (ny dedikeret instans, se nedenfor). Verificeret: 10 tabeller, 10 m. RLS, 20 policies, 6 modeller.

## Pixa / Supabase-situation (undersøgt i Coolify 20-11-2026)
- Claude når Pixa via Coolifys browser-UI (http://192.168.1.18:8000) og Coolifys container-terminal (= "direkte" Pixa-adgang). Claudes egen cloud-sandbox er netværks-låst og kan IKKE nå Pixa/LAN; Supabase-cloud-API'et i Claude ser kun cloud-projektet `talentry-platform`.
- Coolify-projekt "My first project" / production, server `localhost` (= Pixa). 7 ressourcer: bugherrer, docker-image (Libretranslate), jobtavle, karvia, lejesyn, + 2 Supabase-services.
- **De 2 Supabase-instanser — identificeret:**
  - `supabase-attv9fy0cugo7ol0athiobws` — label **"Karvia"**. Står **Degraded** (⚠️ bør kigges på separat).
  - `supabase-asmzli3ytzonaxou4fmfalee` — ulabelet, men **IKKE ledig**: den er jobtavle + Lejesyns instans. Tabeller i `public`: `job_opslag` (**655 rækker** — jobtavles live-data), `syn` (0 rækker — Lejesyn, ingen data endnu). `auth.users` = 0 på hele instansen (ingen bruger Supabase-auth endnu). "Changes pending" i Coolify.
- **Konklusion:** ingen af de 2 instanser var fri. Pixa havde ~5,5 GiB RAM tilgængelig (af 13 GiB) → plads til en ny.
- **BESLUTTET: A** (ny dedikeret instans). Oprettet i Coolify 20-11-2026:
  - Service: `supabase-zdmeluhkaf6buop6l6vlhj2s`, tagget **`zeekr-garage`** i Coolify (beskrivelses-feltet ville ikke gemme i denne Coolify-version — brug tagget til at genkende den).
  - Running, alle containere healthy. Netværk: "Use the stack network only" (ingen ekstern domæne endnu).
  - Migration + seed anvendt via Coolify-terminal → db-container (`psql`). Overført som base64 + sha256-verificeret (byte-perfekt), da repoet er privat.
  - **App'en forbinder internt:** da instansen kun er på stack-netværket, forbinder Next.js-appen (når den kører på Pixa) via Kong-gateway'ens interne service-navn, ikke en public URL. Connection-detaljer (URL/anon-key/service-key) hentes fra servicens Environment Variables i Coolify når app-skallen bygges.
- **Studio-adgang (LAN):** Zeekr-instansens Kong er mappet til host-port **8002** → åbn `http://192.168.1.18:8002` i browseren. Beskyttet af Basic-auth = servicens **Supabase · Dashboard User/Password** (se felterne i Coolify). Selvhostet Supabase er én-projekt-per-stack, så hver instans har sit eget Studio:
  - 8001 → Karvia-instansen
  - 8002 → Zeekr Garage-instansen (vores)
  - Jobtavle/lejesyn-instansen (`asmzli3…`) har ingen host-port (kun stack-netværk)
  - Port tilføjet i compose: `ports: - "8002:8000"` på `supabase-kong`, redeployet.
- Karvias Supabase (`supabase-attv9fy0…`) står **Degraded** — ifølge Torben pga. opgradering af Supabase til nyeste version (ikke en mystisk fejl). Ikke rørt. Den ulabelede er nu navngivet "Jobtavle og lejesyn" i Coolify; Zeekr-instansen "Zeekr-garage".

## Status / næste skridt
- [x] Repo oprettet + Claude-adgang bekræftet (klonet OK).
- [x] Nyt claude.ai-projekt **"Zeekr Garage"** oprettet; arbejdet flyttet dertil (dette dokument er broen).
- [x] Domæne zeekr-garage.dk registreret.
- [ ] Byg skive 1:
  - [x] Kerneskema som migrations-SQL (syntaks-valideret).
  - [x] Undersøgt Supabase på Pixa — ingen instans var fri (se ovenfor).
  - [x] Oprettet ny dedikeret Supabase-instans (A) + anvendt migration + seed. Verificeret.
  - [x] App-skal (Next.js 14/TS/Tailwind) + Supabase-klienter (@supabase/ssr). `npm run build` grønt.
  - [x] Fejl-board multi-model: offentlig læsning, modelfilter, platform-signal, meld → bekræft/stem (login-styret).
  - [x] Fuldt bugherrer-flow på `/meld`: trin-indikator, type-valg (fejl/ønske), søg-først, genstart-tjek, softwareversion + telefon-felter.
  - [x] **Deployet til Pixa — LIVE på `http://192.168.1.18:3003`** (LAN). Board læser de 6 modeller fra den nye Supabase. ✅
  - [x] **Auto-deploy via n8n-poller** (se afsnit nedenfor) — push → deploy, ingen manuel redeploy. Repo gjort offentligt. Verificeret end-to-end 20-11-2026 (commit `bdd144e` deployet via API-kilde).
  - [x] **Offentlig adgang udefra opsat 20-11-2026** (se "Offentlig adgang (Cloudflare Tunnel)"-afsnittet). zeekr-garage.dk tilføjet som Cloudflare-zone + DNSSEC fjernet hos Simply; tunnel "pixa" udvidet med app + www + api; Coolify build-arg skiftet til public Supabase-URL + intern SSR-URL; redeployet. **Verificeret udefra end-to-end:** login persisterer, melding kan oprettes (skriv), log-ud lander på forsiden — efter 2 bugfixes (cookie-`storageKey` + `0.0.0.0`-redirect).
  - [ ] **← NÆSTE: Skive 2+.** Zeekr-rapporter, Discourse-opsætning + SSO + tematisering, Q&A/guides, AI-dedup + flag-kø. Valgfrit først: SMTP (Resend) til rigtige email-bekræftelser (ellers kører auto-confirm fint).

## App (skive 1) — struktur
- Next.js 14 App Router, standalone Docker-build. `@/`-alias, Tailwind-palet grafit+kobber (`lib/config.ts`, `tailwind.config.ts`).
- Datalag: `@supabase/ssr`. `lib/supabase/server.ts` (auth + SSR, bruger `SUPABASE_INTERNAL_URL` hvis sat), `client.ts` (browser, public URL), `middleware.ts` (token-refresh).
- `lib/queries.ts`: modeller, issues m. koblede modeller + optalte bekræftelser, brugerens egne bekræftelser.
- Sider: `/` (board m. type-filter Alle/Fejl/Ønsker + modelfilter), `/meld` (login-gated, **fuldt bugherrer-flow**, se nedenfor), `/login` (konto: email+password), `/om`, `/auth/callback`, `/logout`.
- **Meldingstyper:** fejl + ønske (bugherrer-paritet). Samme maskineri, kun `issues.type` (enum `issue_type`) adskiller. Migration `supabase/migrations/20261120110000_issue_type.sql` — anvendt på Pixa-instansen.
- **/meld-flow (bugherrer-paritet, `MeldFlow.tsx`):** trin-indikator + 4 trin — (1) **vælg** type (to kort: Fejl / Ønske; springes over hvis `?type=` i URL), (2) **søg** eksisterende (ordmatch filtreret på type, viser match m. "mig med" så dubletter undgås), (3) **tjek** genstart/OTA (kun fejl — bugherrers "Fejl-40"-trin), (4) **udfyld** (`MeldForm`). Ønske springer "tjek" over (Søg → Udfyld).
- **Issue-felter (migration `20261120113000_issue_fields.sql`, anvendt på Pixa):** `software_version` (påkrævet for fejl, mono-chip på board-kort), `phone_model` + `phone_os` (valgfri, kun fejl — telefon-boks i formular). Fanget pr. melding, jf. "model + softwareversion"-princippet.
- Komponenter: `FejlBoard` (filter/søg/sortér, type-badge, softwareversion-chip), `MeldFlow` (4-trins-flow), `MeldForm` (type-bevidst: felter/ordlyd skifter på fejl vs. ønske), `ConfirmButton` ("mig med" m. modelvalg), `LoginForm`, `Header`, `Footer`, `Tags` (status/alvorlighed/platform-signal).
- RLS styrer alt: læsning fri, skrivning kun egne rækker (authenticated).
- **Deploy-noter:** `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` skal gives som **build-args** i Coolify (bages ind ved build). Anon-key hentes fra Supabase-servicens Environment Variables (`SERVICE_SUPABASEANON_KEY`). Browser-URL skal kunne nås udefra (Cloudflare Tunnel) ELLER på LAN via `http://192.168.1.18:8002` (Kong serverer /rest + /auth med anon-key uden basic-auth; kun Studio-ruten er basic-auth-beskyttet). SSR kan bruge intern Kong-URL via `SUPABASE_INTERNAL_URL`.
- Åbent: Supabase-auth kræver evt. SMTP (GoTrue) for email-bekræftelse, ellers slå auto-confirm til for at password-signup virker uden mail.

## Deploy (Coolify-app) — opsat 20-11-2026
- Coolify-app `zeekr-garage:main-rpcqm0klit7tcvzms7syizxv`, kilde = GitHub App (`troubled-teira…`), repo Tmat-code/zeekr-garage, branch main, build = Dockerfile. **Auto-deploy on push** er slået til.
- **LIVE på LAN:** `http://192.168.1.18:3003` (host-port-mapping 3003:3000 i "Edit Networking → Port mappings"). Brugte 3003 fordi 3000/3001/3002 var optaget.
- Build-args i Coolify (Buildtime+Runtime): `NEXT_PUBLIC_SUPABASE_URL=https://api.zeekr-garage.dk` (var `http://192.168.1.18:8002` i LAN-fasen — skiftet 20-11-2026), `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon JWT>`. Desuden runtime-env `SUPABASE_INTERNAL_URL=http://192.168.1.18:8002` så SSR læser Kong internt på LAN (ingen hairpin ud gennem tunnelen). Browseren når Supabase offentligt på `https://api.zeekr-garage.dk` (Kong serverer /rest + /auth med anon-key, CORS `*`).
- **Auto-confirm slået til:** Supabase-servicens env `ENABLE_EMAIL_AUTOCONFIRM=true` (→ GOTRUE_MAILER_AUTOCONFIRM), Supabase genstartet. Så konto-oprettelse virker uden mail-server.
- Coolify gav også en sslip.io-URL via proxy (port 80), men den peger på WAN-IP (usikker på LAN) — derfor host-porten 3003 til LAN-brug.
- **Offentlig adgang: GJORT 20-11-2026** — se afsnittet "Offentlig adgang (Cloudflare Tunnel)" nedenfor.

## Offentlig adgang (Cloudflare Tunnel) — opsat 20-11-2026
Siden er nu offentligt tilgængelig på **https://zeekr-garage.dk** (+ www + api). Vejen: DNS (Cloudflare) → Cloudflare edge → tunnel "pixa" → Pixa.

- **Domæne/zone:** zeekr-garage.dk er registreret hos **Simply.com**, men var ikke tilføjet til Cloudflare. Tilføjet som zone (Free-plan). Nameserverne pegede allerede på Cloudflare (`javon.ns.cloudflare.com` + `kayleigh.ns.cloudflare.com`) fra et tidligere forsøg, så zonen blev **Active** med det samme. Konto: T.mathiasen@outlook.com.
- **DNSSEC:** zonen var DNSSEC-signeret hos Simply. Da Cloudflare nu er autoritativ, blev DNSSEC **fjernet** hos Simply (DNS administration → Rediger DNSSEC → Fjern) — ellers fejler domænet DNSSEC-validering (SERVFAIL). Kan slås til igen via Cloudflare senere, hvis ønsket.
- **Tunnel "pixa"** (samme tunnel som lejesyn/bugherrer/karvia). 3 nye routes, alle *Published application*, service = `http://192.168.1.18:<host-port>`, DNS-CNAME auto-oprettet (proxied):
  - `zeekr-garage.dk` → `http://192.168.1.18:3003` (app)
  - `www.zeekr-garage.dk` → `http://192.168.1.18:3003` (app; tilføjet fordi Safari auto-prepender "www")
  - `api.zeekr-garage.dk` → `http://192.168.1.18:8002` (Supabase Kong)
- **Coolify:** `NEXT_PUBLIC_SUPABASE_URL` skiftet til `https://api.zeekr-garage.dk` (build-arg → bages ind ved build, kræver redeploy) + ny runtime-env `SUPABASE_INTERNAL_URL=http://192.168.1.18:8002` (SSR internt). Redeployet manuelt (= 1 build oven i det n8n allerede havde kørt på samme commit; ikke dobbelt-firing).
- **Verificeret udefra:** apex + www loader board'et via SSR (6 modeller), gyldigt SSL; klient-side auth når `api.zeekr-garage.dk`.
- **Bug 1 fundet + rettet (login-bounce):** efter login blev man sendt tilbage til /login. Årsag: `@supabase/ssr` udleder session-cookiens navn fra Supabase-URL'ens værtsnavn, og browser (`api.zeekr-garage.dk`) vs server/middleware (intern `192.168.1.18:8002`) gav **forskellige cookie-navne** → serveren fandt ikke sessionen. **Fix:** fast delt `storageKey = 'sb-zeekr-garage-auth'` i `lib/supabase/client.ts`, `lib/supabase/server.ts` og `middleware.ts` (SKAL holdes ens alle tre steder). Beholder den hurtige interne SSR. Virkede ikke på LAN fordi begge URL'er var ens dér.
- **Bug 2 fundet + rettet (redirect til 0.0.0.0):** logout sendte til `https://0.0.0.0:3000/` (ERR_SSL_PROTOCOL_ERROR). Årsag: Next.js standalone binder til `0.0.0.0:3000`, så `request.url` i route-handlers er den interne adresse — en redirect bygget på den peger på 0.0.0.0. Bag tunnelen kommer det rigtige værtsnavn i Host-headeren. **Fix:** ny `lib/url.ts` (`publicOrigin()` læser Host/X-Forwarded-Host + proto; `sikkerSti()` mod open-redirect), brugt i `app/logout/route.ts` og `app/auth/callback/route.ts`. (Samme fælde kan ramme fremtidige server-redirects — brug `publicOrigin`, aldrig `request.url`.) Login-redirect var upåvirket (client-side `window.location.origin` + relativ `router.push`).
- **Klient-cache-note:** rammer man et navn FØR dets DNS-record findes, kan det blive negativt cachet lokalt (Safari viste "kan ikke finde serveren" for www selv efter www var oppe; virkede i privat vindue). Fix: flush DNS / privat vindue / vent ~15–30 min. Kun den ene maskine, ikke nye besøgende.

## Auto-deploy via n8n-poller (opsat 20-11-2026)
Samme mønster som bugherrer: GitHub kan ikke nå Coolify udefra (lukkede router-porte), så n8n på Pixa "ringer ud" — poller GitHub og trigger Coolify-deploy lokalt. Kæden: **Claude pusher → n8n opdager → Coolify deployer**, ingen manuel redeploy.
- **n8n-workflow "Zeekr Garage auto-deploy"** (kopi af bugherrers, 4 noder): Schedule (hvert 3. min) → HTTP GET `https://api.github.com/repos/Tmat-code/zeekr-garage/commits/main` (header `User-Agent: n8n`) → Code (husker sidste `sha` i workflow static data, kun videre ved ny) → HTTP POST `http://192.168.1.18:8000/api/v1/deploy?uuid=rpcqm0klit7tcvzms7syizxv&force=false` med `Authorization: Bearer <Coolify API-token>`.
- **Genbrugt fra bugherrer:** Coolify API-token `n8n-deploy` (Deploy-ret, deployer alle apps på teamet) + Allowed-IPs (private ranges). Ingen ny token/credential.
- **Repo gjort OFFENTLIGT 20-11-2026:** krævet for at den uautentificerede GET virker (GitHub giver 404 på private repos uden token). Repoet er tjekket rent — ingen committede hemmeligheder (`.env` git-ignoreret, kun `.env.example`-skabelon). Alle nøgler bor i Coolify. Offentligt repo støtter også portfolio-vinklen (Zeekr kan se kvaliteten).

## Åbne spørgsmål (bekræft i nyt projekt)
- SSO-retning mellem Discourse og custom-app (hvem er identity-provider?) — afklares ved opsætning.
- bugherrer er SQLite; her bruges Supabase/Postgres. "Genbrug bugherrer" = app-laget (Next.js/TS, UI, deploy-flow), ikke data-laget.
