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
- `issues` (titel, beskrivelse, kategori, alvorlighed, status: ny → bekræftet → sendt til Zeekr → løst i OTA)
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

## Status / næste skridt
- [x] Repo oprettet + Claude-adgang bekræftet (klonet OK).
- [ ] Opret nyt claude.ai-projekt **"Zeekr Garage"**; flyt arbejdet dertil (dette dokument er broen).
- [x] Domæne zeekr-garage.dk registreret.
- [ ] Byg skive 1.

## Åbne spørgsmål (bekræft i nyt projekt)
- SSO-retning mellem Discourse og custom-app (hvem er identity-provider?) — afklares ved opsætning.
