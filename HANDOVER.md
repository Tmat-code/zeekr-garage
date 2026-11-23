# HANDOVER - Zeekr Garage

> Uofficielt, uafhængigt community-site for Zeekr-ejere i Danmark/Norden.
> Dette dokument er projektets sandhedskilde. **Opdateres ved hver ændring.**
> **Historik:** færdige, historiske per-feature-sektioner er flyttet til `HANDOVER-ARKIV.md` (23-11-2026). Dette dokument = top-note + backlog + beslutninger/platform + de seneste par features. Når en "Se ## ..."-henvisning ikke findes her, står sektionen i arkivet.
> **Seneste (23-11):** P23 - Værkstedets forside + nav + aktivitets-feed. /admin er nu et rent dashboard (Overblik med tal-tiles for Feedback + Forum og "Åbn Feedback/Forum →"-genveje, et Genveje-kort-gitter med Feedback fremhævet først, + forside-besked-editoren); feedback-moderingstabellen + oprydnings-værktøjerne (Oprydning-stemmer + forældreløse storage-filer) er flyttet til ny fane `/admin/feedback`. Aktivitets-feedet er delt op (`getSenesteAktivitet` erstattet af `getFeedbackAktivitet` + `getForumAktivitet`): forum-aktivitet (tråde/svar) vises nu under Forum-fanen, feedback-aktivitet (meldinger/bekræftelser) under Feedback-fanen - ikke længere én blandet strøm på forsiden. Nav gentænkt: faste titel + konto/site-handlinger (Til forsiden/Log ud) øverst, og en egen wrap-venlig fane-række (ny `AdminNav` client-komponent, ikon + kort label, aktiv-markering via `usePathname`) der nu rummer Overblik + Feedback som egne faner og wrapper til næste linje efterhånden som P20/P21 lægger flere flader til. Ren kode, ingen migration. Build + tsc grøn. Se "## Værksted: forside + nav + aktivitets-feed (P23)". Forrige: Design-session P20 + P21 - moderings-kernen tegnet (sanktions-model, handling-med-grund + officiel besked via notif-kernen, forum-rapport-knap + kø, fælles audit-log, admin/moderator-snit, nav-pasform) med byggerækkefølge (P23 -> delt kerne -> P21 byg -> P20 byg) + 4 migrationer (M1-M4). INGEN kode/migration kørt. Se "## Moderings-kerne: design-oplæg (P20 + P21)". Forrige rettelse: Indlæg-tælleren på Værksted-Overblikket talte indlæg fra fjernede tråde med (`fjernTraad` sætter kun trådens `is_removed`, ikke indlæggenes). `getForumOverblik` (`lib/queries-admin.ts`) tæller nu kun indlæg hvis tråd heller ikke er fjernet (`!inner`-join på `forum_threads`). Build + tsc grøn; deployes via n8n-poller.

**Sidst opdateret:** 2026-11-23 (HANDOVER splittet - de færdige, historiske per-feature-sektioner er flyttet til `HANDOVER-ARKIV.md`; dette dokument er nu top-note + backlog + beslutninger/platform + de seneste par features (P13, P12). Al historik bevaret i arkivet. Forrige ændring: P13 - Events-polish, tre dele. (1) **.ics-kalendereksport:** download-knap "📅 Føj til kalender" pr. event (route `app/events/[slug]/ics/route.ts` → `lib/ics.ts`), streamer ét **VEVENT** (ikke et feed) som `text/calendar` m. `Content-Disposition: attachment`. Åbner i Apple/Google Kalender. Eksplicit **Europe/Copenhagen** via indlejret VTIMEZONE (CET/CEST-DST) + TZID på DTSTART/DTEND; **STATUS:CANCELLED** (+ "AFLYST:"-præfiks) når `is_cancelled`; **SEQUENCE** afledt af `updated_at` (sekunder siden `created_at`) så en opdateret/aflyst event overskriver den gamle i kalenderen (samme UID). Ingen DB-ændring. (2) **Antal gæster pr. tilmelding: DROPPET** (Torben 23-11) - ja/nej-tilmelding beholdt, `event_signups` uændret. (3) **Notifikation ved nyt event:** trigger `event_after_insert` på events-INSERT lægger en 'nyt_event'-klokke-notif hos **alle** brugere (undtagen opretteren selv - samme "ikke mig selv"-mønster som `forum_post_notify`/`message_after_insert`); kun INSERT, ikke updates; security definer; genbruger notifications-indbakke + realtime. NotifBell fik per-type-ikon (📅 nyt_event, 💬 forum_svar, ✉️ pb_besked, @ mention, 🔔 fallback). **⚠️ KRÆVER migration `20261123190000_nyt_event_notif.sql` kørt i Zeekr-Studio (8002)** før notifikationen virker live (.ics + knap virker uden migration). Verificeret: build grøn + lokal Postgres 16 (ikke-moderator afvist på event-insert; moderator-opret → notif til alle andre, ikke opretter; UPDATE/aflysning udløser INGEN ny notif; null-opretter → alle; RLS: bruger ser kun egne) + 19 .ics-checks inkl. node-ical round-trip (korrekt UTC-instant sommer CEST + vinter CET, STATUS/SEQUENCE, escape, folding ≤75 oktetter). Se "## Events: polish (P13)". Forrige: P12 - Gruppe-samtaler i beskeder: en samtale kan nu have flere end to deltagere. `conversations` udvidet med `is_group`/`created_by`/`title` (eksplicit FLAG, ikke afledt af deltager-antal, så en gruppe ikke kollapser til en genbrugelig 1:1 når nogen forlader den). Al medlems-mutation via security-definer-RPC'er (`start_gruppe` + `gruppe_tilfoej_deltager`/`gruppe_fjern_deltager`/`gruppe_forlad`/`gruppe_omdoeb`), så RLS forbliver stram (ingen bred insert/delete-policy på deltager-tabellen). Oprettelse fra `/beskeder/ny` (multiselect: 1 = 1:1 som før, 2+ = gruppe m. valgfrit navn); afsender-navn pr. besked i gruppe-visning; medlems-panel i samtale-headeren (KUN opretteren tilføjer/fjerner/omdøber, ALLE kan forlade); gruppe-label afledes af deltagernavne når titel mangler. P10 (billeder), P15 (skjul-for-mig), anmeldelser og notifikationer er UÆNDREDE på grupper - serve-ruten + RLS-helperne (`er_besked_deltager`/`er_besked_afsender`/`er_deltager`) er antals-uafhængige, og `message_after_insert` looper allerede over alle deltagere (nu m. gruppe-tekst "X skrev i <gruppe>"). `start_samtale` fik et `is_group=false`-værn i genbrugs-opslaget. **KRÆVER migration `20261123180000_gruppe_samtaler.sql` kørt i Zeekr-Studio (8002)** før gruppe-oprettelse/-administration virker live (til da renderer eksisterende 1:1-samtaler uændret). Verificeret: build + 15+ RLS/adgangs-checks i lokal Postgres 16 (kun deltagere læser/skriver en gruppe; udenforstående afvist begge veje; opretter-gating på tilføj/fjern; forlad uden gruppe-kollaps; billed-privatliv holder med N deltagere; blokering afviser oprettelse). Se "## Beskeder: gruppe-samtaler (P12)". Forrige: P19 - Admin-styrede links på links-siden: links + grupper ligger nu i DB (`link_groups` + `links`) med admin-CRUD i Værkstedet på `/admin/links`, security-definer RPC'er (`er_admin()`-gated), offentlig læsning. Hvert link kan valgfrit tagges med **en eller flere** modeller (`link_models`-kobling; ingen = gælder alle - en samlet forhandler-/webshop-side kan derfor stå ÉN gang med et badge pr. model den fører); et model-filter på `/links` dukker op af sig selv, når ≥2 modeller er repræsenteret. Seedet med de hidtidige links + nye officielle modelsider pr. model (9X/7X/7GT/X/001) og model-specifikke tests/pris/tilbehør (gennemgået med Torben 23-11). Struktur valgt: emne-grupper + model-tag (model = filter), IKKE pr-model-nestning (tomme rum - samme grund som forum-IA'en). **KRÆVER migration `20261123170000_links.sql` kørt i Zeekr-Studio (8002)** før siden læser fra DB (til da falder den tilbage til en indbygget kopi af samme links, så intet brækker). Verificeret: build + RLS/RPC i lokal Postgres 16 (offentlig læsning; anon kan ikke skrive; non-admin afvist på alle RPC'er; admin CRUD + flyt; slet nægtet på ikke-tom gruppe; `on delete set null` bevarer links når en model slettes). Se "## Nyttige links: admin-styret (P19)". Forrige: P10 - Billeder i beskeder: afslutter billed-sporet (P3 -> P8 -> P9 -> P10). En besked kan nu vedhæfte 1..n billeder (kun-billede tilladt = mobil-kamera snap-og-send) og vise dem i samtalen. **Det afgørende: privatliv.** Modsat forum/meld (public buckets) ligger besked-billeder i en **PRIVAT bucket `besked`** uden offentlig/bred læse-policy; de hentes via en **authz'd serve-rute** `/beskeder/billede/[...]` der på hvert hit tjekker at kalderen er uploader eller samtale-deltager, før bytes streames via service-rollen. Ingen signed-URL-token der kan videresendes; moderatorer får bevidst IKKE billed-læsning (kun deltagere), i tråd med besked-anmeldelser. **KRÆVER migration `20261123160000_besked_billeder.sql` kørt i Zeekr-Studio (port 8002)** før det virker live. Verificeret: build + 13 RLS/privatlivs-checks i lokal Postgres 16 (kun parter kan læse/skrive; udenforstående + moderator afvist; privat bucket; upload kun i egen mappe; ingen direkte storage-listing). Se "## Beskeder: billeder (P10)". Forrige: P6 - Antal ejere pr. model-forum.)

---

## Arbejdsgang - sessioner (regel 22-11-2026)
- **Én opgave pr. session.** Når en opgave er løst (bygget + verificeret + HANDOVER opdateret + pushet), lægger Claude SELV op til at starte en NY session til næste opgave - vi fortsætter ikke bare i samme session. Backloggen nedenfor er broen, så den friske session har alt med.
- Grunden: hver session holder sig fokuseret og kontekst-let, og de gode opbygnings-vinkler går ikke tabt i en lang, komprimeret tråd.

## Backlog - prioriteret (sidst opdateret 22-11-2026)
> Ét sted for "hvad mangler", i den rækkefølge vi tager det. **Én opgave pr. session**, oppefra og ned. Tag altid P1; spring kun ned hvis P1 er blokeret. Stryg et punkt når det er bygget + verificeret + pushet + HANDOVER opdateret. Detaljer står i sektionerne nedenfor; for allerede byggede punkter (P-numre) ligger per-feature-sektionen typisk i `HANDOVER-ARKIV.md`.
>
> Prioriterings-logik: 1) styrk QA-sagen mod Zeekr (= målet), 2) gør Torbens daglige kuratering holdbar, 3) forum-findbarhed/liv, 4) polish/roadmap.

### Næste op (byg i denne rækkefølge)
> QA-værdi øverst (bygges nu uanset trafik). **Forum-klyngen** (P4 søgning, P5 auto-moderering, P6 ejer-antal) forudsætter rigtig forum-trafik - forummet er pt. tomt for tråde - så de kan bygges proaktivt, men hastes ikke før der kommer liv i forummet.
> **Prioriteret rækkefølge (aftalt 23-11, mod launch):** 1) **P20+P21 design-session** (moderings-kerne; design-først, informerer nav'en i P23), 2) **P23** (Værksted-forside + nav + aktivitets-feed), 3) **P21 byg**, 4) **P20 byg**, 5) **P22** (avatar), 6) **P16**, 7) **P5** (parkeret til forum-trafik). **Launch-gating ops kører PARALLELT, ikke i bygge-rækken:** kør de ventende migrationer i Studio (P10/P12/P13/P17/P18/P19) + lidt forum-seed + en frisk gennemklikning; selve launch/udmeldingen = cutover (bugherrer pensioneres + sluk den natlige n8n-sync). Moderering (P20/P21) er bevidst IKKE launch-gating - launch kan ske med moderatorer + nuværende blokér/anmeld, og moderings-klyngen bygges oven på den rigtige trafik (åben beslutning: Torben kan vælge at bygge P20/P21 før udmelding).
- [x] **P2 - Ryd op i den tætpakkede moderings-række i Værkstedet.** BYGGET 22-11 (ingen migration). Se "## Værksted: oprydning af moderings-rækken (P2)".
- [x] **P3 - Billeder i feedback-meldinger.** BYGGET 22-11. **Kræver migration kørt i Zeekr-Studio (port 8002) før det virker live** - se "## Feedback-meldinger: billeder (P3)". (Billed-sporet: P3 ✓ → P8 → P9.)
- [x] **P4 - Tværgående tråd-søgning (forum).** BYGGET + LIVE 23-11 (migration kørt i Studio 8002 + deployet). Postgres full-text search (dansk ordbog) på tværs af alle kategorier/model-fora; match i trådtitler + indlæg (åbning + svar); fjernede tråde/indlæg udeladt; relevans-ranking + highlightet uddrag. **+ scope-filter** (søg i ét forum, fx 7GT) + **rum-søgning** på hver kategori-side; gamle "Find en kategori"-boks fjernet. Se "## Forum: tværgående tråd-søgning (P4)".
- [ ] **P5 - Auto-moderering (forum): AI-flagning af grov tone/personangreb.** **PARKERET 23-11 til der er forum-trafik** (Torben: kan ikke designes/tunes meningsfuldt mod et tomt forum - tærskler, false-positives og kø-UX kræver rigtige tråde med rigtig tone at måle imod; ender ellers som gætværk der skal rives op igen). Løftes når forummet har liv. Mål: holde forummet civilt - "et forum Zeekr kan være stolt af". **Fase 1 = flag-only:** AI markerer forum-tråde/svar med mulig grov tone/personangreb og lægger dem i en kø i Værkstedet; moderator bekræfter. **Ingen auto-skjul/slet** (passer på "kø, ikke patrulje" + undgår at gøre brugerne uret). **Kun forum-indhold** - IKKE feedback-meldinger (dem kuraterer Torben selv før rapport, og de 31 er allerede i god tone). Autonomi (auto-skjul-til-review) kan øges senere. Beslægtet med AI-dedup-roadmap. Medium/større (model-kald + kø-UI). **NB: hele auto-modereringen skal tænkes ordentligt igennem FØR der bygges - start P5-sessionen med design/afklaring (hvilken model/prompt, hvad flagges, tærskler/false-positives, kø-UX, privatliv, kost/latens, hvornår kaldes den), ikke med kode - og først NÅR der er data at designe imod.**
- [x] **P6 - Antal ejere pr. model-forum.** BYGGET 23-11 (**ingen migration** - ren kode). Social proof på model-foraene fra Min garage (`cars`), ikke fra forum-tråde, så foraene er substantierede selv med 0 tråde. Forum-oversigten viser kobber-chip "N ejere" på model-rækker; model-kategori-siden viser "N ejere i Garagen · N biler · N bekræftelser" øverst. Server-side aggregering af distinkte `owner_id` pr. `model_id` (`cars`/`confirmations` er read-all). Verificeret: build + lokal Postgres (7GT = 3 ejere/3 biler/11 bekræftelser). Valgfri DB-view til skalering: `supabase/sql-snippets/p6_model_ejer_tal_view.sql`. Se "## Antal ejere pr. model-forum (P6)".
- [x] **P7 - Kategori-editor: flyt en kategori mellem grupper i UI.** BYGGET 23-11 (ingen migration - ren kode). Flyt kategori mellem grupper (dropdown) + omsortér grupperne (pile ved gruppe-overskrift); flyt-op/ned i gruppen + omdøb/ikon/beskrivelse/lås fandtes allerede. Model-fora beskyttet (fast i Modellerne). Fjerner den sidste SQL-only pligt for kategori-kuratering. Se "## Værksted: kategori-editor flyt mellem grupper (P7)".
- [x] **P8 - Redigering af et indlægs billeder** (edit var kun tekst). BYGGET 23-11 (ingen migration). Se "## Forum-indlæg: redigering af billeder (P8)". (Billed-sporet: P3 ✓ → P8 ✓ → P9.)
- [x] **P9 - Oprydning af forældreløse storage-filer.** BYGGET 23-11 (ingen migration/SQL - ren kode). Meld-sletning rydder filer straks; forum-soft-remove bevarer bevidst filer (reversibelt); admin-sweep i Værkstedet rydder ægte orphans i begge buckets. Afslutter billed-sporet. Se "## Forum/Meld: oprydning af forældreløse storage-filer (P9)".
- [x] **P10 - Billeder i beskeder.** BYGGET 23-11. **KRÆVER migration `20261123160000_besked_billeder.sql` kørt i Zeekr-Studio (8002)** før det virker live (til da renderer samtalen fint, men billed-upload/visning fejler). Afslutter billed-sporet (P3 -> P8 -> P9 -> P10). Genbrug: `BilledeUpload` (bucket=`besked`, egen privat `urlFor`) + `BilledeGalleri` (uændret). **Afklaring (min vurdering):** en besked må være KUN-billede (tekst valgfri når ≥1 billede) - passer til mobil-kamera; gruppe-samtaler holdt ude (P12), kun eksisterende 1:1. **Privat bucket + authz'd serve-rute** (ikke public-URL-mønsteret). Verificeret: build + 13 RLS/privatlivs-checks i lokal Postgres. Se "## Beskeder: billeder (P10)".
- [x] **P19 - Admin-styrede links på links-siden.** BYGGET 23-11 (⚠️ **KRÆVER migration `20261123170000_links.sql` kørt i Zeekr-Studio (8002)** før siden læser fra DB; til da indbygget fallback-kopi). Struktur valgt med Torben: emne-grupper + valgfrit model-tag (model = filter, ikke pr-model-nestning). Seedet inkl. nye modelsider pr. model + model-tests/pris/tilbehør (hele links-listen gennemgået 23-11). Se "## Nyttige links: admin-styret (P19)". Baggrund: tidligere var links-siden (`app/links/page.tsx`) **fuldt hardcodet** i konstanten `LINK_GRUPPER` (grupper: Officielt fra Zeekr · Specs & test · Køb, pris & leasing · Tilbehør & dele · Praktisk & fællesskab) - Torben kan ikke selv tilføje/redigere links uden kodeændring. **Oplæg:** flyt links + grupper til DB (fx `link_groups` + `links`, display_order pr. begge) + admin-CRUD i Værkstedet (samme mønster som kategori-editoren P7 / Modeller-panelet P17/P18: security-definer RPC'er, `er_admin()`-gated, offentlig læsning). Så kan Torben selv lægge links, omdøbe/omsortere grupper osv. **Åbent (Torben 23-11, "jeg ved det ikke"):** skal siden deles op smartere - fx en dedikeret "Leasing"-sektion, eller links pr. model (som forum-foraene) i stedet for de nuværende emne-grupper? Afklares i sessionen. Medium (migration + admin-UI). NB: de 2 autohus-links (privatleasing + nye biler) er lagt ind som indhold 23-11 under "Køb, pris & leasing" - de bliver til DB-seed når feature'en bygges.
- [x] **P12 - Gruppe-samtaler i beskeder.** BYGGET 23-11. **⚠️ KRÆVER migration `20261123180000_gruppe_samtaler.sql` kørt i Zeekr-Studio (8002)** før gruppe-oprettelse/-administration virker live (eksisterende 1:1 renderer uændret til da). Datamodellen holdt allerede til det (`conversation_participants` er en join-tabel); tilføjet: `is_group`/`created_by`/`title` på `conversations` (flag, ikke afledt af antal), RPC'er `start_gruppe`/`gruppe_tilfoej_deltager`/`gruppe_fjern_deltager`/`gruppe_forlad`/`gruppe_omdoeb` (security-definer, opretter-/deltager-gated), `start_samtale` fik `is_group=false`-værn. UI: `/beskeder/ny` multiselect (1 = 1:1, 2+ = gruppe m. valgfrit navn), afsender-navn pr. besked i grupper, medlems-panel (opretter administrerer, alle kan forlade), indbakke viser gruppe-label + deltagerantal. **Valg truffet med Torben 23-11:** kun opretteren administrerer (ikke alle deltagere); navn valgfrit (afledes ellers af navne). P10/P15/anmeldelser/notifikationer uændret på grupper (verificeret). Se "## Beskeder: gruppe-samtaler (P12)".
- [x] **P13 - Events-polish.** BYGGET 23-11. **⚠️ KRÆVER migration `20261123190000_nyt_event_notif.sql` kørt i Zeekr-Studio (8002)** før nyt-event-notifikationen virker live (.ics + knap virker uden migration). **Afklaringer truffet 23-11:** (1) .ics = **download-knap pr. event** (VEVENT, ikke feed) - åbner i Apple/Google Kalender; (2) **antal gæster pr. tilmelding DROPPET** (behold ja/nej-tilmelding, ingen ændring på `event_signups`); (3) notifikation ved **nyt** event = klokke-notif til **alle** brugere (kun INSERT, ikke updates). Se "## Events: polish (P13)".
- [x] **P14 - Polish.** FÆRDIG 23-11. (1) Fjernet ubrugt `ForsideOverblik.tsx` (død kode fra "feedback-var-forsiden"-æraen; forsiden er nu en landingpage m. tal+trin bygget direkte ind i `app/page.tsx`). (2) End-to-end-test af selvbetjent mail-skift **bestået live** (Torben, 23-11) - enkelt-bekræftelse, dansk mail, `/auth/confirm`, login med ny mail. Se "## Selvbetjent mail-skift".
- [x] **P15 - Bruger-sletning af samtaler.** BYGGET 22-11 (skjul-for-mig). Se "## Beskeder: bruger-sletning af samtaler (P15)".
- [x] **P17 - Tilføj model i Værkstedet (ny model under Modellerne).** BYGGET 23-11. Admin-only "+ Tilføj model"-flow på `/admin/forum` → models-række + model-forum (model_id, under Modellerne) + 0..n varianter atomisk via security-definer RPC `admin_opret_model`. **⚠️ KRÆVER migration `20261123140000_tilfoej_model.sql` kørt i Zeekr-Studio (8002) før knappen virker live** (indtil da renderer siden fint, men "Opret model" fejler). Kørt + live-testet af Torben 23-11 (to testmodeller oprettet; varianter verificeret). + opfølgnings-polish: delt `ModelBadge`-komponent (badge vises nu også i Værkstedet, matcher forummet; boksen vokser så lange betegnelser ikke flyder ud). Se "## Tilføj model i Værkstedet (P17)". **TILBAGE: tilføj-halvdelen er løst, men slet/arkivér mangler → P18 (den lukker model-siden helt).**
- [x] **P18 - Slet/arkivér model i Værkstedet (modstykket til P17).** BYGGET 23-11. Modeller-panel i "Tilføj model"-sektionen på `/admin/forum` (admin-only): brugs-tal pr. model + Slet (kun tom) / Arkivér (i brug) / Genaktivér. `models.archived`-kolonne + 3 security-definer RPC'er (`admin_model_oversigt`, `admin_slet_model`, `admin_saet_model_arkiv`). `getModels()` filtrerer `archived=false`. **⚠️ KRÆVER migration `20261123150000_arkiver_model.sql` kørt i Zeekr-Studio (8002)** før panelets handlinger + arkiv-filtrering virker (til da falder siden pænt tilbage til ufiltreret). Verificeret med build + RPC-SQL i lokal Postgres 16 (slet-værn, arkiv→ude af vælg-lister men tæller i rapport, genaktivér, non-admin afvist). Lukker model-siden helt - al model-kuratering kan nu ske i UI uden SQL. Se "## Slet/arkivér model i Værkstedet (P18)".
- [ ] **P16 - Forum-moderering i Værkstedet viser kun de 25 seneste.** `getAdminForum(25)` (`lib/queries-admin.ts`) henter de 25 nyeste tråde + 25 nyeste indlæg, sorteret nyest først; `app/admin/forum/page.tsx` kalder med 25. Vokser forummet forbi det, falder ældre tråde/indlæg ud af moderings-visningen (de kan STADIG modereres direkte på selve forummet - det er kun Værksteds-overblikket der er afkortet). Fix-muligheder: (a) paginering / "vis flere", (b) søg/filtrér i modererings-listen (flugter med P4-søgestrategien), (c) filtrér til "kræver opmærksomhed" (fx anmeldte/nyeste uden moderering) i stedet for ren nyeste-liste. Haster ikke med nuværende 3 indlæg; løft før forummet får rigtig trafik. Medium. Beslægtet med P4 (søgning) + P5 (flag-kø).
- [ ] **P20 - Bruger-administration i Adgange (overblik + sanktioner).** DESIGN LAGT 23-11 (se "## Moderings-kerne: design-oplæg (P20 + P21)" - delt kerne, byggerækkefølge + migrationer M1/M4). Ikke hastende (få brugere endnu). Idé (Torben 23-11): Adgange (`components/admin/AdgangePanel.tsx`, `/admin` → Adgange) kan i dag kun søge en bruger frem + tildele rolle (`admin_alle_brugere` + `admin_saet_rolle`). Udvid til et egentligt **bruger-overblik + administration**: se brugere (navn, mail, rolle, oprettet, sidst logget, evt. garage/aktivitet) og **handle på en bruger** - suspendér/ban, kontakt (moderations-besked, se P21), og evt. slet. **Skalering (Torbens egen pointe):** skal holde ved 3-4000 brugere → ikke en rå liste. Søg-først (findes), + paginering/filtre (rolle, status aktiv/suspenderet, nyeste, sidst aktive) - samme afkortnings-problem som P16, løs samme vej. **Åbent (afklares i sessionen):** (a) **ban vs. suspendér vs. slet** - min anbefaling: suspendér/ban (konto kan ikke bidrage, indhold + historik bevaret) som primær; "slet" er destruktiv (cascader `cars`/`confirmations`/forum/beskeder) og sjældent nødvendig → overvej GDPR-anonymisér (behold indhold, fjern persondata) frem for hard-delete. Afklar hvad ban teknisk betyder (kan ikke logge ind / kan logge ind men ikke skrive / indhold skjules). (b) Datamodel: `profiles.status`/`banned_at`/`banned_by`/`ban_reason` eller en `user_sanctions`-tabel m. historik; håndhæves i skrive-stierne (forum/besked/meld tjekker ikke-banned). (c) **Audit-log** over sanktioner (hvem/hvornår/hvorfor) - delt med P21. (d) Gating: admin for ban/slet; evt. moderator for advarsel. Medium/større (migration + RLS på alle skrive-stier + admin-UI).
- [ ] **P21 - Gentænk moderering: handling + begrundelse + besked til brugeren.** DESIGN LAGT 23-11 (se "## Moderings-kerne: design-oplæg (P20 + P21)" - delt kerne, byggerækkefølge + migrationer M1/M2/M3). Ikke hastende. **Problem (Torben 23-11, enig):** dagens forum-moderering (`/admin/forum`) kan kun fastgør/lås/fjern tråd + indlæg - ingen begrundelse, ingen besked til forfatteren, intet spor. Fjerner man en dublettråd, får brugeren intet at vide om hvorfor; der er heller ingen vej til at påtale dårlig opførsel. Det er reelt tråd-CRUD, ikke moderering. **Oplæg:** gør hver moderations-handling til en **handling-med-begrundelse** der kan notificere den berørte bruger: (1) ved fjern tråd/indlæg vælges grund (dublet → link til original, tone, off-topic, spam, andet) → forfatteren får en moderations-notifikation m. grunden; (2) en separat **kontakt/advar bruger**-handling (uafhængig af en konkret tråd) til dårlig opførsel - deles med P20; (3) en moderations-besked bør se **officiel** ud, ikke en ligeværdig peer-DM → genbrug notifikations-kernen (system/moderator-notits i indbakken) frem for en almindelig `messages`-samtale. Afklar: ren notifikation eller notifikation + kvitterbar besked. (4) **Audit-log** over moderations-handlinger - samme log som P20. **Relateret:** P5 (AI flag-kø = indgående), besked-anmeldelser findes for PB - men **der er INGEN rapportér-knap på forum-indhold i dag** (bekræftet 23-11: trådens moderationslinje har kun moderator-handlingerne Opret som feedback / Fastgør / Lås / Fjern tråd; en almindelig bruger kan ikke melde et indlæg). En **indgående bruger-rapport-kø på forum-indhold** hører derfor med i gentænkningen, ikke bare som åbent spørgsmål. P16 (moderings-overblik) overlapper UI'et. Start sessionen med at tegne moderations-modellen (handlinger, grunde, besked-kanal, log, hvem må hvad) før kode.
  - **Delt kerne P20+P21:** "moderations-handling på en bruger" (suspendér/ban + moderations-besked + audit-log) tegnes ÉN gang og genbruges af begge. Overvej at tage dem i samme design-session.
- [ ] **P22 - Profilbillede (avatar) på brugere, vist på deres oplæg.** Idé (Torben 23-11): brugere kan uploade et profilbillede, der vises på de indlæg/tråde de laver - mere personligt, styrker fællesskabet. **Oplæg:** `profiles.avatar_path` (migration, lille) + upload på profilen (hvor visningsnavn allerede kan rettes, se arkiv "## Visningsnavn: bruger kan selv rette"). Billede i en **offentlig** bucket (profiler + deres indhold er allerede offentligt - samme mønster som forum-billeder, IKKE den private besked-bucket). Genbrug `BilledeUpload`/komprimering; **kvadratisk, lille, klient-resize**, maks-størrelse som de øvrige. **Vises:** forfatter på forum-tråde + svar (`ForumTraad`), trådliste-forfatter, kommentarer (`Kommentarer`), evt. ved garage-badgen; **fallback = initialer/placeholder** når der ikke er noget billede. **Moderering (vigtig kobling):** en avatar er en offentlig, bruger-uploadet billedflade → skal kunne fjernes af moderator (upassende billede) og rydder-op-sweepet (P9) skal kende `avatar`-bucket. Hægtes på P21-moderingen (fjern avatar = en moderations-handling med grund + evt. besked). **Åbent:** vis avatar i beskeder/indbakke også? (sandsynligvis ja, lille ekstra); crop-UI eller bare center-beskær. Medium (migration + upload-UI + render flere steder).
- [x] **P23 - Værkstedets forside: gør landingen til et neutralt Overblik, flyt Feedback til egen fane.** BYGGET 23-11 (ingen migration - ren kode). Se "## Værksted: forside + nav + aktivitets-feed (P23)". Oprindelig idé (Torben 23-11): når man går på Værkstedet, lander man på feedback-Overblikket **plus hele feedback-moderingstabellen** (+ Oprydning-stemmer + forældreløse billed-filer), mens alt andet (Forum, Links, Anmeldelser, Rapport, Aktivitet, Adgange) ligger som faner i undermenuen. Feedback er altså både "forsiden" OG implicit sin egen fane - inkonsekvent. **Oplæg:** `/admin` (`app/admin/page.tsx`) bliver et rent **dashboard** (de eksisterende tal-tiles for Feedback + Forum + evt. genveje - dashboardet beholder tal-overblikket), og feedback-moderingstabellen + oprydnings-værktøjerne flytter til en ny **Feedback-fane** (`/admin/feedback`) på linje med de øvrige. **Aktivitets-feed deles op (Torben 23-11):** "Seneste aktivitet - hele sitet" blander i dag forum-tråde og feedback-bekræftelser i én strøm - rodet. Fordel den, så **forum-aktivitet hører under Forum-fanen og feedback-aktivitet under Feedback-fanen** (hver slags aktivitet hos sit eget område), i stedet for én fælles blandet strøm på forsiden. Tilføj "Feedback" i Værksteds-undernavigationen. **Note:** feedback-boardet er Torbens mest brugte moderings-flade, så bevar den ét klik væk - fx en tydelig "Feedback"-tile/genvej på dashboardet. Ren kode (flyt komponent til ny rute + nav-punkt), ingen migration. Lille/medium. Polish, haster ikke. Overlapper P16/P20 (samme afkortnings-/overbliks-UI). **Nav-plads (Torben 23-11):** Værksteds-undermenuen er allerede fuld (Forum · Links · Anmeldelser · Rapport · Aktivitet · Adgange · Til forsiden · Log ud) - en Feedback-fane til sprænger rækken. Så **nav'en skal gentænkes, så den rummer mere**: fx wrap/overflow-række, ikon + kort label, gruppering, eller en venstre sidebar-nav i Værkstedet i stedet for den vandrette række. Vigtigt da P20/P21-moderering sandsynligvis tilføjer endnu flere flader. Afklar nav-mønster som del af opgaven.

### Senere / roadmap (ikke planlagt endnu)
- [ ] **Åben/live chat (kun hvis trafik).** PARKERET 23-11 (Torben). Idé: et åbent/live chat-rum hvor folk "mødes". Fravalgt nu fordi synkron chat har et hårdt cold-start-problem (tomt rum uden samtidige brugere), og behovet er allerede dækket: forummet = det åbne/strukturerede, beskeder (P12) = det private, Events = koordinering af at mødes, og den planlagte Facebook-gruppe = det løse/sociale live-lag. Byg IKKE i beskeder (ville bryde privatlivsmodellen - privat bucket, "kun deltagere", blokér). Hvis det løftes en dag: egen "åbne kanaler/rum"-feature med eget design-oplæg, gerne hægtet på et Event så rummet har en grund til at være i gang. Revurdér kun når der er rigtig trafik OG et konkret ønske fra rigtige brugere.
- [ ] Q&A / guides-sektion.
- [ ] AI-dedup af fejlmeldinger på `/meld` (match ny melding mod eksisterende - "kø, ikke patrulje").
- [ ] Ikke-AI-redesign (Torben udskød; grafit+kobber står). Ved palet-skift skal PDF-rapport + `tailwind.config.ts` + komponenter følge med.
- [x] **Split HANDOVER: arkivér historiske sektioner.** GJORT 23-11-2026. De færdige, historiske per-feature-sektioner (43 stk.) er flyttet til `HANDOVER-ARKIV.md`; dette dokument er nu top-note + backlog + beslutninger/platform + de seneste par features (P13, P12) + Konventioner. HANDOVER gik fra ~947 linjer/185 KB til ~300 linjer/55 KB. Al historik bevaret i arkivet (ingen sletning, byte-for-byte). Ingen kode/migration.

### Parkeret / bevidst manuelt
- [ ] "Følg denne fejl" uden konto (email) + anonyme kommentarer (navn + captcha). Parkeret.
- [ ] Live-verifikation af rolletildeling i Adgange - Torben kører selv, bevidst ikke automatiseret.

### Gjort 22-11-2026 (så intet glemmes)
- [x] **P3 - Billeder/foto-bevis i feedback-meldinger** - upload på `/meld`, visning på board-kort (thumbnails + 📷-tal) og melding-detalje (galleri). Migration `20261122190000_meld_billeder.sql` (bucket `meld` + tabel `issue_images`) **skal køres i Zeekr-Studio**. Se "## Feedback-meldinger: billeder (P3)".
- [x] **P15 - Bruger-sletning af samtaler (skjul-for-mig)** - brugere kan fjerne egne samtaler fra indbakken uden SQL i Studio. Migration `20261122180000_samtale_skjul.sql`. Se "## Beskeder: bruger-sletning af samtaler (P15)".
- [x] **Direkte besked-compose + in-context-knap** - skriv til en ejer uden oplæg (`/beskeder/ny`, navnesøgning) + "✉️ Skriv privat" på kommentar-forfattere. Besked-indgangen er nu hel. Ingen migration. Se "## Beskeder: direkte compose".
- [x] **P1 - Zeekr-rapporten grupperet efter kategori-spand** (PDF + CSV). QA-vinklen mod Zeekr. Ingen migration. Se "## Zeekr-rapport: gruppering efter kategori-spand (P1)".
- [x] Multi-model garage (migration kørt + verificeret, live). Se "## Multi-model garage".
- [x] `/admin/beskeder`: moderator-visning af besked-anmeldelser (migration kørt). Se "## Admin: besked-anmeldelser".
- [x] Redigerbare forum-regler i UI (migration kørt). Se "## Redigerbare forum-regler".
- [x] Supabase security-lints lukket - migration `20261122170000_lint_fixes.sql` **kørt i Studio 22-11** (fast search_path + ejerskabs-tjek på issue_models-INSERT).
- [x] Status "afklaret" + kommentar-badge + "Markér løst"-valg (Løst i OTA / Afklaret) i Værkstedet (migration kørt).
- [x] Status-filter (Aktive/Afsluttet/Alle) + dæmpede afsluttede rækker.
- [x] 9 faste kategori-spande + filter + krævet dropdown ved oprettelse + kuratering i Værkstedet. Se "## Feedback-kategorier".
- [x] **Alle eksisterende meldinger mærket op med kategori** (Torben, engangs, i Værkstedet) - 22-11.
- [x] Kategori-chip på board-rækker + melding-detalje (kobber-tag efter type-badgen, `kategoriLabel()`-fallback, kun når kategori findes). `components/FejlBoard.tsx` + `/melding/[id]`.

### Beslutning - forum-struktur (IA 22-11, uddybet i "## Feedback-kategorier")
- Forummet **struktureres ikke mere nu** - det er tomt for tråde, så det er et indholds-, ikke et strukturproblem. Lad struktur vokse ud af rigtige tråde.
- Når det struktureres, bruges de **9 feedback-spande som emne-tags/filter**, ikke nestede rum pr. model (undgår model×emne tomme-rum-eksplosion). Model forbliver rum/filter; emne er et mærke man vælger ved oprettelse; findbarhed bæres af **søgning**, ikke af perfekt kategorisering (moderator kuraterer).

## Moderings-kerne: design-oplæg (P20 + P21) (design 23-11-2026, INGEN kode endnu)

> Design-først-session. P20 (bruger-administration/sanktioner) og P21 (moderings-handling med grund + besked + rapport-kø) deler kernen "moderations-handling på en bruger" - tegnet ÉN gang her. Byggerækkefølge + migrationer står nederst. Informerer nav-gentænkningen i P23.
> Udgangspunkt (bekræftet 23-11): dagens moderering er ren tråd-CRUD (fastgør/lås/fjern, soft-remove, reversibel) UDEN grund og UDEN besked til brugeren; Adgange kan kun søge bruger + sætte rolle; der er INGEN rapportér-knap på forum-indhold.

### 1) Sanktions-model
**Niveauer (anbefaling):** advarsel < suspendér (tidsbegrænset) < ban (permanent) < anonymisér < slet.
- **"Ban" betyder: kan stadig logge ind og LÆSE, men kan ikke SKRIVE.** Alt er offentligt læsbart alligevel, og en skrive-spærre giver en flade til at forklare hvorfor; en login-spærre via Supabase auth ville være tungere og helt stum. Suspendér = samme, bare tidsbegrænset. Begge er soft/reversible (indhold + historik bevares) - som forum-soft-remove.
- **Anonymisér vs. slet:** hard-delete af en profil er destruktiv: `cars` og `confirmations` har `on delete cascade` -> vi mister bekræftelserne (= selve QA-signalet mod Zeekr), mens forum-tråde/-indlæg kun bliver forfatterløse (`author_id on delete set null`). Derfor: **anonymisér** (ryd display_name + evt. PII, behold rækkerne) som normal "fjern personen"-vej; **hard-delete** forbeholdes åbenlys spam/testkonti, admin-only, med cascade-advarsel.

**Datamodel (anbefaling): tabel + denormaliseret felt, ikke enten-eller.**
- `user_sanctions` (historik, sandhedskilde): id, bruger_id, type (advarsel|suspender|ban|ophaev|anonymiser), grund, fritekst, udloeber_at (null = permanent/ikke-tid), udfoert_af, created_at. Fuld historik + fodrer audit-loggen (punkt 4).
- `profiles.spaerret_til timestamptz` (denormaliseret håndhævelses-felt): null = ikke spærret; fremtidig tid = suspenderet til da; sentinel ('infinity') = permanent ban. Vedligeholdes KUN af sanktions-RPC'erne. Samme mønster som de denormaliserede `reply_count`/`last_post_at` på tråde.
- Hjælper `er_bruger_spaerret()` (security definer, stable): for `auth.uid()` -> `spaerret_til is not null and spaerret_til > now()`. O(1), ingen join i skrive-stierne.

**Håndhævelse i skrive-stierne (præcis flade):** tilføj `and not public.er_bruger_spaerret()` til hver BRUGER-insert-policy: `forum_threads_insert_auth`, `forum_posts_insert_auth`, `comments_insert_auth`, `cars_insert_own`, `issues_insert_auth`, `confirmations_insert_own`, `messages_insert`, `event_signups_insert_own`. Moderator-insert-policyerne (`*_insert_mod`) + al læsning røres ikke.

### 2) Moderings-handling med grund + officiel besked
- **Hver handling bliver handling-med-grund.** Grund-enum: `dublet` (+ link til original), `tone`, `off-topic`, `spam`, `andet` (fri tekst). Ved fjern tråd/indlæg vælges grund.
- **Besked til forfatteren via notifikations-kernen.** `notifications` har bevidst INGEN klient-insert-policy (kun trigger/security-definer skriver). En ny security-definer-RPC gør begge dele atomisk: udfører handlingen (sæt is_removed / skriv sanktion) OG indsætter notifikationen til den berørte bruger. Ny type `moderation` (og `advarsel`); teksten fryses, fx: `Din tråd "X" blev fjernet - grund: dublet`; href -> tråden/reglen.
- **Officielt udseende:** NotifBell får eget ikon for `moderation`/`advarsel` (fx 🛡) + kobber-accent-række, så den ikke forveksles med en ligeværdig besked.
- **Separat "advar/kontakt bruger"-handling** (uafhængig af en konkret tråd) til dårlig opførsel -> samme RPC, mål = bruger, type `advarsel`. Deles med P20.
- **Afklaring (min anbefaling):** v1 = ren notifikation (envejs, officiel, grunden bæres i teksten). En kvitterbar/svarbar besked er mere end nødvendigt og risikerer at blive en peer-DM-tråd; ønskes anke/dialog senere, byg et dedikeret anke-flow - ikke genbrug af `messages`.

### 3) Bruger-rapportér-knap på forum-indhold + indgående kø
- I dag: ingen rapportér-knap på forum. `message_reports` findes for PB - **vi spejler det mønster.**
- `forum_reports`: id, reporter_id, thread_id (nullable), post_id (nullable), reason, handled, created_at. RLS = som `message_reports`: `insert` hvor reporter_id = auth.uid(); `select` for moderator.
- **Knap** på tråd + indlæg for almindelige indloggede brugere (ikke på eget indhold; moderatorer handler bare direkte). Grund-vælger (tone/spam/off-topic/andet).
- **Indgående kø i Værkstedet:** åbne rapporter beriget med det rapporterede indhold via security-definer-RPC (`admin_forum_rapporter()`, moderator-gated - samme form som `admin_besked_anmeldelser()`, men her er indholdet offentligt, så intet privatlivs-hensyn). Fra køen handler moderatoren (-> punkt 2) og sætter handled.
- **Fremtidssikring:** giv `forum_reports` en `kilde`-kolonne (`bruger` | `ai`), så P5's AI-flag senere lander i SAMME kø.

### 4) Fælles audit-log
- ÉN tabel `moderation_log`: id, handling (fjern_traad|fjern_indlaeg|fastgoer|laas|suspender|ban|ophaev|advar|anonymiser|slet|...), maal_type (thread|post|user|...), maal_id, grund, fritekst, snapshot (frosset titel/navn så loggen læses selv hvis målet er væk), udfoert_af, created_at.
- Skrives af de samme security-definer-RPC'er som udfører handlingerne (aldrig fra klienten). RLS: moderator/admin læser.
- **Deles af P20 + P21.** Vises som "Log"/aktivitets-strøm i Værkstedet (flugter med P23's opsplitning - moderering er sin egen strøm).

### 5) Hvem må hvad (admin vs. moderator)
- I dag: `er_moderator()` = admin+moderator; `er_admin()` = kun admin. Håndhæves i hver RPC med samme værn som `admin_saet_rolle`/`admin_slet_model`.
- **Moderator (reversibelt/dagligt):** tråd/indlæg-moderering med grund (fjern/lås/fastgør), håndtér forum-rapporter, advar/kontakt bruger, suspendér (tidsbegrænset). Læs audit-log.
- **Kun admin (irreversibelt/destruktivt):** permanent ban, anonymisér, hard-delete, rolle-ændringer (allerede admin-only), ophæv ban. Samme snit som P18.

### 6) Pasform i Værkstedet + nav (overlap P16/P23)
- **Nye flader:** (a) bruger-overblik + sanktioner i **Adgange** (P20 udvider `AdgangePanel`); (b) forum-rapport-kø + handling-med-grund under **Forum**-fanen (P21, folder ind i P16-idéen "filtrér til kræver opmærksomhed"); (c) **moderation_log** som egen lille "Log" eller del af P23's nye Aktivitet-opsplitning.
- **Net nye top-nav-punkter = 0-1** (køen + sanktioner hænger på eksisterende faner), men P20/P21 **fortykker** fanerne, så P23's nav-gentænkning (sidebar/overflow) er forudsætningen - derfor bygges P23 FØR P20/P21.

### Anbefalet byggerækkefølge + nødvendige migrationer
Byg DB-kernen ÉN gang, og lad P21 være den første feature oven på den. Rækkefølgen passer med den aftalte prioritering (P23 først):
1. **P23** (Værksted-forside + nav + aktivitets-feed) - næste session. Giver nav-plads + det opsplittede aktivitets-feed som loggen lander i. Ingen moderings-migration.
2. **Delt kerne.** **M1 `..._moderations_kerne.sql`**: `user_sanctions` + `profiles.spaerret_til` + `er_bruger_spaerret()` + de 8 bruger-insert-policies udvidet med `and not er_bruger_spaerret()` + `moderation_log` + RLS.
3. **P21 byg** (indhold). **M2 `..._forum_rapporter.sql`**: `forum_reports` + RLS + `admin_forum_rapporter()`. **M3 `..._moderations_rpcer.sql`**: RPC'er `mod_fjern_traad`/`mod_fjern_indlaeg`/`mod_advar_bruger` (hver = handling + log + notifikation atomisk) + notif-type `moderation`/`advarsel`. + UI: rapportér-knap, kø, grund-vælger, NotifBell-ikon.
4. **P20 byg** (bruger). **M4 `..._bruger_sanktioner.sql`**: RPC'er `mod_suspender_bruger`/`admin_ban_bruger`/`admin_ophaev`/`admin_anonymiser` (hver = `user_sanctions` + `profiles.spaerret_til` + log + evt. notifikation) + `admin_alle_brugere` udvidet med status/paginering. + UI: bruger-overblik + sanktioner i Adgange.

M1-M4 kan slås sammen (fx M1+M3) hvis ønsket; holdt adskilt så P21 og P20 shippes i hver sin tynde skive. P22 (avatar) hænger senere "fjern avatar" på samme log + RPC-mønster.

## Værksted: forside + nav + aktivitets-feed (P23) (bygget 23-11-2026)
Ryddede op i den inkonsekvens at `/admin` landede på feedback-Overblikket PLUS hele feedback-moderingstabellen (+ oprydning), mens alt andet lå som faner - Feedback var altså både "forsiden" og implicit sin egen fane. Ren kode, ingen migration.

**1) `/admin` er nu et rent dashboard (`app/admin/page.tsx`).**
- `Overblik` (`components/admin/Overblik.tsx`) viser nu KUN tal-tiles: Feedback (meldinger/bekræftelser/åbne/løst i OTA) + Forum (kategorier/tråde/indlæg). Hver sektion har en "Åbn Feedback →" / "Åbn Forum →"-genvej i overskriften. Aktivitets-feedet er fjernet herfra (flyttet, se punkt 3). Prop `aktivitet` fjernet.
- Ny `Genveje` (`components/admin/Genveje.tsx`): kort-gitter med genveje til alle flader, **Feedback fremhævet først** (kobber-kant) - så Torbens mest brugte flade er tydeligt ét klik væk, jf. noten i opgaven. Gitteret vokser naturligt, så P20/P21's kommende flader (rapport-kø, Log) kan slottes ind.
- `ForsideBeskedEditor` bliver på dashboardet (det er en site-forside-kontrol, ikke feedback-moderering - hører hverken til Feedback-fanen eller tal-tiles, men er en let dashboard-kontrol).

**2) Ny Feedback-fane (`app/admin/feedback/page.tsx`).** Feedback-moderingstabellen (`ModereringsTabel`) + begge oprydnings-værktøjer (`OprydningPanel` = bekræftelses-stemmer, `StorageOprydningPanel` = forældreløse filer i forum/meld/besked-buckets) er flyttet hertil fra forsiden - uændrede komponenter, bare ny rute. + feedback-aktivitets-feedet (punkt 3).

**3) Aktivitets-feedet delt op (kernen i opgaven).** Det gamle `getSenesteAktivitet` (én blandet strøm: meldinger + bekræftelser + tråde + svar) er erstattet i `lib/queries-admin.ts` af to funktioner: `getFeedbackAktivitet` (meldinger + bekræftelser) og `getForumAktivitet` (tråde + svar). Render-logikken (ikon pr. type + tekst) er trukket ud i en delt, præsentationel `AktivitetFeed` (`components/admin/AktivitetFeed.tsx`, tager `poster` + valgfri `tom`-tekst). Feedback-feedet vises på `/admin/feedback`, forum-feedet på `/admin/forum` - hver slags aktivitet hos sit eget område.
- NB: forveksl ikke med `/admin/aktivitet` (uændret) - den viser mønstre over tid (hændelser pr. time/ugedag/30 dage via `getAktivitet`), ikke den kronologiske hændelsesstrøm.

**4) Nav gentænkt så den skalerer (`app/admin/layout.tsx` + ny `components/admin/AdminNav.tsx`).** Den vandrette btn-ghost-række var fuld og kunne ikke rumme en Feedback-fane til. Nu:
- **Øverst:** titel + rolle til venstre, og KUN de faste konto/site-handlinger til højre ("← Til forsiden" + "Log ud") - de vokser aldrig.
- **Egen fane-række nedenunder:** `AdminNav` (client, `usePathname`) - ikon + kort label pr. fane, aktiv-fane markeret (kobber-kant + `bg-kobber-50` + `aria-current="page"`), og rækken **wrapper** (`flex-wrap`), så den aldrig sprænger. Faner: Overblik · Feedback · Forum · Links · Anmeldelser · Rapport · Aktivitet · Adgange. Overblik + Feedback er nu egne faner (Overblik aktiv kun ved præcist `/admin`-match, ellers lyste den på alle underruter).
- Dette er forudsætningen P20/P21 pegede på: nye flader (rapport-kø, Log) wrapper bare ind i rækken uden omlægning.

**Verificeret:** `npx tsc --noEmit` grøn + `npm run build` grøn (alle admin-ruter inkl. ny `/admin/feedback` i route-listen; ingen efterladte `getSenesteAktivitet`-referencer; alle nav/genvej-hrefs har en side-fil). Live klik-gennemgang af fanerne gøres af Torben efter deploy (Supabase ligger på Pixa-LAN, uden for Claudes sandbox).

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
- `issue_images` (billeder pr. melding: `issue_id` → issues, `path` i `meld`-bucket, `display_order`). Billed-spor = `meld`-bucket (adskilt fra forummets `forum`-bucket). Se "## Feedback-meldinger: billeder (P3)".
- `message_images` (billeder pr. besked: `message_id` → messages (on delete cascade), `path` i den **PRIVATE** `besked`-bucket, `display_order`). RLS: KUN samtale-parter læser/skriver (helpere `er_besked_deltager`/`er_besked_afsender`); moderator må slette, ikke læse. Ingen public-URL - serve-rute `/beskeder/billede/[...]`. Se "## Beskeder: billeder (P10)".

## Moderering
- **Kø, ikke patrulje:** struktur + Discourse trust levels + flag-kø + AI-dedup af fejlmeldinger (match ny melding mod eksisterende).
- Torben skaffer et par moderatorer.

## Byggemetode
- All in på visionen, men ship i **tynde skiver** (bugherrer-metoden: live hurtigt, iterér).
- **Skive 1:** custom Next.js + Supabase - login (SSO-klar) + modeller/platforme + fejl-board multi-model (meld → bekræft → stem). Dybest set bugherrer genfødt på ny stack + flere modeller.
- Senere skiver: Zeekr-rapporter · Discourse-opsætning + SSO + tematisering · Q&A/guides · AI-dedup + flag-kø.

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

## Auto-deploy via n8n-poller (opsat 20-11-2026)
Samme mønster som bugherrer: GitHub kan ikke nå Coolify udefra (lukkede router-porte), så n8n på Pixa "ringer ud" - poller GitHub og trigger Coolify-deploy lokalt. Kæden: **Claude pusher → n8n opdager → Coolify deployer**, ingen manuel redeploy.
- **n8n-workflow "Zeekr Garage auto-deploy"** (kopi af bugherrers, 4 noder): Schedule (hvert 3. min) → HTTP GET `https://api.github.com/repos/Tmat-code/zeekr-garage/commits/main` (header `User-Agent: n8n`) → Code (husker sidste `sha` i workflow static data, kun videre ved ny) → HTTP POST `http://192.168.1.18:8000/api/v1/deploy?uuid=rpcqm0klit7tcvzms7syizxv&force=false` med `Authorization: Bearer <Coolify API-token>`.
- **Genbrugt fra bugherrer:** Coolify API-token `n8n-deploy` (Deploy-ret, deployer alle apps på teamet) + Allowed-IPs (private ranges). Ingen ny token/credential.
- **Repo gjort OFFENTLIGT 20-11-2026:** krævet for at den uautentificerede GET virker (GitHub giver 404 på private repos uden token). Repoet er tjekket rent - ingen committede hemmeligheder (`.env` git-ignoreret, kun `.env.example`-skabelon). Alle nøgler bor i Coolify. Offentligt repo støtter også portfolio-vinklen (Zeekr kan se kvaliteten).

## Events: polish (P13) (bygget 23-11-2026)
Tre dele oven på det eksisterende events-spor (opret/rediger, tilmelding m. note, opdateringer der mailes til tilmeldte - migration `20261121230000_events.sql`, notifikationer `20261122100000`).

**1) .ics-kalendereksport (ingen DB-ændring).**
- **Route:** `app/events/[slug]/ics/route.ts` - henter eventet (offentlig RLS-læsning, ingen auth), bygger .ics via `lib/ics.ts` og streamer `text/calendar; charset=utf-8` m. `Content-Disposition: attachment; filename="<slug>.ics"`. Ét **VEVENT** (PR. EVENT, ikke et feed) → brugeren føjer netop dette event til sin kalender.
- **`lib/ics.ts`** (ren, testbar - route = tynd skal): `byggEventIcs(ev, eventUrl)`. RFC 5545: CRLF-linjer, escape (`\` `,` `;` newline), linje-folding ≤75 oktetter (UTF-8-sikkert), `METHOD:PUBLISH`.
- **Tidszone = Europe/Copenhagen (eksplicit):** indlejret kanonisk **VTIMEZONE** (CET +0100 / CEST +0200 m. EU-DST-RRULE'er) + `DTSTART;TZID=Europe/Copenhagen:<lokal vægtid>`. Lokal vægtid regnes fra den lagrede UTC-instant via `Intl.DateTimeFormat(..., {timeZone:'Europe/Copenhagen'})` → korrekt dansk klokkeslæt uanset sommer/vinter.
- **Aflysning:** `is_cancelled` → `STATUS:CANCELLED` + `TRANSP:TRANSPARENT` + "AFLYST:"-præfiks i SUMMARY. Ellers `STATUS:CONFIRMED`.
- **SEQUENCE:** sekunder fra `created_at` til `updated_at` (0 hvis aldrig ændret). Stiger monotont ved hver ændring → samme UID (`<event-id>@zeekr-garage.dk`) + højere SEQUENCE = revision, så en **opdateret eller aflyst** event opdaterer det allerede-tilføjede i kalenderen i stedet for at blive en dublet.
- **Kanter:** uden `starts_at` (endnu ikke dato-sat) returnerer ruten 404, og knappen vises ikke (intet DTSTART-løst VEVENT). Uden `ends_at` defaultes DTEND til start + 2 timer.
- **Knap:** `📅 Føj til kalender` på event-siden (`app/events/[slug]/page.tsx`), ren `<a href="/events/<slug>/ics">`, kun når `startsAt` er sat.

**2) Antal gæster pr. tilmelding: DROPPET (Torben 23-11).** Den nuværende ja/nej-tilmelding beholdes; `event_signups` er uændret (stadig én række pr. bruger m. valgfri `note`). Ingen kode/DB rørt her.

**3) Notifikation ved NYT event (migration `20261123190000_nyt_event_notif.sql`).**
- Trigger `event_after_insert` **AFTER INSERT** på `public.events` (security definer, `set search_path = public`) → indsætter én `notifications`-række pr. profil med `type='nyt_event'`, `href='/events/<slug>'`, tekst `"<opretter> oprettede et nyt event: \"<titel>\""`, `reference = event-id`, `aktoer_id = created_by`.
- **Mønster = `forum_post_notify` / `message_after_insert`:** security definer (klienten har ingen insert-policy på notifications - kun triggeren skriver), og **opretteren selv undtages** (`new.created_by is null or p.id <> new.created_by`). Er `created_by` null → alle profiler får den.
- **Kun INSERT:** AFTER INSERT-trigger → fyrer aldrig ved rediger/aflys (de håndteres allerede af event_updates-mail + .ics-SEQUENCE).
- **Realtime + klokke uændret:** `notifications` er allerede i `supabase_realtime`-publication (fra `20261122100000`), så badgen opdaterer live. `NotifBell.tsx` fik en `ikonFor(type)` → 📅 nyt_event / 💬 forum_svar / ✉️ pb_besked / @ mention / 🔔 fallback (renderes foran teksten; uændret prik for ulæst).
- **NB (bevidst valg):** opretteren (moderator/admin) får ikke notifikation om sit eget event. Sig til hvis I hellere vil have at ALLE inkl. opretter notificeres - så fjernes undtagelsen i `where`-klausulen.

**Verificeret:**
- `npm run build` grønt (`/events/[slug]/ics` i route-listen).
- Lokal Postgres 16 (harness m. mock `auth.uid()` + roller, kørte den faktiske migration): ikke-moderator afvist på event-insert (RLS); moderator opretter → 4 notifikationer til de andre, 0 til opretter, alle `type=nyt_event` + korrekt href; UPDATE/aflysning → **ingen** ny notifikation; null-created_by → notif til alle 5; RLS-læsning: bruger ser kun egne.
- .ics: 19 checks + **node-ical round-trip** (sommer-event 18:00 CEST → 16:00Z, vinter-event 19:00 CET → 18:00Z begge korrekt; STATUS:CANCELLED; SEQUENCE>0 ved opdatering; komma/semikolon escapet; ingen linjer >75 oktetter; parser accepterer VCALENDAR/VEVENT).

**TILBAGE for Torben:** kør `20261123190000_nyt_event_notif.sql` i Zeekr-Studio (8002) → så udløser nye events en klokke-notif til alle. (.ics-knappen virker allerede uden migration.)

## Beskeder: gruppe-samtaler (P12) (bygget 23-11-2026)
Udvider private beskeder fra 1:1 til N deltagere. Skemaet holdt allerede til det (`conversation_participants` er en ren join-tabel med PK `(conversation_id, user_id)`); det der manglede var at SKELNE gruppe fra 1:1, oprettelse, administration og afsender-navn i UI.

**Valg truffet med Torben (23-11):**
- **Deltager-model:** eksplicit `is_group`-flag på `conversations` (ikke "gruppe = >2 deltagere"). Ellers ville en gruppe kollapse til en genbrugelig 1:1 i det øjeblik nogen forlod den, og `start_samtale` kunne ramme den.
- **Oprettelse:** alle indloggede; 2+ modtagere = gruppe (1 = 1:1 som før).
- **Administration:** KUN opretteren tilføjer/fjerner/omdøber; ALLE kan forlade. (Alternativet "alle deltagere må tilføje" blev valgt fra - mere forudsigeligt for et lille ejer-community.)
- **Navn:** valgfrit. Uden navn afledes en label af deltagernes navne ("Anna, Bo, Carl" / "Anna, Bo +2").

**Migration `supabase/migrations/20261123180000_gruppe_samtaler.sql` (skal køres i Studio 8002):**
- `conversations` += `is_group boolean default false`, `created_by uuid`, `title text`.
- RPC `start_gruppe(p_others uuid[], p_title text)` - security definer; renser modtagerliste (mig selv/dubletter/null ud), kræver ≥2 andre, tjekker at alle findes + ingen blokering (begge veje), opretter `is_group=true`-samtale + alle deltager-rækker.
- RPC `gruppe_tilfoej_deltager` / `gruppe_fjern_deltager` / `gruppe_omdoeb` - `created_by = auth.uid()`-gated (kun opretter). `gruppe_forlad` - enhver deltager fjerner sin egen række.
- `start_samtale` fik `c.is_group = false` i genbrugs-opslaget (en 2-mands-gruppe genbruges aldrig som 1:1).
- `message_after_insert` finpudset: gruppe-tekst "X skrev i <gruppe>" (ellers "X sendte dig en besked"); looper stadig over ALLE deltagere undtagen afsender, én ulæst `pb_besked` pr. samtale.
- **Ingen nye RLS-policies nødvendige:** `conversations_select`/`conv_part_select`/`messages_*` bruger allerede `er_deltager(conversation_id)`, som er antals-uafhængig. Al medlems-mutation går gennem security-definer-RPC'erne, så deltager-tabellen beholder sin stramme RLS (kun `conv_part_update_own` for egen `last_read_at`/`hidden_at`). Grants: `revoke from public` + `grant execute ... to authenticated` på alle fem RPC'er.

**Uændret på grupper (bevidst, verificeret):**
- **P10 billeder:** serve-ruten `/beskeder/billede/[...]` tjekker "deltager i samtalen" via `conversation_participants` filtreret på `user_id = mig` (antals-uafhængigt); `er_besked_deltager`/`er_besked_afsender` ligeså. Semantik: alle i gruppen ser gruppens billeder.
- **P15 skjul-for-mig:** sætter egen `hidden_at` pr. deltager - uændret. Bemærk: grupper har nu to ting - "Skjul/Slet" (P15, inbox) og "Forlad gruppe" (ny, i samtale-headeren).
- **Anmeldelser:** `message_reports` + `admin_besked_anmeldelser()` er samtale-/besked-baseret - fungerer ens i grupper.

**App:**
- `lib/types.ts`: `SamtaleRow` += `erGruppe`/`titel`/`antalDeltagere`, `andenPart` nu nullable. `Besked` += `senderNavn`. `SamtaleDetalje` += `erGruppe`/`titel`/`eksplicitTitel`/`erOpretter`/`deltagere[]`. `Deltager` = alias for `AndenPart`.
- `lib/beskeder.ts`: `getSamtaler`/`getSamtale` gruppe-aware; `gruppeLabel()`-helper; afsender-navn-map (slår også forladte afsenderes navne op i `profiles`, så gamle beskeder stadig viser navn). `soegBrugere` uændret (genbruges til gruppe-tilføj).
- `app/beskeder/actions.ts`: `startGruppe`/`tilfoejDeltager`/`fjernDeltager`/`forladGruppe`/`omdoebGruppe`.
- `components/beskeder/NyBeskedView.tsx`: multiselect (chips) + valgfrit gruppenavn-felt; 1 valgt = `startSamtaleMedBruger`, 2+ = `startGruppe`.
- `components/beskeder/SamtaleView.tsx`: gruppe-header ("N deltagere"-chip folder medlems-panel ud) + afsender-navn pr. besked (kun andres, kun når afsender skifter) + "Forlad gruppe". 1:1-visning uændret (blokér/slet).
- `components/beskeder/GruppePanel.tsx` (ny): medlemsliste + (opretter) omdøb + tilføj (navnesøgning) / fjern.
- `app/beskeder/page.tsx`: indbakke viser gruppe-label + 👥-deltagerantal i stedet for bil-badge.

**Åbent hjørne (ikke P12, harmløst):** en gruppe hvor alle er gået bliver en forældreløs samtale (RLS skjuler den for alle). Evt. oprydning senere.

**Verificeret:** build grønt + 15+ RLS/adgangs-checks i lokal Postgres 16 (oprettelse + is_group/created_by/3 deltagere; medlem ser gruppe + alle deltagere, udenforstående ser intet; medlem kan sende, udenforstående afvist begge veje; opretter-gating på tilføj/fjern bekræftet begge veje; forlad → 2 deltagere men is_group bevaret; `start_samtale` genbruger ikke en 2-mands-gruppe; P10-billedprivatliv med N deltagere - medlem læser, udenforstående ej, ikke-afsender kan ikke indsætte; `start_gruppe` kræver ≥2 andre + blokering afviser oprettelse; gruppe-notifikation når alle deltagere m. gruppe-tekst).

**Follow-up (UX-polish, 23-11 - ingen migration):** Torben testede live og fangede at gruppe-muligheden var svær at opdage, og at det var besværligt at finde folk man vil inddrage. To greb:
- Tydeligere tekst: `/beskeder/ny`-undertitel nævner nu gruppen fra start; feltet hedder "Til hvem? (vælg en eller flere)".
- Trykbare forslag: `senesteKontakter()` (`lib/beskeder.ts`) + action `hentSenesteKontakter` viser "Ejere du har skrevet med" (seneste distinkte 1:1-modparter, ekskl. blokerede) som trykbare rækker i `NyBeskedView`, så man kan samle en gruppe uden at taste navne. Vises når søgefeltet er tomt; navnesøgning til resten.
- Bevidst fravalgt: "bladr alle ejere"/"alle 7GT-ejere"-liste (støjende + privatlivs-grænsende). Hold forslag til folk man allerede har kontakt med + søgning.

## Konventioner (gældende arbejdsregler)
Konventioner som resten: grafit+kobber (ikke Claude-grøn/blå); æøå via Edit/Python, aldrig perl; **almindelig bindestreg "-" i dansk tekst, aldrig lange tankestreger (— og –), overalt - UI, kode, HANDOVER**; migrationer køres i Studio FØR kode pushes (PostgREST er all-or-nothing); commit+push direkte til main; opdatér HANDOVER ved hver ændring.
