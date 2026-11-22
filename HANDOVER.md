# HANDOVER - Zeekr Garage

> Uofficielt, uafhængigt community-site for Zeekr-ejere i Danmark/Norden.
> Dette dokument er projektets sandhedskilde. **Opdateres ved hver ændring.**

**Sidst opdateret:** 2026-11-22 (kategori-chip på board-rækker + melding-detalje)

---

## Arbejdsgang - sessioner (regel 22-11-2026)
- **Én opgave pr. session.** Når en opgave er løst (bygget + verificeret + HANDOVER opdateret + pushet), lægger Claude SELV op til at starte en NY session til næste opgave - vi fortsætter ikke bare i samme session. Backloggen nedenfor er broen, så den friske session har alt med.
- Grunden: hver session holder sig fokuseret og kontekst-let, og de gode opbygnings-vinkler går ikke tabt i en lang, komprimeret tråd.

## Backlog - samlet (sidst opdateret 22-11-2026)
> Ét sted for "hvad mangler". Stryg punkter efterhånden som de bygges. Detaljer står i de relevante sektioner nedenfor.

**Datamodel/kerne**
- [x] ~~**Multi-model garage**~~ **BYGGET + LIVE 22-11-2026** (migration kørt i Studio + verificeret, flettet til main, deployer via n8n). Se eget afsnit "## Multi-model garage" nedenfor.

**Værkstedet/moderering**
- [x] ~~`/admin/beskeder`: moderator-visning af besked-anmeldelser~~ **BYGGET 22-11-2026** (kræver 1 ny migration kørt i Studio - se "## Admin: besked-anmeldelser" nedenfor).
- [x] ~~Redigerbare forum-regler i UI.~~ **BYGGET 22-11-2026** (kræver 1 ny migration kørt i Studio - se "## Redigerbare forum-regler (bygget 22-11-2026)" nedenfor).
- [ ] Kategori-editor kan ikke flytte en kategori mellem grupper (kræver SQL i dag).
- [ ] Tværgående tråd-søgning.
- [ ] Antal ejere pr. model-forum.
- [ ] Live-verifikation af rolletildeling i Adgange (Torben kører selv - blev bevidst ikke automatiseret).

**Sikkerhed/lints**
- [x] ~~Supabase security-lints: `touch_updated_at` mutable search_path + `issue_models` INSERT `with check (true)`~~ **FIX SKREVET 22-11** (migration `20261122170000_lint_fixes.sql` - KRÆVER kørsel i Studio). Fast search_path + ejerskabs-tjek på issue_models-INSERT. Ikke-brydende.

**Feedback-board** (stort dagsværk 22-11)
- [x] ~~Status "afklaret" (afsluttet uden OTA-fix)~~ **BYGGET 22-11** (migration kørt i Studio). Se "## Status "afklaret" + kommentar-badge".
- [x] ~~Kommentar-badge + "Markér løst" som valg (Løst i OTA / Afklaret) i Værkstedet~~ **BYGGET 22-11**.
- [x] ~~Status-filter (Aktive/Afsluttet/Alle) + dæmpede afsluttede rækker~~ **BYGGET 22-11**.
- [x] ~~9 faste kategori-spande + filter på board + krævet dropdown ved oprettelse + kuratering i Værkstedet~~ **BYGGET 22-11** (ingen migration). Se "## Feedback-kategorier".
- [ ] **Mærk de ~31 eksisterende meldinger op med kategori** (Torben, engangs, i Værkstedet).
- [x] ~~Kategori-chip på board-rækkerne (visning, så spanden ses uden at filtrere).~~ **BYGGET 22-11** (ingen migration). Kobber-tonet tag lige efter type-badgen i `components/FejlBoard.tsx` OG på `/melding/[id]`; bruger `kategoriLabel()` (fri-tekst-fallback) og vises kun når meldingen har en kategori. Stil: `chip border border-kobber-200 bg-kobber-50 text-kobber-700` (grafit/kobber, ingen ny farve).
- [ ] Gruppér rapporten til Zeekr efter kategori-spand (QA-guld).
- [ ] Ryd op i den tætpakkede moderings-række i Værkstedet (vote/status/alvor/kategori/løst/redigér/slet begynder at klemme).

**Forum - struktur (IA-beslutning 22-11, uddybet i "## Feedback-kategorier")**
- Beslutning: forummet **struktureres ikke mere nu** - det er tomt for tråde, så det er et indholds-, ikke et strukturproblem. Lad struktur vokse ud af rigtige tråde.
- Beslutning: når det struktureres, bruges de **9 feedback-spande som emne-tags/filter**, ikke nestede rum pr. model (undgår model×emne tomme-rum-eksplosion). Model forbliver rum/filter; emne er et mærke man vælger ved oprettelse; findbarhed bæres af **søgning**, ikke af perfekt kategorisering (brugeren vælger aldrig helt rigtigt - moderator kuraterer).
- Den gamle model-først-plan i "## Næste op" er hermed forfinet på struktur-spørgsmålet.

**Billeder**
- [ ] Redigering af et indlægs billeder (edit er pt. kun tekst).
- [ ] Oprydning af forældreløse storage-filer ved soft-remove af indlæg.
- [ ] Billeder i beskeder + i feedback-meldinger.

**Beskeder/chat**
- [ ] Gruppe-samtaler (datamodellen holder til det).

**Events**
- [ ] .ics-kalendereksport, antal gæster pr. tilmelding, notifikation ved *nyt* event (ikke kun opdateringer).

**Notifikationer/mail**
- [ ] Opt-in e-mail eller daglig samle-mail pr. forum-svar (in-app virker; mail er valgt fra indtil videre).

**Feedback-board**
- [ ] "Følg denne fejl" uden konto (email) + anonyme kommentarer (navn + captcha). Parkeret.

**Større roadmap (ikke bygget)**
- [ ] Q&A / guides-sektion.
- [ ] AI-dedup af fejlmeldinger på `/meld` (match ny melding mod eksisterende - "kø, ikke patrulje").

**Oprydning/polish**
- [ ] End-to-end-test af selvbetjent mail-skift (kode + Supabase klar).
- [ ] Fjern ubrugt `ForsideOverblik.tsx`.
- [ ] Ikke-AI-redesign (Torben udskød; grafit+kobber står). Ved palet-skift skal PDF-rapport + `tailwind.config.ts` + komponenter følge med.

## Formål & positionering
- Nyt, uafhængigt, **uofficielt** Zeekr-ejer-community. Afløser/udvider bugherrer.dk (7GT-fejl-boardet folder ind her).
- Mål: så lækkert og værdifuldt, at Zeekr selv tager kontakt → åbner en jobmulighed for Torben.
- Positionering: struktureret, professionel ejer-QA-feedback - **konstruktiv medspiller, ikke en vred pressgruppe.** Spiller på Torbens 20 års QA-/leverandørbaggrund.
- **Ikke-kommercielt.** Ingen annoncer, ingen affiliate, ingen indtjening. (Evt. senere "tilbehør ejerne anbefaler" - uden provision.)

## Navn, domæne & jura
- Domæne: **zeekr-garage.dk** (tjek/registrér ledighed).
- Repo: `Tmat-code/zeekr-garage` - Claude-GitHub-app har skriveadgang; Claude committer + pusher direkte.
- Fire forholdsregler (holder os i den juridisk trygge "nominative fair use"-ende):
  1. Ikke-kommercielt.
  2. Tydelig disclaimer: *"Uofficielt ejer-community - ikke tilknyttet eller sponsoreret af Zeekr."*
  3. Intet Zeekr-logo og ikke Zeekrs firmafarver.
  4. Antyd aldrig officiel tilknytning.
- Undgå officielt-klingende navne (zeekrdanmark, zeekrnorden o.l.). Værste realistiske tilfælde ved en navne-tvist: brev om at skifte/overdrage domæne (ikke en retssag) - i DK via Klagenævnet for Domænenavne.

## Arkitektur - BESLUTTET: alt custom (én stak)
- **Custom Next.js + Supabase = hele sitet** - feedback-/issue-board, Zeekr-rapporter OG forummet. Én stak, ét login (Supabase auth), ingen SSO-bro. Torbens egen bygning hele vejen (portfolio til Zeekr).
- **Discourse FRAVALGT 21-11-2026** (afløser den tidligere "hybrid"-beslutning). Begrundelse: solo/ikke-teknisk + vedligehold via Claude → én stak langt mere holdbart end at drifte + patche en Rails-Discourse + SSO-bro; kronjuvelen er den tætte datakobling (Min Garage → bil → stemmer → rapporter), som custom-forum forlænger naturligt og Discourse fragmenterer over en SSO-søm; design-sammenhæng + evt. redesign kun ét sted; "jeg byggede det hele" > "jeg konfigurerede Discourse". Discourses gratis-gevinster (trust levels, avanceret spam/moderering, digests) er tynde behov på FB-migrations-skala, og Værkstedet + "kø, ikke patrulje" dækker allerede moderering.
- **Identitet AFKLARET 21-11-2026:** Supabase er det ene identitetssystem. SSO-spørgsmålet (hvem er IdP mellem Discourse og app) er dermed **bortfaldet** - der er ingen bro.
- Ét domæne, samme tema → føles som ét site (nu reelt ét site, ikke to systemer limet sammen).
- Design: lækkert, rent, automotive. **Undgå "Claude-agtige" grøn/blå farver.** Polestar/Fora = inspiration for struktur, ikke for reklamer/affiliate.
- Forum-UX-reference = polestar-forum.com (kategorier pr. model som rygrad). App-palet: grafit + kobber (væk fra både Claude- og Zeekr-farver).

## Stack & hosting
- Next.js (genbrug bugherrers stack), TypeScript.
- **Supabase (selvhostet på Pixa)** - auth, rettigheder (RLS), realtime (giver "lever"-følelsen i feed/chat).
- Hosting: Pixa via Coolify. Mail via Resend. Ekstern adgang via Cloudflare Tunnel.
- **Pixa-kapacitet (20-11-2026):** 13 GB RAM, ~5,6 GB tilgængelig, 4 GB swap, 401 GB fri disk. (Discourse-kapacitetsnoten er **bortfaldet 21-11-2026** - forum bygges custom i den eksisterende Zeekr-Supabase, ingen ny tung container.)

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
- Fejl-/issue-board pr. model + på tværs - **custom**
- Zeekr-rapporter: offentlige, pæne, samlede - **custom (portfolio-kronjuvel)**
- Forum/snak pr. model - **custom** (Next.js + Supabase)
- Garage: ejernes biler/profiler - **custom** (Min garage findes allerede på profilen)
- Spørgsmål & guides
- Om - med uofficielt-disclaimer

## Adgang - BESLUTTET: åbent
- Alt indhold er **offentligt læsbart** (også for Google og besøgende) - fejl-board, forum, guides, Zeekr-rapporter. Login kræves kun for at *bidrage* (melde, bekræfte/stemme, skrive, kommentere). Begrundelse: vækst/migration fra FB, SEO, og at Zeekr kan se kvaliteten uden at oprette en konto.
- Personlige detaljer (VIN, præcise bil-data) er **valgfrie/private**, selvom resten er offentligt. Rapporter til Zeekr er samlede/anonymiserede.
- Teknisk: Discourse-kategorier sat til "læs frit, login for at skrive"; custom fejl-board-sider offentlige (SSR, SEO), handlinger låst bag login.

## Datamodel (custom-delen, kerne)
- `profiles` (udvider Supabase auth-users; SSO-koblet til Discourse)
- `cars` (user, model, variant, softwareversion)
- `models` (6 ovenfor + platform)
- `issues` (titel, beskrivelse, kategori, alvorlighed, status: ny → bekræftet → sendt til Zeekr → løst i OTA; `type` fejl/ønske; `software_version`, `phone_model`, `phone_os`)
- `issue_models` (kobling - fejl ↔ flere modeller)
- `confirmations` (user, issue, model, softwareversion = "jeg har også det her")
- `software_versions` (model/platform, version, udgivet)
- `zeekr_reports` (periode, model-scope, udvalgte issues, status)

Forum-indhold (kategorier, tråde, indlæg) får egne custom-tabeller i samme Supabase - se forum-datamodel i "Næste op".

## Moderering
- **Kø, ikke patrulje:** struktur + Discourse trust levels + flag-kø + AI-dedup af fejlmeldinger (match ny melding mod eksisterende).
- Torben skaffer et par moderatorer.

## Byggemetode
- All in på visionen, men ship i **tynde skiver** (bugherrer-metoden: live hurtigt, iterér).
- **Skive 1:** custom Next.js + Supabase - login (SSO-klar) + modeller/platforme + fejl-board multi-model (meld → bekræft → stem). Dybest set bugherrer genfødt på ny stack + flere modeller.
- Senere skiver: Zeekr-rapporter · Discourse-opsætning + SSO + tematisering · Q&A/guides · AI-dedup + flag-kø.

## Repo-struktur (skive 1)
- `supabase/migrations/20261120090000_init.sql` - kerneskema: 10 tabeller, enums, triggers (auto-profil ved signup, updated_at), RLS (offentlig læsning, login for at bidrage, VIN privat i `car_private`), 20 policies. Syntaks-valideret mod Postgres.
- `supabase/seed.sql` - de 6 DK-modeller + platform. Idempotent.
- **Anvendt på Pixa 20-11-2026** (ny dedikeret instans, se nedenfor). Verificeret: 10 tabeller, 10 m. RLS, 20 policies, 6 modeller.

## Pixa / Supabase-situation (undersøgt i Coolify 20-11-2026)
- Claude når Pixa via Coolifys browser-UI (http://192.168.1.18:8000) og Coolifys container-terminal (= "direkte" Pixa-adgang). Claudes egen cloud-sandbox er netværks-låst og kan IKKE nå Pixa/LAN; Supabase-cloud-API'et i Claude ser kun cloud-projektet `talentry-platform`.
- Coolify-projekt "My first project" / production, server `localhost` (= Pixa). 7 ressourcer: bugherrer, docker-image (Libretranslate), jobtavle, karvia, lejesyn, + 2 Supabase-services.
- **De 2 Supabase-instanser - identificeret:**
  - `supabase-attv9fy0cugo7ol0athiobws` - label **"Karvia"**. Står **Degraded** (⚠️ bør kigges på separat).
  - `supabase-asmzli3ytzonaxou4fmfalee` - ulabelet, men **IKKE ledig**: den er jobtavle + Lejesyns instans. Tabeller i `public`: `job_opslag` (**655 rækker** - jobtavles live-data), `syn` (0 rækker - Lejesyn, ingen data endnu). `auth.users` = 0 på hele instansen (ingen bruger Supabase-auth endnu). "Changes pending" i Coolify.
- **Konklusion:** ingen af de 2 instanser var fri. Pixa havde ~5,5 GiB RAM tilgængelig (af 13 GiB) → plads til en ny.
- **BESLUTTET: A** (ny dedikeret instans). Oprettet i Coolify 20-11-2026:
  - Service: `supabase-zdmeluhkaf6buop6l6vlhj2s`, tagget **`zeekr-garage`** i Coolify (beskrivelses-feltet ville ikke gemme i denne Coolify-version - brug tagget til at genkende den).
  - Running, alle containere healthy. Netværk: "Use the stack network only" (ingen ekstern domæne endnu).
  - Migration + seed anvendt via Coolify-terminal → db-container (`psql`). Overført som base64 + sha256-verificeret (byte-perfekt), da repoet er privat.
  - **App'en forbinder internt:** da instansen kun er på stack-netværket, forbinder Next.js-appen (når den kører på Pixa) via Kong-gateway'ens interne service-navn, ikke en public URL. Connection-detaljer (URL/anon-key/service-key) hentes fra servicens Environment Variables i Coolify når app-skallen bygges.
- **Studio-adgang (LAN):** Zeekr-instansens Kong er mappet til host-port **8002** → åbn `http://192.168.1.18:8002` i browseren. Beskyttet af Basic-auth = servicens **Supabase · Dashboard User/Password** (se felterne i Coolify). Selvhostet Supabase er én-projekt-per-stack, så hver instans har sit eget Studio:
  - 8001 → Karvia-instansen
  - 8002 → Zeekr Garage-instansen (vores)
  - Jobtavle/lejesyn-instansen (`asmzli3…`) har ingen host-port (kun stack-netværk)
  - Port tilføjet i compose: `ports: - "8002:8000"` på `supabase-kong`, redeployet.
- Karvias Supabase (`supabase-attv9fy0…`) står **Degraded** - ifølge Torben pga. opgradering af Supabase til nyeste version (ikke en mystisk fejl). Ikke rørt. Den ulabelede er nu navngivet "Jobtavle og lejesyn" i Coolify; Zeekr-instansen "Zeekr-garage".

## Status / næste skridt
- [x] Repo oprettet + Claude-adgang bekræftet (klonet OK).
- [x] Nyt claude.ai-projekt **"Zeekr Garage"** oprettet; arbejdet flyttet dertil (dette dokument er broen).
- [x] Domæne zeekr-garage.dk registreret.
- [ ] Byg skive 1:
  - [x] Kerneskema som migrations-SQL (syntaks-valideret).
  - [x] Undersøgt Supabase på Pixa - ingen instans var fri (se ovenfor).
  - [x] Oprettet ny dedikeret Supabase-instans (A) + anvendt migration + seed. Verificeret.
  - [x] App-skal (Next.js 14/TS/Tailwind) + Supabase-klienter (@supabase/ssr). `npm run build` grønt.
  - [x] Fejl-board multi-model: offentlig læsning, modelfilter, platform-signal, meld → bekræft/stem (login-styret).
  - [x] Fuldt bugherrer-flow på `/meld`: trin-indikator, type-valg (fejl/ønske), søg-først, genstart-tjek, softwareversion + telefon-felter.
  - [x] **Deployet til Pixa - LIVE på `http://192.168.1.18:3003`** (LAN). Board læser de 6 modeller fra den nye Supabase. ✅
  - [x] **Auto-deploy via n8n-poller** (se afsnit nedenfor) - push → deploy, ingen manuel redeploy. Repo gjort offentligt. Verificeret end-to-end 20-11-2026 (commit `bdd144e` deployet via API-kilde).
  - [x] **Offentlig adgang udefra opsat 20-11-2026** (se "Offentlig adgang (Cloudflare Tunnel)"-afsnittet). zeekr-garage.dk tilføjet som Cloudflare-zone + DNSSEC fjernet hos Simply; tunnel "pixa" udvidet med app + www + api; Coolify build-arg skiftet til public Supabase-URL + intern SSR-URL; redeployet. **Verificeret udefra end-to-end:** login persisterer, melding kan oprettes (skriv), log-ud lander på forsiden - efter 2 bugfixes (cookie-`storageKey` + `0.0.0.0`-redirect).
  - [ ] **← NÆSTE: Skive 2+.** Zeekr-rapporter, Discourse-opsætning + SSO + tematisering, Q&A/guides, AI-dedup + flag-kø. Valgfrit først: SMTP (Resend) til rigtige email-bekræftelser (ellers kører auto-confirm fint).

## App (skive 1) - struktur
- Next.js 14 App Router, standalone Docker-build. `@/`-alias, Tailwind-palet grafit+kobber (`lib/config.ts`, `tailwind.config.ts`).
- Datalag: `@supabase/ssr`. `lib/supabase/server.ts` (auth + SSR, bruger `SUPABASE_INTERNAL_URL` hvis sat), `client.ts` (browser, public URL), `middleware.ts` (token-refresh).
- `lib/queries.ts`: modeller, issues m. koblede modeller + optalte bekræftelser, brugerens egne bekræftelser.
- Sider: `/` (board m. type-filter Alle/Fejl/Ønsker + modelfilter), `/meld` (login-gated, **fuldt bugherrer-flow**, se nedenfor), `/login` (konto: email+password), `/om`, `/auth/callback`, `/logout`.
- **Meldingstyper:** fejl + ønske (bugherrer-paritet). Samme maskineri, kun `issues.type` (enum `issue_type`) adskiller. Migration `supabase/migrations/20261120110000_issue_type.sql` - anvendt på Pixa-instansen.
- **/meld-flow (bugherrer-paritet, `MeldFlow.tsx`):** trin-indikator + 4 trin - (1) **vælg** type (to kort: Fejl / Ønske; springes over hvis `?type=` i URL), (2) **søg** eksisterende (ordmatch filtreret på type, viser match m. "mig med" så dubletter undgås), (3) **tjek** genstart/OTA (kun fejl - bugherrers "Fejl-40"-trin), (4) **udfyld** (`MeldForm`). Ønske springer "tjek" over (Søg → Udfyld).
- **Issue-felter (migration `20261120113000_issue_fields.sql`, anvendt på Pixa):** `software_version` (påkrævet for fejl, mono-chip på board-kort), `phone_model` + `phone_os` (valgfri, kun fejl - telefon-boks i formular). Fanget pr. melding, jf. "model + softwareversion"-princippet.
- Komponenter: `FejlBoard` (filter/søg/sortér, type-badge, kategori-chip, softwareversion-chip), `MeldFlow` (4-trins-flow), `MeldForm` (type-bevidst: felter/ordlyd skifter på fejl vs. ønske), `ConfirmButton` ("mig med" m. modelvalg), `LoginForm`, `Header`, `Footer`, `Tags` (status/alvorlighed/platform-signal).
- RLS styrer alt: læsning fri, skrivning kun egne rækker (authenticated).
- **Deploy-noter:** `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` skal gives som **build-args** i Coolify (bages ind ved build). Anon-key hentes fra Supabase-servicens Environment Variables (`SERVICE_SUPABASEANON_KEY`). Browser-URL skal kunne nås udefra (Cloudflare Tunnel) ELLER på LAN via `http://192.168.1.18:8002` (Kong serverer /rest + /auth med anon-key uden basic-auth; kun Studio-ruten er basic-auth-beskyttet). SSR kan bruge intern Kong-URL via `SUPABASE_INTERNAL_URL`.
- Åbent: Supabase-auth kræver evt. SMTP (GoTrue) for email-bekræftelse, ellers slå auto-confirm til for at password-signup virker uden mail.

## Deploy (Coolify-app) - opsat 20-11-2026
- Coolify-app `zeekr-garage:main-rpcqm0klit7tcvzms7syizxv`, kilde = GitHub App (`troubled-teira…`), repo Tmat-code/zeekr-garage, branch main, build = Dockerfile. **Auto-deploy on push** er slået til.
- **LIVE på LAN:** `http://192.168.1.18:3003` (host-port-mapping 3003:3000 i "Edit Networking → Port mappings"). Brugte 3003 fordi 3000/3001/3002 var optaget.
- Build-args i Coolify (Buildtime+Runtime): `NEXT_PUBLIC_SUPABASE_URL=https://api.zeekr-garage.dk` (var `http://192.168.1.18:8002` i LAN-fasen - skiftet 20-11-2026), `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon JWT>`. Desuden runtime-env `SUPABASE_INTERNAL_URL=http://192.168.1.18:8002` så SSR læser Kong internt på LAN (ingen hairpin ud gennem tunnelen). Browseren når Supabase offentligt på `https://api.zeekr-garage.dk` (Kong serverer /rest + /auth med anon-key, CORS `*`).
- **Auto-confirm slået til:** Supabase-servicens env `ENABLE_EMAIL_AUTOCONFIRM=true` (→ GOTRUE_MAILER_AUTOCONFIRM), Supabase genstartet. Så konto-oprettelse virker uden mail-server.
- Coolify gav også en sslip.io-URL via proxy (port 80), men den peger på WAN-IP (usikker på LAN) - derfor host-porten 3003 til LAN-brug.
- **Offentlig adgang: GJORT 20-11-2026** - se afsnittet "Offentlig adgang (Cloudflare Tunnel)" nedenfor.

## Offentlig adgang (Cloudflare Tunnel) - opsat 20-11-2026
Siden er nu offentligt tilgængelig på **https://zeekr-garage.dk** (+ www + api). Vejen: DNS (Cloudflare) → Cloudflare edge → tunnel "pixa" → Pixa.

- **Domæne/zone:** zeekr-garage.dk er registreret hos **Simply.com**, men var ikke tilføjet til Cloudflare. Tilføjet som zone (Free-plan). Nameserverne pegede allerede på Cloudflare (`javon.ns.cloudflare.com` + `kayleigh.ns.cloudflare.com`) fra et tidligere forsøg, så zonen blev **Active** med det samme. Konto: T.mathiasen@outlook.com.
- **DNSSEC:** zonen var DNSSEC-signeret hos Simply. Da Cloudflare nu er autoritativ, blev DNSSEC **fjernet** hos Simply (DNS administration → Rediger DNSSEC → Fjern) - ellers fejler domænet DNSSEC-validering (SERVFAIL). Kan slås til igen via Cloudflare senere, hvis ønsket.
- **Tunnel "pixa"** (samme tunnel som lejesyn/bugherrer/karvia). 3 nye routes, alle *Published application*, service = `http://192.168.1.18:<host-port>`, DNS-CNAME auto-oprettet (proxied):
  - `zeekr-garage.dk` → `http://192.168.1.18:3003` (app)
  - `www.zeekr-garage.dk` → `http://192.168.1.18:3003` (app; tilføjet fordi Safari auto-prepender "www")
  - `api.zeekr-garage.dk` → `http://192.168.1.18:8002` (Supabase Kong)
- **Coolify:** `NEXT_PUBLIC_SUPABASE_URL` skiftet til `https://api.zeekr-garage.dk` (build-arg → bages ind ved build, kræver redeploy) + ny runtime-env `SUPABASE_INTERNAL_URL=http://192.168.1.18:8002` (SSR internt). Redeployet manuelt (= 1 build oven i det n8n allerede havde kørt på samme commit; ikke dobbelt-firing).
- **Verificeret udefra:** apex + www loader board'et via SSR (6 modeller), gyldigt SSL; klient-side auth når `api.zeekr-garage.dk`.
- **Bug 1 fundet + rettet (login-bounce):** efter login blev man sendt tilbage til /login. Årsag: `@supabase/ssr` udleder session-cookiens navn fra Supabase-URL'ens værtsnavn, og browser (`api.zeekr-garage.dk`) vs server/middleware (intern `192.168.1.18:8002`) gav **forskellige cookie-navne** → serveren fandt ikke sessionen. **Fix:** fast delt `storageKey = 'sb-zeekr-garage-auth'` i `lib/supabase/client.ts`, `lib/supabase/server.ts` og `middleware.ts` (SKAL holdes ens alle tre steder). Beholder den hurtige interne SSR. Virkede ikke på LAN fordi begge URL'er var ens dér.
- **Bug 2 fundet + rettet (redirect til 0.0.0.0):** logout sendte til `https://0.0.0.0:3000/` (ERR_SSL_PROTOCOL_ERROR). Årsag: Next.js standalone binder til `0.0.0.0:3000`, så `request.url` i route-handlers er den interne adresse - en redirect bygget på den peger på 0.0.0.0. Bag tunnelen kommer det rigtige værtsnavn i Host-headeren. **Fix:** ny `lib/url.ts` (`publicOrigin()` læser Host/X-Forwarded-Host + proto; `sikkerSti()` mod open-redirect), brugt i `app/logout/route.ts` og `app/auth/callback/route.ts`. (Samme fælde kan ramme fremtidige server-redirects - brug `publicOrigin`, aldrig `request.url`.) Login-redirect var upåvirket (client-side `window.location.origin` + relativ `router.push`).
- **Klient-cache-note:** rammer man et navn FØR dets DNS-record findes, kan det blive negativt cachet lokalt (Safari viste "kan ikke finde serveren" for www selv efter www var oppe; virkede i privat vindue). Fix: flush DNS / privat vindue / vent ~15-30 min. Kun den ene maskine, ikke nye besøgende.

## Password-reset + SMTP (Resend) - opsat 20-11-2026
Glemt-password virker nu via Resend-SMTP. Magic-link-login er bevidst **ikke** tilføjet (kun password + reset).

- **Resend:** domænet `zeekr-garage.dk` tilføjet + verificeret (DKIM-TXT + 2 CNAMEs `rsend`/`send` via Forge; Resends "Auto configure" lagde DNS-records direkte i Cloudflare efter OAuth-godkendelse). Afsender: `noreply@zeekr-garage.dk`. API-nøgle (Sending access, scoped til domænet) oprettet af Torben - ligger **kun** i Coolify (`SMTP_PASS`), Claude har ikke set den.
- **GoTrue-env på Zeekr-Supabase'en** (Coolify → `supabase-zdmeluhkaf…`, kilde-vars; GOTRUE_*-varianterne afledes):
  - `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=587` (STARTTLS), `SMTP_USER=resend`, `SMTP_PASS=<Resend API-nøgle>`, `SMTP_ADMIN_EMAIL=noreply@zeekr-garage.dk`, `SMTP_SENDER_NAME=Zeekr Garage`
  - `GOTRUE_SITE_URL=https://zeekr-garage.dk` (var `${SERVICE_URL_SUPABASEKONG}`)
  - `API_EXTERNAL_URL=https://api.zeekr-garage.dk` (var `http://supabase-kong:8000` internt → ellers pegede selve mail-linket et sted browseren ikke kan nå udefra)
  - `ADDITIONAL_REDIRECT_URLS=https://zeekr-garage.dk/**,https://www.zeekr-garage.dk/**`
  - `ENABLE_EMAIL_AUTOCONFIRM=true` (uændret - signup kræver ikke bekræftelse; reset sender mail alligevel)
  - Supabase **genstartet** for at anvende.
- **App:** `components/LoginForm.tsx` fik "Glemt password?" (ny `glemt`-mode → `resetPasswordForEmail`). Ny side `app/nulstil/page.tsx` + `components/NulstilForm.tsx` (kræver recovery-session fra linket, sætter nyt password med `updateUser`).
- **Cross-browser + dansk mail (opgradering 20-11-2026):** PKCE-linket (`?code=` via `/auth/callback`) kræver at linket åbnes i SAMME browser som anmodningen (code_verifier er browser-lokal) - fejler ellers med "udløbet/ugyldigt". Skiftet til **`token_hash`**-flow: ny rute `app/auth/confirm/route.ts` (`verifyOtp({token_hash,type})` server-side, ingen code_verifier → virker i enhver browser). GoTrue-mailen peger nu på `/auth/confirm?token_hash=…&type=recovery&next=/nulstil` via en **dansk** skabelon som app'en selv serverer: `app/auth/recovery-email/route.ts` (sat i `GOTRUE_MAILER_TEMPLATES_RECOVERY`). Emne på dansk via `GOTRUE_MAILER_SUBJECTS_RECOVERY`. Default-mailen var på engelsk - derfor skabelonen. Falder template-fetch fra, falder GoTrue tilbage til default (PKCE), så det kan ikke blive værre. `/auth/callback` (PKCE) beholdes til evt. OAuth/magic-link senere.
  - **Coolify-værdier (Zeekr-Supabase, kilde-vars):** `MAILER_TEMPLATES_RECOVERY=https://zeekr-garage.dk/auth/recovery-email`, `MAILER_SUBJECTS_RECOVERY=Nulstil dit password - Zeekr Garage`. Supabase genstartet efter.
  - **Verificeret cross-browser 20-11-2026:** anmod i én browser, klik linket i en anden → virker (nyt password sat, logget ind). Mail på dansk.

## Stave-rettelse æ/ø/å (20-11-2026)
Bruger-synlige labels var skrevet med ASCII-digrafer (Hoej, Bekraeftet, Loest, uafhaengigt) fra et tidligere trin. Rettet til rigtige tegn: `lib/config.ts` (severity `Høj`, status `Bekræftet`/`Løst i OTA`, DISCLAIMER `uafhængigt`), `lib/tid.ts` (`i går`, `måned`/`måneder`, `år`), `app/layout.tsx` (meta-beskrivelse). **Kun display-strenge** - enum-værdier (`hoej`,`bekraeftet`,`loest_i_ota`,`oenske`), CSS-klasser (`bg-loest`) og variabelnavne er bevidst ASCII og urørte (DB/klasse-stabilitet). NB: `perl -CSD` dobbelt-encoder danske literaler - brug Python/Edit til æ/ø/å, ikke perl.

## Admin / "Værkstedet" (roller + moderering) - opsat 20-11-2026
Formands-/moderator-panel, pendant til bugherrers "Byggeledelse" (brugeren sendte 11 skærmbilleder som reference). **Fase 1 bygget:** fundament + moderering + overblik. Resten (nedenfor) er roadmap.

**Arkitektur-valg (afviger bevidst fra bugherrers SQLite-model):**
- **Ingen service_role i app'en.** Admin skriver via sin EGEN authenticated session (anon-key + JWT), styret af RLS. Afløser init-SQL'ens kommentar om service_role-moderering.
- **Rolle på kontoen** (`profiles.role` = `admin`|`moderator`), ikke et parallelt password-/invitationssystem. Login er Supabase.
- Migration `supabase/migrations/20261120140000_admin_roles.sql`: `profiles.role`-kolonne, `er_admin()`/`er_moderator()` (SQL, `security definer` → bypasser RLS internt, undgår rekursion), RLS-skrivepolitikker: `issues_update_mod`/`issues_delete_mod` (moderator retter/sletter alle), `issue_models_delete_mod`, `confirmations_delete_admin` (oprydning), `profiles_update_admin` (rolle-styring).
- **Formand gøres til admin** med: `update public.profiles set role='admin' where id=(select id from auth.users where email='<formandens email>');` (kør i Supabase Studio SQL-editor på Zeekr-instansen).

**Kode (fase 1):**
- `lib/admin.ts` - `adminKontekst()` (user+rolle+navn i ét kald), `erAdmin()`, `erModerator()`.
- `lib/queries-admin.ts` - `getAdminStats()` (tal til tiles), `getSenesteAktivitet()` (forenet feed: nye meldinger + bekræftelser).
- `app/admin/layout.tsx` - server-gate (redirect til `/` hvis ikke moderator) + "🔧 Værkstedet"-header med rolle-badge.
- `app/admin/page.tsx` - Overblik + Modereringstabel.
- `app/admin/actions.ts` - server actions: `saetStatus`, `saetSeverity`, `markerLoest`, `sletMelding`, `gemRedigering` (alle `kraevModerator()`-gated).
- `components/admin/Overblik.tsx` - 4 stat-tiles (meldinger, bekræftelser, åbne, løst) + seneste aktivitet.
- `components/admin/ModereringsTabel.tsx` - client, sorteret efter stemmer: status/alvor-dropdowns, markér løst, redigér (inline), slet (bekræft-step).
- `components/Header.tsx` - "🔧 Værkstedet"-link vises kun for moderator/admin.

**Fase 2 - Forside-besked (bygget 20-11-2026):**
- Migration `supabase/migrations/20261120150000_forside_besked.sql`: `site_announcement`-singleton (id=1, message, active, updated_at/by), RLS læs-alle + `site_announcement_update_admin`. **Skal køres i Studio.**
- `lib/queries.ts`: `getForsideBeskedRaw()` (admin) + `getForsideBesked()` (forside, kun hvis aktiv+tekst).
- `app/admin/actions.ts`: `gemForsideBesked(message, active)` (`erAdmin`-gated).
- `components/admin/ForsideBeskedEditor.tsx`: textarea + Tænd/Sluk + Gem, status-pille.
- `app/page.tsx`: banner øverst på forsiden når aktiv.

**Roadmap (resten af bugherrers panel - ikke bygget endnu):**
- ~~**Zeekr-rapport** (skærm 2,3,6)~~ **BYGGET 20-11-2026** - porteret fra bugherrer. Se eget afsnit "## Zeekr-rapport (porteret fra bugherrer)" nederst.
- ~~**Aktivitet** (skærm 8,9)~~ **BYGGET 20-11-2026:** `/admin/aktivitet` - stat-tiles (hændelser/stemmer/nye meldinger) + søjlegrafer pr. time/ugedag/30 dage, afledt af created_at (dansk tid, `Intl` → Europe/Copenhagen). `lib/queries-admin.ts:getAktivitet()`, `components/admin/BarGraf.tsx`. Link i Værkstedet-header.
- ~~**Adgange** (skærm 5)~~ **BYGGET 20-11-2026:** `/admin/adgange` - giv adgang via email (findes brugeren → rolle sættes nu; ellers pending invitation, rolle sættes automatisk ved signup via opdateret `handle_new_user`-trigger). Liste over personer med rolle + afventende invitationer; skift/fjern rolle; kan ikke ændre egen adgang (lockout-værn). Migration `supabase/migrations/20261120160000_adgange.sql`: `pending_invitations`-tabel + RPC'er `admin_brugere`/`admin_saet_rolle`/`admin_inviter`/`admin_fjern_invitation` (security definer, er_admin-gated) + trigger-opdatering. **Skal køres i Studio.** `components/admin/AdgangePanel.tsx`, link i header.
- ~~**Mistænkelig aktivitet** (skærm 10)~~ **DROPPET** (brugerens beslutning 20-11-2026): fup-skærmen giver ikke mening her - stemmer er konto-bundne (én pr. konto, DB-håndhævet), ikke browser-baserede som bugherrer. Intet fup-panel.
- ~~**Oprydning** (skærm 11)~~ **BYGGET 20-11-2026:** `OprydningPanel` på `/admin` - vælg dato, "Vis antal", dernæst "Fjern N stemmer" (slet bekræftelser før dato via `confirmations_delete_admin`). Server actions `taelBekraeftelserFoer`/`fjernBekraeftelserFoer` (erAdmin-gated). Ingen migration. Nyttig til at rydde test-stemmer før cutover-import.

## Bruger-forside: overblik + kommentarer (bruger-paritet med bugherrer)
Admin-panelet var færdigt, men bruger-siden haltede. To huller (brugerens observation 20-11-2026): forside-overblik manglede, og man kunne kun melde - ingen kunne kommentere.

**Forside-overblik (bygget 20-11-2026):** `components/ForsideOverblik.tsx` - 4 nøgletal (Meldinger / Bekræftet af ejere / Sendt til Zeekr / Løst, afledt af `issues`-arrayet i `app/page.tsx`, ingen ekstra query) + tre "sådan virker det"-kort (Søg først / Bekræft sammen / Send til Zeekr). Hero trimmet. Dette er samtidig landing-page'en i hybrid-form.

**Kommentarer / "Byggemøde" + detalje-side (bygget 20-11-2026):** login-styret v1. Formål: en "fejl" kan være en **fejl 40** (betjeningsfejl); fællesskabet svarer, moderator "markér som løsning", så den fanges før rapporten til Zeekr.
- Migration `supabase/migrations/20261120170000_kommentarer.sql`: `comments`-tabel (issue_id, author_id, body, is_solution) + RLS (læs alle; authenticated skriver egne; forfatter retter/sletter egne; moderator retter/sletter/markerer alle) + touch-trigger. **Skal køres i Studio.**
- `app/melding/[id]/page.tsx` - ny detalje-side: badges, titel, "Meldt {dato} · N bekræftelser", beskrivelse, stor stem-knap (genbrugt `ConfirmButton` m. ny `naeste`-prop til login-redirect), og Byggemøde.
- `components/Kommentarer.tsx` - tråd + skrivefelt (login-gated) + moderering (markér som løsning / ret / slet). Kun én løsning pr. melding (server action nulstiller de andre).
- `app/melding/actions.ts` - `tilfoejKommentar`/`retKommentar`/`sletKommentar`/`markerLoesning`.
- `lib/queries.ts` - `getIssueDetalje()` + `getComments()` (delt `ISSUE_SELECT`/`mapIssue` med board'et). `lib/types.ts`: `Kommentar`.
- `components/FejlBoard.tsx` - board-titler linker nu til `/melding/[id]`.
- Parkeret: anonyme kommentarer (navn + captcha) og "Følg denne fejl" (email uden konto).

**Board-forbedringer (20-11-2026):** board-rækker har nu en eksplicit "Detaljer →"-knap (udover titel-linket), kommentar-tæller (💬 N) i badge-rækken, og detalje-siden framer bekræftelser som "🚗 N biler bekræftet". `comments ( count )` tilføjet til `ISSUE_SELECT` → `IssueRow.comments`. **"Biler bekræftet" = antal bekræftelser**, fordi "mig med" altid kræver at man vælger sin model (hver bekræftelse = én bil). **Variant på bekræftelse (bygget 20-11-2026):** Migration `supabase/migrations/20261120180000_varianter.sql` - `variants`-tabel (model_id, name, display_order) seedet med nordisk lineup (ejer leverede listen) + `confirmations.variant_id`. **Skal køres i Studio.** `ConfirmButton` har nu to-trins-flow: vælg model (hvis flere) → vælg variant (hvis >1); Zeekr 9X (én variant) springer valget over. `getVarianter()` (model_id → varianter) sendt til board/meld/detalje. `getVariantFordeling()` viser fordeling pr. variant på detalje-siden ("🚗 biler bekræftet" + chips).
**Min garage - bil på profil + bil-baseret stemme (bygget 20-11-2026):** brugerens idé, og renere end picker'en. Adgangsmodel: alle læser frit; login er for ejere der vil deltage.
- Migration `supabase/migrations/20261120190000_min_garage.sql`: `profiles.car_model_id` + `car_variant_id`. **Skal køres i Studio.**
- **Oprettelse** (`LoginForm` + `BilVaelger`): vælg model + variant - eller "Ejer ikke en Zeekr endnu". Kort forklaring på HVORFOR (knytter stemmer til rigtig bil → præcise Zeekr-rapporter). Bilen gemmes på profilen efter signup (autoconfirm → session findes straks).
- **Min garage** (`/garage` + `MinGarageForm`): ret bilen senere. Link i header for indloggede.
- **Stemme bil-baseret:** `ConfirmButton` omskrevet - ét klik, bruger `getMyCar()`. Ingen bil → "registrér"-boks (til /garage), kan ikke stemme. Bil men meldingen rammer ikke din model → disabled ("Rammer ikke din X"). Variant-picker'en fra forrige commit er FJERNET (overflødig: man stemmer kun på sin egen bil). `varianter`-prop fjernet fra board/meld/detalje; `getVarianter` bruges nu kun af oprettelse + Min garage, `getVariantFordeling` af detalje.
- `MinBil`-type i `lib/types.ts`.

## Multi-model garage (bygget + LIVE 22-11-2026)
En ejer kan nu registrere FLERE biler, og en bekræftelse knyttes til en konkret bil. Retter skævheden: før kunne man kun have én bil (profil-genvejen), kunne ikke bekræfte på sin anden model, og rapportens bil-fordeling undertalte. **Kilden til alle biler er nu `cars`-tabellen;** `profiles.car_model_id`/`car_variant_id` beholdes som "primær bil" = den der vises i garage-badget overalt (forum/beskeder-embeds er dermed uændrede).

**Beslutning (låst 22-11, implementeret):** en bruger bekræfter for HVER af sine biler. Ejer man to ramte modeller (fx PMA2+-fejl på både 7X + 7GT), bliver det to bekræftelser (én pr. bil) → rapporterne tæller ramte biler præcist. Hver `confirmations`-række bærer stadig `model_id` + `variant_id` (afledt af bilen), så rapport-RPC'erne (`rapport_fejl` m.fl.) er UÆNDREDE - de tæller rækker + joiner variant_id som før; nu er der bare potentielt flere rækker pr. bruger.

**Migration `supabase/migrations/20261122140000_multi_model_garage.sql` - KØRT i Studio + verificeret 22-11-2026** (via Chrome; byte-perfekt hentet fra GitHub-raw, ikke håndkopieret). Verifikation efter kørsel: `cars.variant_id` + `confirmations.car_id` oprettet; ny constraint `confirmations_issue_car_key` findes, gammel `confirmations_user_id_issue_id_model_id_key` væk; hærdet insert-policy på plads; **3 profil-biler → 3 cars-rækker (ingen mistede sin bil); alle 13 live-bekræftelser backfilled med car_id, 0 uden.** Indhold:
- `cars.variant_id` (FK til `variants`, nullable) - en bil bærer nu samme trim-reference som bekræftelser (det gamle `cars.variant` tekst-felt er urørt hardware-metadata).
- `confirmations.car_id` (FK til `cars`, cascade, nullable) - hvilken bil bekræftede.
- **Datamigrering:** én `cars`-række pr. eksisterende profil-bil (kun for profiler uden bil i cars → re-kørbar). Ingen mister sin bil.
- **Backfill:** `confirmations.car_id` sættes fra brugerens bil med samme model (entydigt, da hver bruger havde én bil). Findes ingen match → NULL (rækken tæller stadig).
- **Ombyttet unique-constraint:** fra `(user_id, issue_id, model_id)` til `(issue_id, car_id)`. Den gamle blokerede to biler af samme model (brød "én pr. bil"); den nye forhindrer at én bil stemmer to gange. NULL `car_id` kolliderer ikke (NULL != NULL i Postgres), så gamle/ikke-matchede rækker er uberørte.
- **Hærdet insert-policy:** bilen skal tilhøre brugeren selv (`cars.owner_id = auth.uid()`), udover `user_id = auth.uid()`.

**Kode:**
- `lib/queries.ts`: `getMyCars()` (alle brugerens biler fra `cars`, m. model/variant-navne) + `getMyConfirmedCounts()` (issue_id → antal af MINE biler der har bekræftet; afløser `getMyConfirmedIssueIds`). `getMyCar()` (primær bil) beholdt, men ikke længere brugt af siderne.
- `lib/types.ts`: ny `GarageBil`-type (`carId` + model/variant).
- `components/ConfirmButton.tsx`: tager nu `userCars: GarageBil[]` + `initialMine`. Matcher brugerens biler mod meldingens model(ler); ét klik bekræfter én række pr. matchende bil (upsert på `issue_id,car_id`, idempotent); "fjern" sletter alle egne bekræftelser på meldingen. Titel/tilstand gør pr.-bil tydeligt ("Bekræft med dine 2 biler (én stemme pr. bil)"). Optimistisk optælling = antal matchende biler minus allerede-stemte.
- `components/FejlBoard.tsx` + `MeldFlow.tsx`: `userCar`→`userCars`, `myConfirmedIds`→`myCounts`.
- Siderne `/feedback`, `/meld`, `/melding/[id]`: `getMyCars()` + `getMyConfirmedCounts()`, nye props.
- `components/MinGarageForm.tsx`: omskrevet til liste med **tilføj/fjern bil** (skriver `cars`); synkroniserer profilens primær-bil (tidligste bil, eller ryddet hvis garagen er tom) efter hver ændring. `components/BilVaelger.tsx`: ny `skjulEjerIkke`-prop til tilføj-formen. `app/garage/page.tsx`: henter `getMyCars()`.
- `components/LoginForm.tsx`: ved signup oprettes nu BÅDE en `cars`-række OG primær-bil-pointeren (så nye brugere har en bil i cars fra start).
- Fjerner man en bil, forsvinder dens bekræftelser med den (cascade) - bevidst: så tæller den ikke længere i rapporterne.

**Verificeret:** `npx tsc --noEmit` + `npm run build` grønt; migration kørt + verificeret i Studio; flettet til `main` (fast-forward) → deployet via n8n. **Live-test bestået 22-11-2026 (via Chrome, Torben):** tilføjede en anden 7GT (Long Range RWD) i Min garage → bekræftede en 7GT-fejl ("Fartpilot") → tæller gik **59 → 61** (én pr. bil, netop den sti den gamle constraint blokerede), variant-fordeling Core RWD 15→16 + Long Range RWD 11→12. Fjern-bekræftelse → tilbage til 59; fjernede testbilen → garage tilbage til 1 bil. Al testdata ryddet op. Tilføj/fjern-UI + primær-bil-synk virker.

**Mangler/senere:** "antal ejere pr. model-forum" (separat backlog-punkt) bør når det bygges læse fra `cars`. Badget viser stadig kun den primære bil pr. forfatter (bevidst - kompakt); det er ikke længere en begrænsning, da man nu kan eje flere.

## Zeekr-rapport (porteret fra bugherrer) - bygget 20-11-2026
Admin-eksport af fejl/ønsker til Zeekr som PDF/CSV, med oversættelse, delta-sporing og log. `/admin/rapport` (link 📮 Rapport i Værkstedet-header). Analyseret direkte i bugherrer-repoet.

**PDF - `pdfkit` (ren Node, ingen Chromium).** Faldgruben bugherrer havde løst: pdfkit's AFM-fontfiler kom ikke med i Next standalone-build. Fix i `next.config.mjs`: `serverComponentsExternalPackages:['pdfkit']` + `outputFileTracingIncludes` for `/api/admin/rapport/pdf` → `node_modules/pdfkit/js/data/**`. Route har `runtime='nodejs'`. Verificeret: 15 AFM-filer havner i `.next/standalone/...`. Layout: grafit+kobber (ikke bugherrers gul/sort).

**Oversættelse - selvhostet LibreTranslate** (`lib/oversaet.ts`). POST `${LIBRETRANSLATE_URL}/translate`. da→en direkte; da→sv pivoterer via engelsk. Cache i `oversaettelser`-tabel (issue_id+sprog+kilde_hash). Klumper af 5 (undgå cold-timeout, 30s). **Graceful: ingen `LIBRETRANSLATE_URL` → kun dansk, intet brækker.** `LIBRETRANSLATE_URL` **sat + verificeret 21-11-2026**: `http://libretranslate:5000` (runtime-env på zeekr-garage i Coolify). LibreTranslate er på samme `coolify`-netværk med netværks-alias `libretranslate`, port 5000. Testet fra inde i garage-containeren: `da→en` "God morgen alle sammen" → "Good morning, everybody". `.env.example` opdateret. "Test oversættelse"-knap kører live-diagnose (`oversaetDiagnose`).

**Sendt-sporing + delta.** `issues.sidst_sendt_dato` + `sidst_sendt_stemmer`. "Dan Zeekr-rapport" (kun admin) sætter dem til nu/aktuelt stemmetal + gemmer snapshot i `rapport_markering` → "Fortryd sidste" ruller tilbage. Delta: "NY" (aldrig sendt) / "+N siden sidst". `rapport_log` = revisionslog over downloads.

**Filer:** migration `supabase/migrations/20261120200000_rapport.sql` (kolonner + `rapport_log`/`rapport_markering`/`oversaettelser` + RPC'er `rapport_fejl`/`dan_rapport_markering`/`fortryd_markering`/`rapport_overblik`, security definer, admin-gated på mutationer). **Skal køres i Studio** (forudsætter variant-migrationen). `lib/rapport.ts` (fetchers), `lib/rapport-i18n.ts` (da/en/sv ramme + status), `lib/oversaet.ts`, `app/api/admin/rapport/{pdf,csv}/route.ts`, `app/admin/rapport/{page,actions}.tsx`, `components/admin/RapportPanel.tsx`. pdfkit + @types/pdfkit tilføjet til package.json.

**Forskelle fra bugherrer:** zeekr-garage har eksplicit status (ingen `beregnStatus`); "biler bekræftet" = variant-fordeling fra konto-bundne bekræftelser (ikke browser-votes); multi-model (`modeller` som komma-liste). Notifikationer af følgere ved "sendt" er IKKE porteret (følg-funktionen findes ikke endnu).

## Legacy-import fra bugherrer (støtte bygget 20-11-2026, import afventer data)
Migration `supabase/migrations/20261120210000_legacy_import.sql`: `issues.legacy_stemmer` + `legacy_biler` (jsonb variant-fordeling) + `legacy_bugherrer_id` (unik, idempotent re-import) + `comments.author_navn`. rapport_fejl/dan_rapport_markering/rapport_overblik opdateret så stemmer+variant = **live + legacy**. Display: `mapIssue` viser live+legacy; `getVariantFordeling` fletter; kommentarer viser `author_navn` når `author_id` er null. **Skal køres i Studio.**

**Bugherrers datamodel** (fra repo-analyse): `fejl` (titel, bilmodel=single model-tekst, softwareversion, beskrivelse, status, stemmer=count, type fejl/oenske), `stemmer_log` (browser-token + `ejer_variant` nullable = 7GT-variant), `kommentarer` (navn, tekst). Ingen brugerkonti.

**Sync-strategi:** Bugherrer forbliver kilde indtil cutover. Importen er **re-kørbar** (upsert på `legacy_bugherrer_id`). Live-data født i garage (`legacy_bugherrer_id` null) røres ikke. Importerede kommentarer (`author_id` null) erstattes ved re-import; live-kommentarer bevares.

**Automatisk sync via n8n (bygget 21-11-2026):** bugherrer→garage, to token-beskyttede endpoints + n8n-shuttle. Ingen DB-credentials i n8n.
- **bugherrer** `GET /api/sync/export?token=` (repo Tmat-code/bugherrer, commit 6eef73c): returnerer alle meldinger som JSON allerede mappet til garages form. Kræver `SYNC_TOKEN` env i bugherrer.
- **garage** `POST /api/sync/import` (header `x-sync-token`): kalder RPC `sync_import_bugherrer(jsonb)` via **service-rolle** (`lib/supabase/service.ts`). RPC er security definer + `grant execute ... to service_role` / `revoke from public` → kun service-rolle kan kalde den. Migration `20261121090000_sync_import.sql` **skal køres i Studio**. Kræver env i garage: `SYNC_TOKEN` (samme værdi som bugherrer) + `SUPABASE_SERVICE_ROLE_KEY` (server-kun).
- **n8n**: Schedule → HTTP GET bugherrer-export → HTTP POST garage-import. Begge apps når hinanden via offentlige HTTPS-domæner fra n8n (bekræftet mod eksisterende "Bugherrer notifikation"-workflow, der rammer `https://bugherrer.dk`). Eksport: `https://bugherrer.dk/api/sync/export?token=<SYNC_TOKEN>`; import: `https://zeekr-garage.dk/api/sync/import` (header `x-sync-token: <SYNC_TOKEN>`, body = hele eksport-JSON'en).

**Opsætning udført + testet 21-11-2026 (via browser):**
- Garage Coolify-env sat: `SYNC_TOKEN` + `SUPABASE_SERVICE_ROLE_KEY` (service_role-JWT, kopieret fra Supabase-servicens `SERVICE_SUPABASESERVICE_KEY`). Garage redeployet.
- Bugherrer Coolify-env sat: `SYNC_TOKEN` (samme værdi). Bugherrer redeployet (eksport-route 6eef73c var allerede live).
- Migration `20261121090000_sync_import.sql` kørt i garage-Studio (funktion `sync_import_bugherrer` oprettet).
- **Eksport testet:** `GET bugherrer.dk/api/sync/export` → 200, 31 meldinger, korrekt form (legacy_stemmer, legacy_biler, comments, model_slug, status).
- **Import testet:** ingen/forkert token → 401; rigtig token + `[]` → 200 `{imported:0}` (beviser SYNC_TOKEN + service_role-nøgle + RPC virker).
- **n8n-workflow "Bugherrer → Garage sync"** (id `ye1LXeVmkUUbfhVn`) bygget via n8n REST-API: 3 noder - Schedule (`17 3 * * *`, Europe/Copenhagen) → HTTP GET export → HTTP POST import (header `x-sync-token`, body `={{ $json }}`). **Test-eksekveret end-to-end: imported 31, modtaget 31.** **Published/aktiv** → kører automatisk hver nat 03:17.
- Adresser: Supabase Studio `http://192.168.1.18:8002`; n8n `http://192.168.1.18:5678`. n8n-sessionen er kortlivet - ved nye ændringer skal bruger evt. logge ind igen (browser-bred cookie).

**SYNC FÆRDIG + LIVE 21-11-2026.** Hele kæden testet og kørende: bugherrer-DB → export → n8n → import → garage-DB. Idempotent (upsert på legacy_bugherrer_id), så nattlige kørsler opdaterer de samme records uden dubletter.

**Import udført/klar 20-11-2026.** Bugherrer-data (31 meldinger, 808 stemmer, 24 kommentarer, alle 7GT) hentet fra containeren `pxyx2cwchfcukslle76fzv4n` (`/app/data/bugherrer.db` - bemærk stavning med **u**: bUgherrer.db; WAL-mode, hele mappen skal med). **Re-import-flow:** bruger kører `docker cp <bugherrer-container>:/app/data ~/bugherrer-data`, tar'er og vedhæfter → Claude kører `scripts/import-bugherrer/gen_import.py <db> <out.sql>` → bruger kører den genererede SQL i Studio. **Mapping:** `fejl`→issues (status `Undersøges`→ny, `Sendt til Zeekr`→sendt_til_zeekr, `Løst!`→loest_i_ota; `stemmer`→`legacy_stemmer`; `bilmodel`→issue_models via slug; `telefon`/`telefon_os`→phone_*); variant-fordeling fra `stemmer_log.ejer_variant` (ikke-null)→`legacy_biler`; `kommentarer`→comments (`navn`→author_navn, author_id null); `fejl.loesning_kommentar_id`→`is_solution`. Den genererede `supabase/imports/*.sql` er **gitignoreret** (indeholder rigtige brugernavne/kommentarer - public repo). LibreTranslate-container: `lwwhgirnh9recpzbf1sg7pfw`, URL `http://libretranslate:5000` (Docker-internt, `coolify`-netværk + alias `libretranslate`). **Sat + verificeret 21-11-2026** som runtime-env på zeekr-garage.

## Auto-deploy via n8n-poller (opsat 20-11-2026)
Samme mønster som bugherrer: GitHub kan ikke nå Coolify udefra (lukkede router-porte), så n8n på Pixa "ringer ud" - poller GitHub og trigger Coolify-deploy lokalt. Kæden: **Claude pusher → n8n opdager → Coolify deployer**, ingen manuel redeploy.
- **n8n-workflow "Zeekr Garage auto-deploy"** (kopi af bugherrers, 4 noder): Schedule (hvert 3. min) → HTTP GET `https://api.github.com/repos/Tmat-code/zeekr-garage/commits/main` (header `User-Agent: n8n`) → Code (husker sidste `sha` i workflow static data, kun videre ved ny) → HTTP POST `http://192.168.1.18:8000/api/v1/deploy?uuid=rpcqm0klit7tcvzms7syizxv&force=false` med `Authorization: Bearer <Coolify API-token>`.
- **Genbrugt fra bugherrer:** Coolify API-token `n8n-deploy` (Deploy-ret, deployer alle apps på teamet) + Allowed-IPs (private ranges). Ingen ny token/credential.
- **Repo gjort OFFENTLIGT 20-11-2026:** krævet for at den uautentificerede GET virker (GitHub giver 404 på private repos uden token). Repoet er tjekket rent - ingen committede hemmeligheder (`.env` git-ignoreret, kun `.env.example`-skabelon). Alle nøgler bor i Coolify. Offentligt repo støtter også portfolio-vinklen (Zeekr kan se kvaliteten).

## Landingpage, navneskift & link-side (bygget 21-11-2026)
Forsiden er ikke længere selve boardet. Ny informationsarkitektur:
- **`/` = landingpage** (`app/page.tsx` omskrevet): mørk grafit+kobber-hero (CSS/SVG-lysstreger via `.hero-streaks` i globals.css, skyline-silhuet, reduced-motion-venlig), instrument-stribe med **LIVE tal** (meldinger/bekræftelser/modeller/sendt - afledt af samme `getIssues`/`getModels` som boardet, `force-dynamic`, så de opdateres automatisk med feedback), forum-panel (bærende; **"Live nu" fra 21-11-2026** - model-chips linker ind i model-foraene, CTA "Åbn forummet"; hero-sekundærknap → /forum), feedback-panel ("Live nu" + seneste 3 meldinger + 1→2→3), Min garage/Om-kort. Forsidebesked-banner flyttet ind i hero.
- **Boardet flyttet til `/feedback`** (`app/feedback/page.tsx`) - intro + `FejlBoard` (uændret board-logik). `ForsideOverblik.tsx` er nu ubrugt (kan ryddes senere).
- **Navneskift: "Fejl-board" → "Feedback"** overalt (dækker både fejl OG ønsker; pro-Zeekr, ikke klagemur). Route `/feedback`.
- **`/links`** (`app/links/page.tsx`): bugherrers 14 links porteret + grupperet (Officielt fra Zeekr / Specs & test / Køb / Tilbehør & dele / Praktisk & fællesskab), pro-Zeekr-intro, "vi tjener ikke på links", eksterne i nyt faneblad. Data-drevet array `LINK_GRUPPER`. **Mest 7GT endnu - se Næste op.**
- **`/forum`** (`app/forum/page.tsx`): "Åbner snart"-stub (mørkt panel + underfora-teaser) så header-linket lever indtil forummet bygges.
- **Header** (`components/Header.tsx` + `components/Nav.tsx`): Forum · Feedback · Links · Om + garage/Værkstedet/login. **Mobil-menu (21-11):** på < sm folder nav ud i et burger-drevet panel (client-component `Nav.tsx`) i stedet for at skride ud over skærmkanten; email fjernet fra nav; logo + knapper `whitespace-nowrap` (brækkede ellers "Zeekr Garage"/"Log ud" i to linjer). Logo → `/`, brand i `font-display`.
- **Footer** (`components/Footer.tsx`): opdateret til nye ruter - Forum · Feedback · Links · Om (var "Fejl-board" + "Forum kommer senere" - fulgte ikke navneskiftet). Disclaimeren lever i footeren (alle sider), så forsidens "Om siden"-kort blev erstattet af et "Nyttige links"-kort → `/links` for at undgå gentagelse.
- **Parkeret (21-11): ikke-AI-redesign.** Torben synes designet er "lidt Claude-agtigt". Diagnose: kobber (#c2683f) ≈ Claudes egen ler-accent, og mørk-hero + gradient-glød + bløde afrundede kort = det nuværende AI-design-sprog. To retninger skitseret som preview (ikke i repo): **"Datablad"** (lyst, teknisk, tal som spec-skema, ingeniør-raster) og **"Rå værksted"** (fladt mørkt, blueprint-raster, ingen glød), begge med køligere **bronze (#9c6c3c)**, mono-data (IBM Plex Mono), skarpe kanter. **Torben udskød beslutningen** - nuværende grafit+kobber står. Ved et evt. palet-skift SKAL PDF-rapporten (pdfkit-hex i `app/api/admin/rapport/pdf`) + `tailwind.config.ts` + alle komponenter følge med.
- **Mobil-overflow fixet (21-11):** feedback-sektionens grid-børn manglede `min-w-0` → et bredt barn pressede kolonnen ud over skærmkanten (feedback-panelet "skred" til højre på mobil, "Åbn feedback" blev klippet). Fix: `min-w-0` på grid-børnene, `flex-wrap` + `shrink-0` i panelets header-række, og `overflow-x-clip` på `<main>` i layout som global sikkerhedsline. Verificeret i Torbens Chrome (DevTools iPhone 16 Pro Max, 440px): forside/feedback/links alle 440/440, ingen overflow. **Lære: hold `min-w-0` på flex/grid-børn der kan få bredt indhold.**
- **Tone:** pro-Zeekr ("konstruktiv medspiller, ikke en pressgruppe", "vil se gode biler blive endnu bedre") i hero + feedback + om.
- **Font:** Archivo (display/overskrifter) via **`@fontsource/archivo`** - self-hostet via npm, **INGEN Google-request ved build** (undgår net-afhængig deploy på Pixa). Importeret i `app/layout.tsx` (vægt 500-800); body = systemfont uændret; `font-display`-klasse mappet i `tailwind.config.ts`.
- **Globalt "under opbygning"-banner:** diskret bånd øverst i `app/layout.tsx` på alle sider.
- **Ingen DB-migrationer** (ren frontend på eksisterende queries). `npm run build` grønt.

## Forum (skive 1, custom) - bygget + LIVE 21-11-2026
Diskussionsforum ud over Feedback-boardet. **Custom** (Next.js + Supabase), ikke Discourse (se "Arkitektur"). Supabase = eneste IdP, ingen SSO-bro. UX-forbillede polestar-forum.com (set live via Chrome): grupper → kategori-rækker → trådliste → tråd.

**Datamodel (migration `20261121200000_forum.sql` - KØRT i Studio + verificeret 21-11: 15 kategorier/6 model-fora, 16 RLS-policies, 4 triggers, bump-RPC):**
- `forum_categories` (slug, name, description, icon, group_label, group_order, display_order, model_id nullable, is_locked). Seedet: 4 grupper / 15 kategorier (model-foraene via join til `models`).
- `forum_threads` (category_id, author_id, title, slug, last_post_at + reply_count [denorm.], view_count, is_pinned, is_locked, is_removed).
- `forum_posts` (thread_id, author_id, body, is_opening, edited, is_removed). **Åbnings-indlægget (is_opening) ER trådens tekst** - svar er bare flere posts.
- Triggers er **security definer** (ellers må en der svarer ikke UPDATE'e en fremmed tråd pga. RLS): `forum_post_after_insert` (bump last_post_at + reply_count ekskl. åbning), `forum_post_after_update` (hold reply_count korrekt ved soft-remove), + touch_updated_at. `bump_thread_view(uuid)`-RPC (security definer, grant anon+auth) bumpes fra browseren (`VisningPing`), ikke SSR/bots.
- RLS (16 policies, mønster = issues/comments): læs alle; opret tråd/indlæg = authenticated + egne + ikke i låst kategori/tråd; ret/slet egne; moderator alt.

**Kategori-taksonomi (bevidst INGEN "problemer"-kategori → det ER Feedback-boardet):**
- **Velkommen**: Præsentér dig · Community-regler (`is_locked` - kun moderator opretter tråde).
- **Modellerne** (rygrad): ét forum pr. model (9X/7X/7GT/001/001 Sport/X).
- **Ejer-lounge**: Køb/priser/levering · Anmeldelser & langtidstest · Billeder & videoer.
- **Teknik**: Software & OTA · Opladning & rækkevidde · Tilbehør & dele · App & infotainment.

**Kode:** `lib/forum.ts` (getForumGrupper/getKategori/getTraade/getTraad/getIndlaeg; 3-niveau author-embed `profiles→models/variants` til garage-badge, FK-hints som getMyCar). `app/forum/actions.ts` (opretTraad/svar/retIndlaeg/fjernIndlaeg + moderering saetFastgjort/saetLaast/fjernTraad; dansk slugify). Ruter: `/forum` (grupperet oversigt, afløser stubben), `/forum/[kategori]` (trådliste), `/forum/[kategori]/[traad]` (tråd+svar), `/forum/[kategori]/ny` (opret, login-gated server-side; statisk `ny` vinder over dynamisk `[traad]`). Komponenter under `components/forum/`: `ForumOversigt` (client, kategori-filter), `NyTraadForm`, `ForumTraad` (indlæg + svar + ret/fjern, mønster fra `Kommentarer.tsx`), `TraadModeration` (pin/lås/fjern tråd), `VisningPing`, `GarageBadge`. grafit+kobber, min-w-0 på mobil.

**Det ambitiøse hook:** indlæg bærer automatisk forfatterens garage-badge ("🚗 Zeekr 7GT · Long Range RWD") fra profilen - det Discourse ikke kan. (Senere: antal ejere pr. model-forum, "Opret som feedback"-bro.)

**Verificeret live 21-11:** udlogget (WebFetch) = 4 grupper + 15 kategorier, login-gate korrekt. **Skrive-stien end-to-end verificeret via Chrome som admin (Torben):** opret tråd → korrekt slug + **garage-badge "🚗 Zeekr 7GT · Core RWD" automatisk på indlæg** (hooket virker) + moderering-bar + svar-felt; denorm-tæller + visnings-ping tikkede; "Fjern tråd" virker. Test ryddet op. `npm run build` grønt, deployet via n8n (Coolify grøn). **Første indhold postet 21-11 (via Chrome, som Torben):** fastgjort regel-tråd "Velkommen - sådan er tonen i Garagen" i Community-regler + fastgjort velkomst-tråd "Velkommen i Garagen - sig hej" i Præsentér dig.

**Senere skiver:** tværgående tråd-søgning · følg/notifikationer · ~~Billeder m. upload~~ **BYGGET 22-11 (se "## Billeder i forum-indlæg")** · "Opret som feedback"-bro · antal ejere pr. model-forum · modereringskø i Værkstedet.

## Billeder i forum-indlæg (bygget 22-11-2026)
Brugere kan vedhæfte billeder til forum-indlæg (åbnings-indlæg + svar).
- **Storage:** selvhostet Supabase Storage på **Zeekr-instansen** (container `supabase-storage-zdmeluhkaf…` + `imgproxy-zdmeluhkaf…` - hver Supabase-instans har SIN EGEN isolerede storage+DB; vi deler IKKE med Karvia/lejesyn). Verificeret at Kong ruter `/storage/v1` og at tunnelen eksponerer `https://api.zeekr-garage.dk/storage/v1`.
- **Migration `20261122130000_forum_billeder.sql` (KØRT i Studio 22-11, verificeret: bucket + 4 storage-policies + tabel + 3 policies):** public bucket `forum` (maks 5 MB, kun jpeg/png/webp/gif). Storage-policies på `storage.objects`: public læs; authenticated upload/slet kun i egen mappe (`(storage.foldername(name))[1] = auth.uid()`); moderator slet alt i bucketen. Tabel `forum_post_images` (post_id FK cascade, path, display_order) + RLS (læs alle; insert kun på eget indlæg; slet eget/moderator).
- **Flow:** browseren uploader direkte til Storage (`supabaseBrowser().storage.from('forum').upload('<user_id>/<uuid>.<ext>')` - RLS kræver egen mappe), får path'en, og server-actionen (`opretTraad`/`svar`) gemmer path i `forum_post_images` (RLS: eget indlæg). Visning via offentlig URL `…/storage/v1/object/public/forum/<path>` (`lib/billeder.ts:forumBilledeUrl`).
- **Kode:** `lib/billeder.ts` (URL-helper + grænser: 6 billeder, 5 MB). `components/forum/BilledeUpload.tsx` (filvælger → upload → thumbnails m. fjern; henter selv bruger-id). `opretTraad`/`svar` tager nu `billeder: string[]` (validerer path starter med eget user-id). `getIndlaeg` embedder `forum_post_images` → `ForumIndlaeg.billeder` (offentlige URL'er). `NyTraadForm` + `ForumTraad`-composer har billed-upload; `ForumTraad` viser billeder i indlæg (klik = fuld størrelse i ny fane). Svar kan nu være billede-kun.
- **Mangler/senere:** redigering af et indlægs billeder (edit er pt. kun tekst); oprydning af forældreløse storage-filer ved soft-remove af indlæg (filer bliver liggende, men vises ikke; moderator kan slette manuelt); billeder i beskeder/feedback.

## Forum-kategorier: bruger-ønsker tilføjet (21-11-2026)
Første bruger-feedback → 6 nye kategorier (migration `20261121220000_forum_kategorier_2.sql`, kørt i Studio): **Dæk, fælge & undervogn** + **DIY & FAQ** (Teknik), **Bilpleje & detailing** + **Forsikring, service & værksted** (Ejer-lounge), **Træf, køreture & events** (ny gruppe **Fællesskab**), **Køb, salg & bytte** (ny gruppe **Marked**). Forum har nu 21 kategorier / 6 grupper.
- **"Køb, priser og levering"-tvivlen er dermed løst:** Ejer-lounge "Køb, priser & levering" = ny bil / forhandler / levering; Marked "Køb, salg & bytte" = brugt mellem ejere. De to dækker hver sit, ingen omdøbning nødvendig. (NB: kategori-editoren kan endnu IKKE flytte en kategori mellem grupper - det kræver SQL/mig, eller en udvidelse af editoren.)

## NÆSTE SESSION - plan (aftalt med Torben 22-11-2026)
Rækkefølge: **(1) notifikations-kerne + forum-svar-notifikationer → (2) Adgange: søg alle brugere + tildel rolle → (3) chat/PB oven på notifikationssystemet.** Notifikationer bygges FØRST, fordi de giver værdi alene (forum-svar) og afrisikerer plumbing'en inden den store chat-bid.

**Status 22-11-2026: trin (1) + (2) + (3) BYGGET + LIVE.** Hele NÆSTE SESSION-planen er gennemført (notifikationer, Adgange-søgning, chat/PB). Næste idéer ligger i "Store forum-features" + "Mangler/senere"-noterne.

### 1) Notifikationer (ét samlet system) - BYGGET + LIVE 22-11-2026
Facebook-agtig klokke i nav'en med ulæst-tal; alle features skriver til samme "indbakke". **Trin 1 af planen færdigt.** Første kilde: forum-svar. Plumbingen (tabeller + realtime + RLS + klokke-UI) ligger klar til at chatten (trin 3) kan skrive til samme indbakke.
- **Migration `supabase/migrations/20261122100000_notifikationer.sql` (KØRT i Studio + verificeret 22-11-2026):** 2 tabeller, 7 policies, 1 trigger, notifications i `supabase_realtime`-publication.
  - `notifications` (modtager_id, type, aktoer_id, reference, tekst [denorm.], href, er_laest, created_at) + indeks på (modtager_id, created_at) og partielt ulæst-indeks. `replica identity full` (realtime-UPDATE-payloads).
  - `traad_foelgere` (thread_id, user_id, muted, PK(thread_id,user_id)) - række pr. bruger pr. tråd man selv har skrevet i.
  - **Trigger `forum_posts_notify` (security definer) på `forum_posts` insert:** dækker BÅDE opret (åbnings-indlæg) OG svar. Et svar indsætter notifikation til alle aktive følgere undtagen forfatteren; derefter gøres forfatteren selv til følger (idempotent upsert). Åbnings-indlæg notificerer ingen (ingen andre følgere endnu), men gør opretteren til følger. **Ingen ændring i server-actions nødvendig** - trigger'en gør alt.
  - RLS: ejer læser/markerer/sletter KUN egne notifikationer; INGEN insert-policy (kun trigger via security definer kan oprette). traad_foelgere: ejer styrer egne (mute/unfollow).
- **UI - `components/NotifBell.tsx` (klient):** klokke i headeren (kun indloggede), ulæst-badge (9+ cap), dropdown med seneste 15, klik → markér læst + hop til href, "Markér alle læst". **Supabase Realtime**-abonnement på `notifications` filtreret på modtager_id (så badgen kan tikke live). Luk ved klik-udenfor/Escape.
- **`lib/notifikationer.ts`:** `getUlaestAntal()` (SSR start-tal, ingen tom-blink) + `getNotifikationer()`. `Notifikation`-type i `lib/types.ts`. `components/Header.tsx` henter start-tallet og rendrer klokken før Nav (synlig på desktop + mobil, uden for burger-menuen).
- **Beslutning (bevaret):** KUN tråde man selv har skrevet i (ikke hele model-fora). In-app først, ingen e-mail pr. svar endnu.
- `npm run build` + `npx tsc --noEmit` grønt. Deployet via n8n-poller.

**VERIFICERET end-to-end 22-11-2026 (via Chrome som Torben + Studio, "bruger 2" simuleret i DB):** testtråd af Torben → han blev følger; svar fra anden profil → trigger oprettede notifikation (korrekt modtager/type/tekst/href); **SSR-badge viste "1"**, dropdown listede den, klik markerede læst (badge forsvandt) + hoppede til tråden. Al testdata ryddet op bagefter. **Fungerer: badgen opdateres korrekt ved sidenavigation/genindlæsning.**

**Realtime live-tik LØST + VERIFICERET LIVE 22-11-2026.** Badgen tikker nu op af sig selv, mens siden står åben (uden reload) - bekræftet via Chrome: svar indsat i Studio → klokke gik 0 → 1 live.
- **Fejlsøgning (til næste gang nogen fejlfinder realtime):** infrastrukturen var HELE VEJEN i orden. WS-handshake testet direkte:
  - Kong på host `127.0.0.1:8002` med gyldig apikey → `HTTP/1.1 101 Switching Protocols` (upstream "Cowboy" = realtime). Kong → realtime WS virker.
  - Via tunnelen `https://api.zeekr-garage.dk/realtime/v1/websocket` med **`--http1.1`** → `101 Switching Protocols` (`Server: cloudflare`, `Via: kong`). Hele tunnel-stien virker for et korrekt WS-handshake. (curl med HTTP/2 gav 400 "'connection' header must contain 'upgrade'" - det er en curl-artefakt, ikke browserens adfærd; browsere laver WS korrekt.)
  - Faldgrube: realtime-containerens `LOG_LEVEL=error`, så den logger IKKE almindelige forbindelser. Tom log betyder derfor IKKE "ingen forbindelse".
- **Den egentlige fejl var klient-kode:** realtime-abonnementet brugte kun anon-nøglen, ikke brugerens JWT. Så realtime evaluerede RLS (`modtager_id = auth.uid()`) med `auth.uid()` = null → alle rækker filtreres væk → ingen `postgres_changes`-events nåede browseren.
- **Fix (`components/NotifBell.tsx`, commit `e9dd2ea`):** hent sessionen og kald `sb.realtime.setAuth(session.access_token)` FØR `.subscribe()`; gen-sæt token ved `onAuthStateChange`. Dvs. realtime-forbindelsen bærer nu brugerens JWT, og RLS tillader egne notifikationer. Plus et sikkerhedsnet: opfrisk ulæst-tal + liste når fanen bliver aktiv igen (`visibilitychange`/`focus`). **Lære: ved selvhostet Supabase Realtime + RLS SKAL klienten `setAuth` med brugerens access-token, ellers leveres intet.**
- **Lav genstart af Realtime-containeren** (`docker restart realtime-dev-zdmeluhkaf6buop6l6vlhj2s`) var IKKE nødvendig til sidst - publication-pickup var ikke problemet. Nævnt her så man ikke jager den igen.

**Oprindelig plan (nu opfyldt):**
- **`notifications`-tabel:** modtager_id, type (`forum_svar`, `pb_besked`, senere `mention`/`event`), aktoer_id (hvem udløste), reference (tråd-/samtale-id), kort denormaliseret tekst til visning, `href`, `er_laest`, created_at.
- **`traad_foelgere`-tabel:** række pr. bruger pr. tråd, indsættes automatisk når man **opretter eller svarer** i en tråd. Mute = fjern/flag rækken.
- **Trigger (security definer)** på nyt forum-indlæg: indsæt notifikation til alle følgere **undtagen forfatteren selv**.
- **BESLUTTET: KUN tråde man selv har skrevet i** - IKKE hele model-fora (ville give for mange notifikationer). Ingen "følg et helt forum"-feature nu.
- **UI:** klokke i nav + ulæst-badge, dropdown-liste, klik → markér læst + hop til `href`.
- **Realtime:** Supabase Realtime på `notifications` filtreret på user_id → badge opdaterer live uden refresh. (realtime-servicen kører allerede i stakken.) Samme mekanik driver live-beskeder i chatten.
- **E-mail: IN-APP FØRST.** E-mail pr. svar bliver støjende → senere som opt-in eller daglig samle-mail (Resend findes allerede).
- **RLS:** ejer læser/markerer kun egne notifikationer; indsættelse sker kun via trigger (security definer), ikke direkte fra klient.

### 2) Adgange-forbedring (Værkstedet) - søg alle brugere + tildel rolle - BYGGET 22-11-2026
Admin kan nu søge en hvilken som helst oprettet bruger frem (på navn eller email) og give rollen direkte, uden at kende mailen på forhånd. Email-invitationen beholdt til folk der endnu ikke har oprettet en konto.
- **Migration `supabase/migrations/20261122110000_adgange_soeg.sql` (KØRT i Studio 22-11-2026):** ny RPC `admin_alle_brugere(p_soeg text)` - security definer, `er_admin()`-gated i WHERE (ikke-admin → tom liste, samme mønster som `admin_brugere`). Returnerer ALLE profiler + email/display_name/role/sidst_logget/oprettet, filtreret på `email ilike` / `display_name ilike` (tom søgetekst → alle), `order by (role is null), email limit 50`. **Kan ikke data-testes i Studio SQL-editoren** (auth.uid() er null dér → er_admin() false → 0 rækker); testes i app'en som indlogget admin.
- **`admin_saet_rolle(p_bruger, p_rolle)` genbrugt** (fandtes; null = fjern rolle).
- **`lib/queries-admin.ts`:** ny type `AlleBruger` (som `AdgangBruger` men `role` nullable). **`app/admin/actions.ts`:** ny `soegBrugere(soeg)` (admin-gated, kalder RPC).
- **`components/admin/AdgangePanel.tsx`:** nyt "Søg brugere"-afsnit (søgefelt + knap). Hver træffer: navn/mail + nuværende rolle-badge (eller "ingen rolle") + rolle-vælger (Ingen / Moderator / Admin) → kalder `saetRolle`; egen konto = lockout-værn ("kan ikke ændre egen adgang"). Efter rolle-skift genindlæses søgeresultatet. Viser op til 50.
- `npx tsc --noEmit` + `npm run build` grønt. Deployet via n8n-poller. **Mangler kun: live-verifikation i app'en som admin.**

### 3) Chat / PB mellem brugere - BYGGET + LIVE 22-11-2026
Privat besked-system oven på notifikations-kernen. (Bygget på gren `trin-3-beskeder` mens Claude var på mobil, så migrationen kunne køres i Studio før push; derefter flettet til main.)
- **Migration `supabase/migrations/20261122120000_beskeder.sql` (KØRT i Studio 22-11, verificeret: 5 tabeller, 4 funktioner, 1 trigger, 12 policies, messages i realtime):** tabeller `conversations`, `conversation_participants` (m. `last_read_at`), `messages`, `user_blocks`, `message_reports`. Security-definer-helpere `er_deltager(conv)` + `er_blokeret(conv)` (undgår RLS-rekursion på conversation_participants - samme mønster som er_admin). RPC `start_samtale(p_other)` (find-eller-opret 1:1, blok-tjek). Trigger `message_after_insert` (bump last_message_at + **pb_besked-notifikation** til modtager via kernen - én ulæst pr. samtale, opdateres i stedet for at spamme). RLS: deltagere læser samtale/beskeder; send = egen afsender + deltager + ikke blokeret; blokeringer/anmeldelser egne; moderator læser anmeldelser + må slette beskeder. `messages` lagt i `supabase_realtime` + replica identity full.
- **Backend:** `lib/beskeder.ts` (`getSamtaler`, `getSamtale`, `getUlaesteSamtaler` - separate robuste queries, ingen embedded order/limit). `app/beskeder/actions.ts` (`startSamtaleMedBruger`, `sendBesked`, `markLaest`, `blokerBruger`, `fjernBlok`, `anmeldBesked`). Typer i `lib/types.ts` (`SamtaleRow`/`Besked`/`SamtaleDetalje`/`AndenPart`).
- **UI:** `/beskeder` (indbakke-liste m. anden part + garage-badge + ulæst-prik), `/beskeder/[id]` (`components/beskeder/SamtaleView.tsx` - bobler mig/dig, composer, **realtime m. setAuth-JWT** (samme fix som klokken), markér-læst ved åbning, blokér/fjern-blok + anmeld).
- **Indgang:** "✉️ Skriv"-knap på forum-indlæg (ikke egne, kun indlogget) i `ForumTraad.tsx` → `startSamtaleMedBruger` → hopper til samtalen. "✉️ Beskeder"-link i nav (desktop + mobil) for indloggede.
- **pb_besked i klokken:** notifikations-kernens `NotifBell` viser pb_besked generisk (tekst + href `/beskeder/<id>`); klik hopper til samtalen. `markLaest` rydder pb_besked-notifikationer for samtalen.
- **VERIFICERET LIVE 22-11-2026 (via Chrome, Torben + Test konto):** "✉️ Skriv" på forum-indlæg → samtale oprettet + navigeret; send besked (RLS insert) → boble; **realtime begge veje** (svar indsat i Studio dukkede op live uden reload, setAuth-JWT); **pb_besked-klokke** tikkede live da samtalen var lukket, dropdown viste "Test konto sendte dig en besked", klik → samtale + markér læst; **blokér** → composer deaktiveret. Al testdata ryddet op bagefter (convs/parts/msgs/blocks/pb_notifs = 0).
- **Rettet edge (commit efter):** at anmelde en samtale UDEN beskeder sendte et tomt (ugyldigt) besked-id → `anmeldBesked` sender nu `null` som message_id.
- **Mangler/senere:** gruppe-samtaler (modellen holder til det); billeder i beskeder. (Moderator-visning af anmeldelser er nu bygget - se "## Admin: besked-anmeldelser".)

## Admin: besked-anmeldelser (bygget 22-11-2026)
Moderator-visning i Værkstedet af anmeldte private beskeder. Lukker backlog-punktet `/admin/beskeder`.

- **⚠️ KRÆVER 1 MIGRATION KØRT I STUDIO (ellers viser siden en fejl):** `supabase/migrations/20261122130000_besked_anmeldelser.sql`. Kør den i Zeekr-instansens SQL-editor (`http://192.168.1.18:8002`, Studio). Idempotent (create-or-replace), så kan køres igen uden skade. Ingen ny tabel - kun én RPC.
- **Hvorfor en RPC og ikke bare RLS:** beskeder-migrationen gav allerede `message_reports` + RLS (moderator SELECT/UPDATE på anmeldelser, `messages_delete_mod` på beskeder). MEN `messages_select` er `er_deltager(conversation_id)` - en moderator er ikke deltager i en privat samtale og kan derfor IKKE læse selve besked-indholdet via RLS. Så "RLS er klar" var kun halvt rigtigt: moderatoren kunne se anmeldelses-rækken, men ikke hvad der blev anmeldt → ville moderere i blinde.
- **Privatlivsvalg:** i stedet for en bred `messages_select_mod`-politik (= moderatorer kan læse ALLE private DM'er) eksponerer RPC'en `admin_besked_anmeldelser()` KUN de konkret anmeldte beskeder, beriget med body + afsender-navn + anmelder-navn. Security definer, `er_moderator()`-gated, uhåndterede først. En moderator ser altså kun det, nogen har anmeldt.
- **Filer:**
  - Migration (ovenfor).
  - `lib/queries-admin.ts`: `getBeskedAnmeldelser()` + type `BeskedAnmeldelse` (kalder RPC'en).
  - `app/admin/beskeder-actions.ts`: `saetAnmeldelseHaandteret(reportId, handled)` (RLS `reports_update_mod`) + `sletAnmeldtBesked(reportId, messageId)` (RLS `messages_delete_mod`; markerer bagefter alle anmeldelser på beskeden håndteret). Begge `kraevModerator()`-gated.
  - `components/admin/AnmeldelserPanel.tsx`: client. Filter nye/alle, kort pr. anmeldelse (begrundelse + den anmeldte besked), markér håndteret/ny, slet besked (bekræft-trin), "Åbn samtale"-link.
  - `app/admin/beskeder/page.tsx`: server-side (force-dynamic), henter + viser.
  - `app/admin/layout.tsx`: "🚩 Anmeldelser"-link i Værkstedet-headeren.
- **Adfærd:** besked-FK i `message_reports` er `on delete set null`, så når en anmeldt besked slettes, bliver anmeldelsen stående som historik (vist som "Beskeden er slettet"). Anmeldelse uden udpeget besked (hele samtalen anmeldt, `message_id = null`) vises med begrundelse + "Åbn samtale", uden slet-knap.
- **Verificering:** `npm run build` grøn. Live-test mangler (kræver migration kørt + en rigtig anmeldelse). Test-vej: anmeld en besked som bruger (✉️-flow på `/beskeder/[id]`) → se den i `/admin/beskeder` som moderator.
- **Mangler/senere:** kontekst omkring en anmeldt besked (pt. kun selve beskeden, ikke de omkringliggende - bevidst, af privatlivshensyn); ulæst-badge på header-linket.

## Store forum-features ønsket (bruger-feedback 21-11-2026)
- **Chat mellem brugere + notifikationer** - planlagt til næste session, se "## NÆSTE SESSION - plan" ovenfor.
- **Meetup / events - BYGGET 21-11-2026.** Se eget afsnit "## Events / meetups" nedenfor.

## Events / meetups (bygget 21-11-2026)
Admin/moderatorer opretter events; brugere melder sig til (RSVP); moderator sender en opdatering der (hvis email er sat op) mailes til de tilmeldte. Hænger sammen med forum-kategorien "Træf, køreture & events". Adgang som resten: alt læses offentligt, login for at deltage.
- **Migration `20261121230000_events.sql` (KØRT i Studio):** `events` (title, slug, description, location, starts_at, ends_at, created_by, is_cancelled) · `event_signups` (event_id, user_id, note, unique(event_id,user_id)) · `event_updates` (event_id, body, created_by). RLS: events læs alle / skriv kun `er_moderator`; signups læs alle / insert+update+delete egne; updates læs alle / insert kun moderator. Trigger touch_updated_at. **Security-definer RPC `event_deltager_emails(e_id)`** returnerer de tilmeldtes `auth.users.email`, gated på `er_moderator()` i WHERE (ikke-mod får tom liste) - bruges til mail-udsendelse uden service_role.
- **Email (graceful):** `lib/email.ts` sender via Resend's HTTP-API med BCC (modtagere ser ikke hinanden). `RESEND_API_KEY` (= Resend-nøglen, samme værdi som Supabase-servicens `SMTP_PASS`) er **sat på garage-appen i Coolify + verificeret end-to-end 21-11-2026** (en opdatering blev mailet og modtaget). Valgfri: `MAIL_FROM` (default `Zeekr Garage <noreply@zeekr-garage.dk>`), `MAIL_REPLY_TO`. Uden nøglen vises opdateringer stadig på siden, men mailes ikke. `sendOpdatering`/`sendMailBcc` returnerer en konkret `info` (nøgle mangler / Resend-status / fetch-fejl), der vises i kvitteringen - nyttig til fejlfinding.
- **Kode:** `lib/events.ts` (getEvents kommende/afholdte, getEvent, getMinTilmelding) · `app/events/actions.ts` (opret/ret/aflys/slet/tilmeld/afmeld/sendOpdatering) · ruter `/events` (liste), `/events/[slug]` (detalje + tilmeld + deltagere + opdateringer + admin-panel), `/events/ny` + `/events/[slug]/rediger` (login+mod-gated) · komponenter `TilmeldKnap`, `EventForm` (datetime-local ↔ ISO), `EventAdmin` (rediger/aflys/slet + send-opdatering) · Nav + footer-link "Events".
- **Mangler/senere:** "antal går" / gæster pr. tilmelding · kalender-eksport (.ics) · notifikation ved nyt event (ikke kun ved opdatering) · sæt `RESEND_API_KEY` for at aktivere mails.

## Åbne forum-småting (parkeret 21-11-2026)

## Visningsnavn: bruger kan selv rette (bygget 22-11-2026)
Brugere kan nu selv ændre deres visningsnavn under **Min garage** - før var det låst til delen før `@` i mailen (default fra signup-triggeren), og måtte rettes i SQL. Slår igennem overalt med det samme, fordi forfatter altid hentes live via `profiles.display_name` (ikke kopieret pr. indlæg).
- `components/VisningsnavnForm.tsx` (klient): input + "Gem navn", trim + 2-40 tegn, klient-side `update profiles set display_name` på `auth.uid()`. Samme mønster som `MinGarageForm` (RLS: ejer opdaterer egen profil - ingen migration).
- `lib/queries.ts`: `getMitNavn()`. `app/garage/page.tsx`: felt placeret over bil-vælgeren; intro-tekst justeret ("navn + bil"). Mail vises aldrig offentligt - kun `display_name`.
- SQL-genvej til admin (fx sæt en bruger til et ønsket navn): `update public.profiles set display_name = 'Venø' where id = (select id from auth.users where email = '...');`

## Selvbetjent mail-skift (bygget + opsat 22-11-2026)
Brugere kan selv skifte login-mail under **Min garage** med **dobbelt bekræftelse** (klik på både gammel og ny adresse). Kode + Supabase-opsætning færdig; **afventer end-to-end test**.
- **App (BYGGET):** `components/SkiftMailForm.tsx` (klient): `auth.updateUser({ email }, { emailRedirectTo: <origin>/auth/confirm?next=/garage })`, mail-validering, "sendt"-kvittering der forklarer dobbelt-bekræftelse. Viser nuværende mail. `app/garage/page.tsx`: felt under bil-vælgeren (bruger `user.email`). Genbruger den eksisterende `/auth/confirm`-rute (`verifyOtp({type:'email_change', token_hash})` - samme cross-browser-flow som recovery).
- **Dansk skabelon (BYGGET):** `app/auth/email-change-email/route.ts` - samme mønster som `recovery-email`, link peger på `/auth/confirm?...&type=email_change&next=/garage`. Verificeret live på `https://zeekr-garage.dk/auth/email-change-email`.
- **Supabase-env SAT (22-11-2026, via Coolify → Zeekr-Supabase, Claude satte dem):** `MAILER_TEMPLATES_EMAIL_CHANGE=https://zeekr-garage.dk/auth/email-change-email` + `MAILER_SUBJECTS_EMAIL_CHANGE=Bekræft din nye e-mail - Zeekr Garage` (begge fandtes som tomme Compose-defaults → redigeret, ikke tilføjet). Supabase **genstartet**, kom Running igen, site læser fint.
  - **ENKELT bekræftelse (ændret 22-11-2026):** dobbelt-bekræftelse var for omstændig i praksis (to links i to indbakker, og det ene fuldførte skiftet → man landede på login). Slået om til enkelt bekræftelse: kun den NYE adresse skal bekræftes (ét link, ét klik). Gjort ved at tilføje `GOTRUE_MAILER_SECURE_EMAIL_CHANGE_ENABLED=false` direkte i **compose-filen** (auth-servicens `environment`, ved siden af de andre email_change-linjer) - en løs env-var nåede ikke auth-containeren, da compose kun injicerer de GOTRUE_-linjer den selv indeholder. Redeployet (recreate), site læser fint. Afvejning: med enkelt bekræftelse skal man kun have adgang til den nye mail - fint for et community. Vil man tilbage til dobbelt: sæt linjen til `true` (eller fjern den; default er true).
  - **App-tekst opdateret:** `components/SkiftMailForm.tsx` hint + kvittering siger nu "ét link på din nye adresse" (matcher enkelt bekræftelse).
- **VIGTIGT - admin-vej:** rediger IKKE `auth.users.email` direkte i Table Editor (opdaterer ikke `auth.identities` → login kan gå i stykker). Admin skifter en brugers mail via **Studio → Authentication → Users → rediger** (går gennem admin-API, retter identity korrekt). `display_name` i `profiles` må gerne rettes direkte (det er bare tekst).

## Værkstedet - samlet administration (bygget 21-11-2026)
Ét kontrolrum for HELE sitet: forum + feedback styres ét sted. **Ingen migration** - forum-RLS giver allerede moderator skriveadgang (inkl. `forum_categories` CRUD), så bygget + pushet uden Studio. `npm run build` grønt; deployet via n8n.
- **Akse 1 - Overblik (BYGGET):** `components/admin/Overblik.tsx` har nu forum-tiles (kategorier/tråde/indlæg) + et **samlet aktivitets-feed** der fletter meldinger, bekræftelser, forum-tråde OG forum-indlæg i én tidslinje - nu **klikbart** (hvert punkt linker til meldingen/tråden). `lib/queries-admin.ts`: `getForumOverblik()` + udvidet `getSenesteAktivitet()` (nye kinds `forum_traad`/`forum_indlaeg` + `href`) + `getAdminForum()`.
- **Akse 2 - Moderering (BYGGET):** `/admin/forum` (`app/admin/forum/page.tsx` + `components/admin/ForumModerering.tsx`): seneste tråde (pin/lås/fjern) + seneste indlæg (fjern) direkte fra listen. **Genbruger forum-actions** (`saetFastgjort/saetLaast/fjernTraad/fjernIndlaeg`) - som nu også revaliderer `/admin/forum` + `/admin`. Åbnings-indlæg fjernes via "Fjern tråd" (ikke per-indlæg, så tråden ikke efterlades uden åbning).
- **Akse 3 - Styring (BYGGET):** kategori-styring fra UI på `/admin/forum` (`components/admin/KategoriStyring.tsx` + `app/admin/forum-actions.ts`): opret (navn/gruppe/ikon/beskrivelse), omdøb, flyt op/ned i gruppen, lås/lås op, slet (kun hvis tom - cascade-værn). **Fjerner Studio-afhængigheden for nye kategorier.** Slug holdes stabil ved omdøbning (bryder ikke URL'er). Gated på `er_moderator()` + RLS.
- Forum-link i Værkstedet-header (`app/admin/layout.tsx`).
- **Verificeret live 21-11 via Chrome (Torben, admin):** `/admin/forum` render + modereringskø fanger ny tråd/indlæg; kategori opret + slet (15→16→15) virker uden SQL; "Fjern tråd" virker. Test ryddet op.
- **"Opret som feedback"-bro (BYGGET 21-11-2026):** på en forum-tråd kan en moderator (i `TraadModeration`) klikke "→ Opret som feedback" → `/meld?type=fejl&titel=…&beskrivelse=…&fra=/forum/…` med trådens titel + åbnings-indlæg forudfyldt (beskrivelse kortet til 1200 tegn i URL'en). `MeldForm`/`MeldFlow` fik `initialBody` + `fraForum` (banner om oprindelse); `/meld` læser `?titel/?beskrivelse/?fra` (`fra` kun interne `/forum/`-stier → ingen open-redirect). Moderator udfylder stadig model(ler) + OTA, så det bliver struktureret QA. Binder "forum = snak / Feedback = QA" sammen. **Verificeret live 21-11 via Chrome (Torben, admin):** knap → prefilled `/meld` (banner + titel + beskrivelse), søg-trin kørte dublet-tjek mod importerede 7GT-meldinger, formular nåede med alt forudfyldt. Test ryddet op.
- **Mangler (senere):** ~~redigerbare forum-regler i UI~~ **BYGGET 22-11 (se "## Redigerbare forum-regler")** · antal ejere pr. model-forum · tråd-søgning.

## Model-badge på forum-ikoner (22-11-2026)
De generiske røde bil-emoji (🚗) på model-foraene er erstattet af et **typografisk model-badge** - modellens betegnelse (9X, 001, 001S, X, 7X, 7GT) i en lys grafit-100-chip (samme som emoji-kategorierne) med kobber-700-tekst (Archivo, tabular, tight). (Først prøvet grafit-900/kobber-300 = for sort/tungt på hvid liste, rettet til lys variant.) Ligner et trim-/datablad-mærke: differentierer hver model uden farve. Fravalgt: seks forskellige farver pr. model (ville blive "farvelade" og undergrave det rene/premium look - afklaret med Torben). Topiske kategorier (ikke-model) beholder deres emoji.
- `lib/model-badge.ts`: ren `modelBadge(slug)` - fjerner `zeekr-`-præfiks, hvert ord efter det første → forbogstav (`zeekr-001-sport` → `001S`). Nye modeller følger automatisk med.
- Brugt i: `components/forum/ForumOversigt.tsx` (oversigts-rækker, `modelId != null`), `app/forum/[kategori]/page.tsx` (kategori-header), `app/forum/[kategori]/[traad]/page.tsx` (breadcrumb - lille badge). `getTraad` embedder nu `model_id`; `ForumTraadDetalje.kategori` fik `modelId`.
- DB uændret: `forum_categories.icon` beholder stadig '🚗' for model-fora, men feltet ignoreres nu i rendering af model-rækker. Ingen migration.
- `npx tsc --noEmit` grønt. Deployet via n8n-poller.

## Feedback-kategorier: 9 faste spande (22-11-2026)
`issues.category` var et frit tekstfelt (alle skrev deres eget → ubrugeligt til filter). Nu en **fast liste af 9 spande** (`ISSUE_CATEGORIES` i `lib/config.ts`, lagret som slug): Kørehjælp & ADAS · Kørsel, bremser & understel · Opladning & rækkevidde · Skærm, stemme & infotainment · App, lås & forbindelse · Lys, ruder & udsyn · Klima, sæder & kabine · Hjul, dæk & TPMS · Andet. Udledt af meldingerne + Zeekr-manualens 22 afsnit komprimeret til ejer-venlige spande.
- **Oprettelse** (`components/MeldForm.tsx`): fri-tekst-feltet er nu en **krævet** dropdown (gemmer slug). "Andet" er sikker udvej, så kravet koster intet. Feltet vises for både fejl og ønsker (ikke gated på type). Gælder kun nye meldinger - de ~31 gamle mærkes op i Værkstedet.
- **Board-filter** (`components/FejlBoard.tsx`): "Alle kategorier"-dropdown ved siden af søgefeltet. **Standard = Alle**, så intet skjules.
- **Kuratering** (`components/admin/ModereringsTabel.tsx`): kategori-dropdown pr. række i Værkstedet + action `saetKategori` (moderator, validerer slug, revaliderer /admin + / + /feedback). Det er her de ~31 eksisterende mærkes op.
- **Ingen migration, ingen databrud:** kolonnen var allerede tekst; `category` vises ingen steder som label (kun brugt i søgning), så gamle fri-tekst-værdier bevares urørt og dukker bare op under "Alle" indtil de re-mærkes. `kategoriLabel()`-helper falder tilbage til rå værdi hvis en slug ikke kendes.
- `tsc` + build grønt.
- **Næste (aftalt retning):** samme 9 spande genbruges som emne-mærker på forummet (tag + filter, ikke nestede rum) - men først når forummet har tråde. Overvej at vise kategori-chip på board-rækkerne og i rapporten (grupper efter spand → stærkt QA-materiale til Zeekr).

## Feedback-board: status-filter + dæmpede rækker (22-11-2026)
Boardet (`/feedback`, `components/FejlBoard.tsx`) blev for langt til at bevare overblik. Nyt status-segment ved siden af type-filteret: **Aktive** (standard) / Afsluttet / Alle.
- Aktive = ny + bekraeftet + sendt_til_zeekr (den røde tråd). Afsluttet = afklaret + loest_i_ota (udfald).
- Standard-visning er nu kun aktive, så listen er kortere fra start. I "Alle"-visning **dæmpes** afsluttede rækker (`opacity-60`), så aktive står frem. Rent klient, data fandtes allerede, ingen migration. `tsc` + build grønt.
- Arkitektur-retning aftalt (ikke bygget endnu, så visionen ikke smuldrer):
  - **Fælles emne-rygrad** for feedback + forum: bil-subsystemer (Kørehjælp & ADAS, Lys & udsyn, Skærm & infotainment, Opladning & rækkevidde, Klima & komfort, App & forbindelse, Kørsel/understel/bremser, Hjul/dæk/TPMS, + Andet). Udkast - skal afprøves på feedback først.
  - **Feedback-kategorier (næste konkrete skridt):** `issues.category` er allerede fri tekst (MeldForm beder om det frit → derfor rodet). Lav det om til en **fast liste** (dropdown ved oprettelse + filter på board + kuraterbar i Værkstedet). Ingen migration (kolonnen er tekst). Kræver en engangs-kategorisering af de ~31 eksisterende.
  - **Forum:** allerede struktureret (model-rum under "Modellerne" + emne-rum under Teknik/Ejer-lounge/Fællesskab/Marked/Velkommen) - men **tomt for tråde**. Konklusion: strukturér IKKE mere nu; et tomt forum er et indholdsproblem. Lad struktur vokse ud af rigtige tråde; favorisér søgning + visninger ("seneste aktivitet", "ubesvarede", "min model") frem for flere tomme rum. Polestar-forummet (272 sider, flad) er advarslen, ikke skabelonen.

## Status "afklaret" + kommentar-badge i Værkstedet (22-11-2026)
To ting Torben manglede i moderingen (`/admin` → "Alle meldinger", `components/admin/ModereringsTabel.tsx`):

1. **Kommentar-synlighed:** moderings-rækkerne viste ikke om en melding havde svar. Nu en kobber-badge "💬 N svar" i titelrækken der **linker til `/melding/{id}`** (åbner i ny fane), så man kan læse kommentaren inden man sætter status.
2. **"Markér løst" tvang "Løst i OTA":** knappen satte altid status `loest_i_ota`, selv når der ingen OTA-fix var (fx en fejlinformeret bruger afklaret i en kommentar). Nu er "✅ Markér løst" et **valg** ("Løst hvordan?" → **✅ Løst i OTA** eller **💬 Afklaret**), samme to-trins-mønster som Slet.

- **⚠️ KRÆVER 1 MIGRATION KØRT I STUDIO:** `supabase/migrations/20261122160000_status_afklaret.sql` - `alter type public.issue_status add value if not exists 'afklaret'`. Idempotent. **Indtil den er kørt vil "Afklaret"-knappen fejle** (enum-værdien findes ikke i DB endnu) - resten virker fint.
- **Ny status `afklaret`** = afsluttet uden OTA-fix. Tilføjet i `lib/config.ts` (STATUSES + STATUS_STYLE, chip `bg-grafit-200 text-grafit-700`, 💬), `lib/rapport-i18n.ts` (da "Afklaret" / en "Clarified" / sv "Klarlagt"), og vises som StatusTag på `/melding/[id]` + det offentlige FejlBoard. Statuslisten er nu `ny → bekraeftet → sendt_til_zeekr → (afklaret | loest_i_ota)`.
- **TPMS-meldingen Torben fejl-markerede:** når migrationen er kørt, kan han selv rette den fra "Løst i OTA" til "Afklaret" via status-dropdownen i rækken.
- **Ikke rørt:** rapport-generering inkluderer stadig alle statusser (afklaret-items vises som "Afklaret" i en rapport). Hvis afklarede/ikke-fejl skal ude af Zeekr-rapporten, er det en separat opgave.
- `tsc` + build grønt (i18n er `Record<Status,...>`, så typecheck tvang alle 3 sprog med).

## Kommentar-badge på feedback-boardet (22-11-2026)
Kommentartallet pr. melding på `/feedback` var en lille grå `· 💬 N` sidst i chip-rækken - nem at overse. Nu vises det som en tydelig kobber-badge (`bg-kobber-50 text-kobber-700`, "💬 N svar"), så man straks ser hvilke meldinger der har svar. Ren visning: `components/FejlBoard.tsx`, intet nyt data (comments-tallet fandtes allerede via `getIssues`), ingen migration. `tsc` + build grønt.
- **Senere (ikke bygget):** "nyt siden sidst"-markering (uløste/nye svar siden brugeren sidst så meldingen) kræver per-bruger læse-tracking (ny tabel) - bevidst fravalgt til denne lille opgave.

## Redigerbare forum-regler (bygget 22-11-2026)
Forummets fælles spilleregler kan nu redigeres fra Værkstedet i stedet for kun at leve som en fastgjort tråd. Moderator/admin retter teksten ét sted; den vises offentligt på `/forum/regler`.

- **⚠️ KRÆVER 1 MIGRATION KØRT I STUDIO (ellers viser siden bare en "reglerne er på vej"-besked - går ikke ned):** `supabase/migrations/20261122150000_forum_regler.sql`. Kør i Zeekr-instansens SQL-editor (`http://192.168.1.18:8002`, Studio). Idempotent (`create table if not exists` + `insert ... on conflict do nothing`), kan køres igen uden skade.
- **Datamodel:** singleton-tabel `forum_rules` (id=1, content, updated_at/by) - samme mønster som `site_announcement`. RLS: læs alle (offentligt); **opdater gated på `er_moderator()`** (bevidst moderator, ikke admin - resten af `/admin/forum`, dvs. kategori-styring + moderering, er også moderator). Migrationen **seeder** et sæt default-regler på dansk (tone, hold trådene skarpe, billeder/privatliv, marked, moderering), så siden har indhold fra første stund.
- **Robust før migration:** `lib/forum-regler.ts:getForumRegler()` fejler blødt (fanger læsefejl hvis tabellen mangler → returnerer tom) så `/forum`, `/forum/regler` og `/admin/forum` ikke vælter, mens migrationen afventer at blive kørt.
- **Format (simpelt, ingen rå HTML):** `## ` = underoverskrift, `- ` = punkt, tom linje = nyt afsnit. Renderes sikkert som React-elementer i `components/forum/ReglerIndhold.tsx` (parser, ingen `dangerouslySetInnerHTML`).
- **Filer:**
  - Migration (ovenfor).
  - `lib/forum-regler.ts` - `getForumRegler()` + type `ForumRegler`.
  - `app/admin/forum-actions.ts` - `gemForumRegler(content)` (`kraevModerator()`-gated, revaliderer `/admin/forum` + `/forum` + `/forum/regler`).
  - `components/admin/ForumReglerEditor.tsx` - klient-editor (textarea + "Gem regler" + "sidst ændret"-tid; kun aktiv når teksten er ændret).
  - `app/admin/forum/page.tsx` - ny "Forum-regler"-sektion nederst (henter `getForumRegler()` parallelt med resten).
  - `components/forum/ReglerIndhold.tsx` - sikker renderer.
  - `app/forum/regler/page.tsx` - offentlig visning (breadcrumb Forum / Regler, "Opdateret {relativ tid}", Feedback-henvisning). Statisk segment `regler` vinder over dynamisk `[kategori]` (ingen kategori har slug `regler`).
  - `app/forum/page.tsx` - synligt "Ny her? Læs forum-reglerne"-link i forum-intro'en.
- **Forholdet til den fastgjorte regel-tråd:** den eksisterende fastgjorte tråd "Velkommen - sådan er tonen i Garagen" i Community-regler kan blive stående som velkomst/snak; de **kanoniske** regler bor nu på `/forum/regler` (redigerbare uden at poste/redigere en tråd).
- **Verificering:** `npx tsc --noEmit` + `npm run build` grønt. **Live-test mangler** (kræver migrationen kørt i Studio): derefter som admin → Værkstedet → Forum → "Forum-regler" → ret tekst → Gem → se `/forum/regler`.
- **Mangler/senere:** rich-text/preview i editoren (pt. rå tekst + simpelt format); evt. versionshistorik.

## Næste op
- ~~**Alle manualer på /links**~~ **AFKLARET 21-11-2026:** zeekr.eu's manual-vælger (på `/contact`) er model→år→**variant**→sprog, og manualen er **variant-specifik** (fx 7GT: Core RWD / Long Range RWD / Privilege AWD → forskellig `ven=`). Derfor er ét direkte link pr. model forkert - `/links` bruger et **vælger-link** (`zeekr.eu/contact`) der dækker alle modeller + beholder det direkte 7GT-link. Vælgeren har 7X, 001, X, 7GT (+9X); ingen separat "001 Sport" (deler 001's manual). Verificeret i Torbens Chrome. Intet mere at gøre her, medmindre vi vil hardcode én default-variant pr. model.
- **Forum - SKIVE 1 BYGGET + LIVE 21-11-2026** (custom, Next.js + Supabase). Se afsnittet "## Forum (skive 1, custom)" ovenfor for datamodel/kode/status. Discourse fravalgt; Supabase = eneste IdP, ingen SSO-bro. Modsætningen i dokumentet ryddet (Arkitektur + Sektioner + Åbne spørgsmål opdateret). Resten af dette punkt er den oprindelige plan (nu opfyldt for skive 1):
  - **UX-forbillede: polestar-forum.com** (grupper m. overskrift + undertekst → kategori-rækker: ikon · titel (fed) · beskrivelse · antal tråde · antal indlæg/visninger · seneste aktivitet → trådliste → tråd). Top-bar: søgefelt + "Opret tråd". Rene rækker. Offentligt læsbart, login kun for at skrive.
  - **Grupper/kategorier (afledt af Polestars live-struktur, set 21-11 via Chrome - 4 gruppe-overskrifter, hver m. kategori-rækker):**
    1. **Velkommen** - Præsentér dig · Community-regler.
    2. **Modellerne** (rygrad) - ét forum pr. model: 001, 001 Sport, 7X, 7GT, X, 9X (templated undertekst "Alt om [model]").
    3. **Ejer-lounge** - Køb/priser/levering · Anmeldelser & langtidstest · Billeder & videoer.
    4. **Teknik** - Software & OTA · Opladning & rækkevidde · Tilbehør & dele · App & infotainment.
  - **Bevidst fravalg:** INGEN "Problemer & pålidelighed"-kategori. Polestar har én (`Problems and Reliability`) som ustruktureret klage-tråd - hos os ER det Feedback-boardet (struktureret QA bundet til bil/OTA/variant/rapporter). En forum-tråd der viser sig at være en rigtig fejl → "Opret som feedback". Skærper "forum = snak, Feedback = struktureret QA".
  - **Live-observationer (Polestar/Fora, 21-11):** kategori-række = ikon · fed titel · beskrivelse · antal tråde (💬) · visninger (👁) · seneste aktivitet. Top-bar = stor centreret søgning + Create thread. Siden er proppet med reklamer (DigiKey/Air France/HBO/"Grow Your Business"/affiliate) - vores **nul-reklame-renhed er i sig selv en synlig opgradering** og bekræfter den ikke-kommercielle positionering.
  - **Det ambitiøse hook (kernen):** forummet kender ejer-grafen. Hvert model-forum kan vise antal ejere (fra Min Garage). Indlæg bærer automatisk forfatterens garage-badge ("Zeekr 7GT · Long Range RWD · OTA 1.2") fra profilen. Blød bro til Feedback: en tråd der viser sig at være en rigtig fejl → "Opret som feedback" (prefill /meld). Forum = snak, Feedback = struktureret QA.
  - **Foreslået datamodel (custom-tabeller, samme Zeekr-Supabase):** `forum_categories` (slug, navn, beskrivelse, ikon, model_id nullable, gruppe-label, display_order, is_locked) · `forum_threads` (category_id, author_id, titel, slug, created_at, last_post_at [denorm.], reply_count [denorm.], view_count, is_pinned, is_locked) · `forum_posts` (thread_id, author_id, body, created_at, edited, is_removed). Denorm. tællere + last_post_at via triggers (samme touch/count-mønster som issues/comments). RLS: læs alle (SSR/SEO), skriv authenticated, ret/slet egne, moderator alt. Genbrug `profiles` (bil) + roller (admin/moderator).
  - **Slice 1:** migration (tabeller + enums + triggers + RLS + seed kategorier - køres i Studio FØR push) · ruter `/forum` (grupperet oversigt, afløser stubben), `/forum/[kategori]` (trådliste), `/forum/[kategori]/[traad]` (tråd + svar), `/forum/[kategori]/ny` (opret, login-gated) · komponenter genbruger Header/Footer/grafit+kobber + skrive-mønster fra `Kommentarer.tsx` · garage-badge på indlæg · søg + "Opret tråd" i top-bar · basal moderering (pin/lås/fjern for moderator). Afløser "Åbner snart"-stubben i `app/forum/page.tsx`.
  - **Senere skiver:** tværgående søgning, følg/notifikationer, Feedback-broen, Billeder m. upload, modereringskø i Værkstedet.

Konventioner som resten: grafit+kobber (ikke Claude-grøn/blå); æøå via Edit/Python, aldrig perl; **almindelig bindestreg "-" i dansk tekst, aldrig lange tankestreger (— og –), overalt - UI, kode, HANDOVER**; migrationer køres i Studio FØR kode pushes (PostgREST er all-or-nothing); commit+push direkte til main; opdatér HANDOVER ved hver ændring.

## Åbne spørgsmål (bekræft i nyt projekt)
- ~~SSO-retning mellem Discourse og custom-app~~ **BORTFALDET 21-11-2026:** Discourse fravalgt, forum bygges custom → Supabase er eneste IdP, ingen SSO-bro.
- bugherrer er SQLite; her bruges Supabase/Postgres. "Genbrug bugherrer" = app-laget (Next.js/TS, UI, deploy-flow), ikke data-laget.
