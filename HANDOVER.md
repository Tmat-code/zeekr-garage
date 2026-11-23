# HANDOVER - Zeekr Garage

> Uofficielt, uafhængigt community-site for Zeekr-ejere i Danmark/Norden.
> Dette dokument er projektets sandhedskilde. **Opdateres ved hver ændring.**

**Sidst opdateret:** 2026-11-23 (P13 - Events-polish, tre dele. (1) **.ics-kalendereksport:** download-knap "📅 Føj til kalender" pr. event (route `app/events/[slug]/ics/route.ts` → `lib/ics.ts`), streamer ét **VEVENT** (ikke et feed) som `text/calendar` m. `Content-Disposition: attachment`. Åbner i Apple/Google Kalender. Eksplicit **Europe/Copenhagen** via indlejret VTIMEZONE (CET/CEST-DST) + TZID på DTSTART/DTEND; **STATUS:CANCELLED** (+ "AFLYST:"-præfiks) når `is_cancelled`; **SEQUENCE** afledt af `updated_at` (sekunder siden `created_at`) så en opdateret/aflyst event overskriver den gamle i kalenderen (samme UID). Ingen DB-ændring. (2) **Antal gæster pr. tilmelding: DROPPET** (Torben 23-11) - ja/nej-tilmelding beholdt, `event_signups` uændret. (3) **Notifikation ved nyt event:** trigger `event_after_insert` på events-INSERT lægger en 'nyt_event'-klokke-notif hos **alle** brugere (undtagen opretteren selv - samme "ikke mig selv"-mønster som `forum_post_notify`/`message_after_insert`); kun INSERT, ikke updates; security definer; genbruger notifications-indbakke + realtime. NotifBell fik per-type-ikon (📅 nyt_event, 💬 forum_svar, ✉️ pb_besked, @ mention, 🔔 fallback). **⚠️ KRÆVER migration `20261123190000_nyt_event_notif.sql` kørt i Zeekr-Studio (8002)** før notifikationen virker live (.ics + knap virker uden migration). Verificeret: build grøn + lokal Postgres 16 (ikke-moderator afvist på event-insert; moderator-opret → notif til alle andre, ikke opretter; UPDATE/aflysning udløser INGEN ny notif; null-opretter → alle; RLS: bruger ser kun egne) + 19 .ics-checks inkl. node-ical round-trip (korrekt UTC-instant sommer CEST + vinter CET, STATUS/SEQUENCE, escape, folding ≤75 oktetter). Se "## Events: polish (P13)". Forrige: P12 - Gruppe-samtaler i beskeder: en samtale kan nu have flere end to deltagere. `conversations` udvidet med `is_group`/`created_by`/`title` (eksplicit FLAG, ikke afledt af deltager-antal, så en gruppe ikke kollapser til en genbrugelig 1:1 når nogen forlader den). Al medlems-mutation via security-definer-RPC'er (`start_gruppe` + `gruppe_tilfoej_deltager`/`gruppe_fjern_deltager`/`gruppe_forlad`/`gruppe_omdoeb`), så RLS forbliver stram (ingen bred insert/delete-policy på deltager-tabellen). Oprettelse fra `/beskeder/ny` (multiselect: 1 = 1:1 som før, 2+ = gruppe m. valgfrit navn); afsender-navn pr. besked i gruppe-visning; medlems-panel i samtale-headeren (KUN opretteren tilføjer/fjerner/omdøber, ALLE kan forlade); gruppe-label afledes af deltagernavne når titel mangler. P10 (billeder), P15 (skjul-for-mig), anmeldelser og notifikationer er UÆNDREDE på grupper - serve-ruten + RLS-helperne (`er_besked_deltager`/`er_besked_afsender`/`er_deltager`) er antals-uafhængige, og `message_after_insert` looper allerede over alle deltagere (nu m. gruppe-tekst "X skrev i <gruppe>"). `start_samtale` fik et `is_group=false`-værn i genbrugs-opslaget. **KRÆVER migration `20261123180000_gruppe_samtaler.sql` kørt i Zeekr-Studio (8002)** før gruppe-oprettelse/-administration virker live (til da renderer eksisterende 1:1-samtaler uændret). Verificeret: build + 15+ RLS/adgangs-checks i lokal Postgres 16 (kun deltagere læser/skriver en gruppe; udenforstående afvist begge veje; opretter-gating på tilføj/fjern; forlad uden gruppe-kollaps; billed-privatliv holder med N deltagere; blokering afviser oprettelse). Se "## Beskeder: gruppe-samtaler (P12)". Forrige: P19 - Admin-styrede links på links-siden: links + grupper ligger nu i DB (`link_groups` + `links`) med admin-CRUD i Værkstedet på `/admin/links`, security-definer RPC'er (`er_admin()`-gated), offentlig læsning. Hvert link kan valgfrit tagges med **en eller flere** modeller (`link_models`-kobling; ingen = gælder alle - en samlet forhandler-/webshop-side kan derfor stå ÉN gang med et badge pr. model den fører); et model-filter på `/links` dukker op af sig selv, når ≥2 modeller er repræsenteret. Seedet med de hidtidige links + nye officielle modelsider pr. model (9X/7X/7GT/X/001) og model-specifikke tests/pris/tilbehør (gennemgået med Torben 23-11). Struktur valgt: emne-grupper + model-tag (model = filter), IKKE pr-model-nestning (tomme rum - samme grund som forum-IA'en). **KRÆVER migration `20261123170000_links.sql` kørt i Zeekr-Studio (8002)** før siden læser fra DB (til da falder den tilbage til en indbygget kopi af samme links, så intet brækker). Verificeret: build + RLS/RPC i lokal Postgres 16 (offentlig læsning; anon kan ikke skrive; non-admin afvist på alle RPC'er; admin CRUD + flyt; slet nægtet på ikke-tom gruppe; `on delete set null` bevarer links når en model slettes). Se "## Nyttige links: admin-styret (P19)". Forrige: P10 - Billeder i beskeder: afslutter billed-sporet (P3 -> P8 -> P9 -> P10). En besked kan nu vedhæfte 1..n billeder (kun-billede tilladt = mobil-kamera snap-og-send) og vise dem i samtalen. **Det afgørende: privatliv.** Modsat forum/meld (public buckets) ligger besked-billeder i en **PRIVAT bucket `besked`** uden offentlig/bred læse-policy; de hentes via en **authz'd serve-rute** `/beskeder/billede/[...]` der på hvert hit tjekker at kalderen er uploader eller samtale-deltager, før bytes streames via service-rollen. Ingen signed-URL-token der kan videresendes; moderatorer får bevidst IKKE billed-læsning (kun deltagere), i tråd med besked-anmeldelser. **KRÆVER migration `20261123160000_besked_billeder.sql` kørt i Zeekr-Studio (port 8002)** før det virker live. Verificeret: build + 13 RLS/privatlivs-checks i lokal Postgres 16 (kun parter kan læse/skrive; udenforstående + moderator afvist; privat bucket; upload kun i egen mappe; ingen direkte storage-listing). Se "## Beskeder: billeder (P10)". Forrige: P6 - Antal ejere pr. model-forum.)

---

## Arbejdsgang - sessioner (regel 22-11-2026)
- **Én opgave pr. session.** Når en opgave er løst (bygget + verificeret + HANDOVER opdateret + pushet), lægger Claude SELV op til at starte en NY session til næste opgave - vi fortsætter ikke bare i samme session. Backloggen nedenfor er broen, så den friske session har alt med.
- Grunden: hver session holder sig fokuseret og kontekst-let, og de gode opbygnings-vinkler går ikke tabt i en lang, komprimeret tråd.

## Backlog - prioriteret (sidst opdateret 22-11-2026)
> Ét sted for "hvad mangler", i den rækkefølge vi tager det. **Én opgave pr. session**, oppefra og ned. Tag altid P1; spring kun ned hvis P1 er blokeret. Stryg et punkt når det er bygget + verificeret + pushet + HANDOVER opdateret. Detaljer står i sektionerne nedenfor.
>
> Prioriterings-logik: 1) styrk QA-sagen mod Zeekr (= målet), 2) gør Torbens daglige kuratering holdbar, 3) forum-findbarhed/liv, 4) polish/roadmap.

### Næste op (byg i denne rækkefølge)
> QA-værdi øverst (bygges nu uanset trafik). **Forum-klyngen** (P4 søgning, P5 auto-moderering, P6 ejer-antal) forudsætter rigtig forum-trafik - forummet er pt. tomt for tråde - så de kan bygges proaktivt, men hastes ikke før der kommer liv i forummet.
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

### Senere / roadmap (ikke planlagt endnu)
- [ ] **Åben/live chat (kun hvis trafik).** PARKERET 23-11 (Torben). Idé: et åbent/live chat-rum hvor folk "mødes". Fravalgt nu fordi synkron chat har et hårdt cold-start-problem (tomt rum uden samtidige brugere), og behovet er allerede dækket: forummet = det åbne/strukturerede, beskeder (P12) = det private, Events = koordinering af at mødes, og den planlagte Facebook-gruppe = det løse/sociale live-lag. Byg IKKE i beskeder (ville bryde privatlivsmodellen - privat bucket, "kun deltagere", blokér). Hvis det løftes en dag: egen "åbne kanaler/rum"-feature med eget design-oplæg, gerne hægtet på et Event så rummet har en grund til at være i gang. Revurdér kun når der er rigtig trafik OG et konkret ønske fra rigtige brugere.
- [ ] Q&A / guides-sektion.
- [ ] AI-dedup af fejlmeldinger på `/meld` (match ny melding mod eksisterende - "kø, ikke patrulje").
- [ ] Ikke-AI-redesign (Torben udskød; grafit+kobber står). Ved palet-skift skal PDF-rapport + `tailwind.config.ts` + komponenter følge med.
- [ ] **Split HANDOVER: arkivér historiske sektioner.** HANDOVER er ~150 KB/~820 linjer og vokser - ikke et problem nu (bro'en virker), men den tærer på kontekst-budgettet ved hver session-start og bliver tung at skimme. Når det generer: flyt de færdige, historiske per-feature-sektioner ud i `HANDOVER-ARKIV.md` og lad selve HANDOVER være top-note + backlog + aktive beslutninger + de seneste par features. Al historik bevares, bro'en bliver let igen. Egen session (ren oprydning, ingen kode/migration).

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

## Nyttige links: admin-styret (P19)
- **Formål:** links-siden (`app/links/page.tsx`) var fuldt hardcodet i konstanten `LINK_GRUPPER` - Torben kunne ikke tilføje/redigere/omsortere links uden en kodeændring. Nu i DB + admin-CRUD i Værkstedet, så han selv kuraterer - på linje med kategori-editoren (P7) og Modeller-panelet (P17/P18).
- **Struktur (valgt med Torben 23-11):** de hidtidige emne-grupper (Officielt fra Zeekr · Specs & test · Køb, pris & leasing · Tilbehør & dele · Praktisk & fællesskab) + **valgfrie model-tags pr. link** (`link_models` mange-til-mange mod models; 0 = "gælder alle", 1 = model-specifik side, n = en samlet side der dækker flere modeller → ét badge pr. model, linket står ÉN gang). Multi-tag kom ind fordi en forhandler/webshop ikke nødvendigvis fører alle modeller (Torben 23-11). **Fravalgt:** pr-model-nestning (links pr. model som forum-foraene) → tomme rum, samme grund som forum-IA'en 22-11. Model = filter, emne = gruppe.
- **DB (migration `20261123170000_links.sql`):** `link_groups` (titel, display_order) + `links` (group_id → link_groups cascade, navn, kilde, url, display_order) + `link_models` (link_id, model_id, pk begge, **on delete cascade begge veje** → sletter man en model, falder dens badge af, men linket består). RLS: offentlig `select using(true)` på alle tre; **ingen** skrive-policy. Al skrivning via security-definer RPC'er (`er_admin()`-gated, pinnet search_path, `revoke from public` + `grant execute to authenticated`): `admin_opret/rediger/slet/flyt_link_gruppe`, `admin_opret/rediger/slet/flyt_link`, `admin_flyt_link_til_gruppe` + intern helper `saet_link_modeller(link, uuid[])`. opret/rediger-link tager `p_model_ids uuid[]` (ukendte id'er ignoreres, ingen FK-fejl). Slet-gruppe kun når TOM. Seed (grupper + links + tags i tre trin, url som nøgle) kører kun når tabellerne er tomme (idempotent). **⚠️ skal køres i Zeekr-Studio (8002)** - sandboxen kan ikke nå Pixa.
- **Seed** = de hidtidige links + nye model-varianter (hele listen gennemgået 23-11, kun URL'er der faktisk findes): officiel modelside pr. model (9X/7X/7GT/X/001, `zeekr.eu/da-dk/models/…`); Specs & test (evkx 7GT-specs + bilbasen-blog 7GT-test + FDM-tests for 7X/X/001; 9X har ingen DK-test endnu); pris pr. model (viabiler `nye-biler/…` for alle 5; 9X-siden er tynd); fleet-leasing 7GT. **"Biler på markedet"** = ÉT link til bilbasens samlede Zeekr-brugtliste (`/brugt/bil/zeekr`), utagget (var før 7GT-specifik). **Tilbehør:** evstitan som ÉT link til den samlede "For ZEEKR"-side (`/collections/zeekr-accessories`) med **badges 7GT · 7X · X · 001** (de modeller de fører; 9X ikke) - samler de før fire evstitan-rækker til én; + niceevs 7GT (globalt). De fælles uden tag: autohus privatleasing/nye biler, keratech, høegh, FB-gruppe, Connected Services, brugermanualer. **Vinduesviskere = 7GT** (Torben-ejet). **Connected Services** → `/da-dk/connected` (var dublet af 7GT-modelsiden).
- **App:** `lib/links.ts` (`getLinkGrupper` + `FALLBACK` der spejler seed'en, så siden virker før migration/ved DB-nede - som `MODEL_FALLBACK`). `/links` læser fra DB + `components/LinksVisning.tsx` (klient-filter: chips vises når ≥2 modeller er repræsenteret; valgt model viser links hvor den er blandt badges + de utaggede; badges rendres pr. model). Ny intro-tekst (den gamle sagde "Mest 7GT lige nu"). Admin: `/admin/links` (admin-only) + `components/admin/LinksStyring.tsx` + `app/admin/links-actions.ts`; nav-link "🔗 Links".
- **Model-vælger i admin:** klikbar liste af model-chips (`ModelVaelger`, multi-select, toggle), IKKE en enkelt-dropdown - man kan vælge 0 (="gælder alle"), 1 eller flere. UI sender model-id'er (uuid[]) til RPC'en. Kort badge/chip-label = modelnavn uden "Zeekr " (fx "7GT").
- **Verificeret:** `npm run build` grønt + lokal Postgres 16 (offentlig læsning på alle tre tabeller; anon kan ikke skrive; non-admin afvist på RPC'er; admin opret med flere modeller + rediger 2→1→0; ukendt model-id ignoreret; slet-link cascader link_models; slet nægtet på ikke-tom gruppe; model-sletning fjerner kun badget, ikke linket; seed = 5 grupper/27 links/22 tags/5 modeller; evstitan = 4 badges; 8 utaggede).
- **TILBAGE for Torben:** kør `20261123170000_links.sql` i Zeekr-Studio (8002). Så læser `/links` fra DB, og `/admin/links` kan redigere. (Til da: siden viser fallback-kopien; admin-redigering fejler indtil RPC'erne findes.)

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

**P2 - oprydning af moderings-rækken (bygget 22-11-2026):**
Rækken i `ModereringsTabel.tsx` proppede vote/status/alvor/kategori/løst/redigér/slet på én wrap-linje. Nu tredelt så daglig kuratering er roligere at læse:
- **Klassificering samlet:** de tre dropdowns (Status/Alvor/Kategori) er nu én gruppe med lille label OVER hver (uppercase, dæmpet), venstrestillet. Læses som "klassificér denne melding" i stedet for tre løse felter. Kontrol-rækken har fået en tynd top-streg (`border-t`) der adskiller den fra titel/meta.
- **Handlinger skilt fra:** "✅ Markér løst" forbliver synlig (primær daglig handling, beholder den olivengrønne `#4f6f4a`). Redigér + Slet er flyttet ind i en ⋯-overløbsmenu (ny `HandlingerMenu` + `MenuPunkt` i samme fil). Slet-bekræftelsen ("Slet denne melding? → Bekræft slet / Fortryd") og løst-undervalget ("Løst hvordan? → OTA / Afklaret / Fortryd") vises stadig inline, men udløses nu fra menuen hhv. knappen.
- **⋯-menuen er fuldt tastatur-tilgængelig** (så alle kan betjene den, ikke kun med mus): Enter/Mellemrum/Pil-ned åbner; pil op/ned + Home/End flytter mellem punkter; Escape lukker og sætter fokus tilbage på ⋯-knappen; Tab lukker pænt; klik udenfor lukker (usynlig bagvæg). Fokus flyttes til første menu-punkt når den åbner. `aria-haspopup="menu"`/`aria-expanded` på knappen, `role="menu"`/`menuitem` indeni, `title="Flere handlinger"` som tooltip for muse-brugere. Bruger `useRef`/`useEffect` til fokus-styring.
- Ingen adfærdsændring i server actions (`saetStatus`/`saetSeverity`/`saetKategori`/`markerLoest`/`sletMelding`/`gemRedigering` uændrede), ingen migration, ingen datamodel-ændring. Rene display/layout-ændringer.
- Gentag `selectKlasse`-konstanten + `Felt`-helper reducerer gentagelse. `tsc --noEmit` grøn + fuld `next build` grøn.

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

## Zeekr-rapport: gruppering efter kategori-spand (P1) - bygget 22-11-2026
Rapporten (PDF + CSV) grupperer og aggregerer nu de udvalgte meldinger efter de 9 faste kategori-spande (`ISSUE_CATEGORIES`) i stedet for én flad stemme-sorteret liste. Det er QA-vinklen mod Zeekr: fejlene står systematiseret pr. bilsystem (Kørehjælp & ADAS, Opladning & rækkevidde osv.), så mønstre pr. subsystem er tydelige.

- **Ingen migration.** Kategori ligger ikke i `rapport_fejl`-RPC'en; den hentes separat i `lib/rapport.ts:getRapportFejl()` fra `issues` (offentlig læsning) og mappes på pr. id. `RapportFejl` fik feltet `category: string | null`.
- **Gruppering:** ny ren helper `grupperEfterKategori(fejl)` i `lib/rapport.ts` → `RapportGruppe[]`. Rækkefølge: de 9 spande i config-rækkefølge (kun ikke-tomme), derefter evt. ukendte fri-tekst-kategorier (første-forekomst), til sidst en "uden kategori"-gruppe (`slug = null`). Hver gruppe aggregerer `antal`, `stemmer` og `bilerBekraeftet`. Deler samme helper → PDF og CSV grupperer identisk.
- **Visningslabel:** `rapportKategoriLabel(slug, sprog)` i `lib/rapport-i18n.ts`. Dansk bruger config'ens `kategoriLabel()` (fri-tekst-fallback til rå værdi); en/sv har oversatte labels for de 9 spande; `null` → sprogets "Uden kategori"/"Uncategorized"/"Utan kategori".
- **PDF** (`app/api/admin/rapport/pdf/route.ts`): grafit sektions-bånd m. kobber-kant pr. spand + aggregat ("N meldinger - M stemmer"); meldinger nummereres pr. gruppe (`#1..#n`). Kort-layoutet pr. melding er uændret. Orphan-værn: sidebryd før en header der ikke har plads. Grafit/kobber-stilen holdt (ingen ny farve). Kort intro-note om grupperingen under rapportens intro.
- **CSV** (`app/api/admin/rapport/csv/route.ts`): ny kolonne **Kategori** (efter Modeller) + rækker ordnet efter samme spand-rækkefølge; Placering løber globalt. Gør grupperingen filtrerbar i Excel/Calc.
- **i18n:** `rapport-i18n.ts` fik `post/poster`, `udenKategori`, `grupperetNote` + "Kategori"-kolonne i `csvKolonner` (da/en/sv), og kategori-label-oversættelser for de 9 spande (en/sv).
- `npm run build` grønt (tsc + Next). Ingen DB-ændring, så ingen Studio-kørsel.

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

**Senere skiver:** ~~tværgående tråd-søgning~~ **BYGGET 23-11 (se "## Forum: tværgående tråd-søgning (P4)")** · følg/notifikationer · ~~Billeder m. upload~~ **BYGGET 22-11 (se "## Billeder i forum-indlæg")** · "Opret som feedback"-bro · antal ejere pr. model-forum · modereringskø i Værkstedet.

## Forum: tværgående tråd-søgning (P4) - bygget 23-11-2026
Søgning på tværs af HELE forummet (alle kategorier + model-fora), så findbarhed bæres af søgning frem for perfekt kategorisering (jf. "Beslutning - forum-struktur"). Forummet er pt. næsten tomt for tråde, så det er bygget proaktivt.

**Beslutninger (truffet i sessionen):**
- **Omfang:** tværgående som udgangspunkt, men med **valgfrit scope til ét rum** (23-11). Match i **trådtitler + indlægs-tekst** (åbnings-indlæg + svar - begge er bare posts). Resultatet er **én række pr. tråd** (ikke pr. matchende indlæg); et match i flere indlæg/titel dedup'es til trådens samlede rank.
- **Scope-filter (23-11):** søgningen kan afgrænses til ét forum (fx kun 7GT-spanden, eller kun Teknik). Scope vælges i en dropdown ved søgefeltet på forsiden/resultatsiden, og hvert rum-side (`/forum/[kategori]`) har sit eget søgefelt der er forud-scopet til netop det rum (udvides til "Alle fora" på resultatsiden). Scope bæres i URL'en som `?kat=<slug>`.
- **Kategori-filter-boksen fjernet (23-11):** den gamle "Find en kategori…"-boks i `ForumOversigt` (klient-filter på rum-listen) blev forvekslet med søgefeltet. Fjernet - rum-listen er kort + grupperet i forvejen. `ForumOversigt` er nu en ren server-visning (ikke længere client-component).
- **Fjernet indhold udeladt:** `is_removed`-tråde holdes ude, OG tråde hvor matchet kun ligger i et `is_removed`-indlæg tæller ikke med (begge verificeret lokalt).
- **Metode = Postgres full-text search med dansk ordbog** (`'danish'` snowball), ikke ILIKE. Giver stemming (fx "kolde" matcher "koldt"; "vinter" matcher "vinteren"), relevans-ranking (`ts_rank`, titel vejer ×4) og highlightet uddrag (`ts_headline`). ILIKE kan intet af det og kan ikke bruge indeks på `%term%`.

**Migration `20261123110000_forum_soeg.sql` - KØRT i Zeekr-Studio (port 8002) + deployet 23-11, LIVE:**
- `forum_threads.tsv` + `forum_posts.tsv`: **genererede** (`GENERATED ALWAYS … STORED`) tsvector-kolonner på hhv. `title` og `body` med `to_tsvector('danish', …)`. **Ingen trigger** - Postgres holder dem selv ajour (konstant config-literal gør udtrykket immutable → tilladt i genereret kolonne). Vælges frem for trigger-mønsteret for mindre vedligehold.
- GIN-indeks på hver tsv-kolonne (`forum_threads_tsv_idx`, `forum_posts_tsv_idx`) - verificeret brugt (Bitmap Index Scan).
- RPC `forum_soeg(p_soegeord text, p_kategori text default null, p_maks int default 50)` (SQL, `stable`, `security definer`, pinnet `search_path`): parser input med `websearch_to_tsquery('danish', …)` (brugervenlig, kaster aldrig fejl; tom/stopord-input → 0 rækker), ranker titel ×4 + bedste indlægs-rank, og returnerer trådrække + kategori/model + forfatter/garage-badge + `ts_headline`-uddrag. **`p_kategori` = kategori-slug der scoper søgningen til ét rum** (null = alle fora; ukendt slug → 0 rækker, men UI'et validerer slug'en først). `grant execute … to anon, authenticated` (søgning er offentlig som resten). Migrationen `drop function if exists forum_soeg(text,int)` først, så en evt. tidligere 2-arg-kørsel ikke efterlader en overload.
- **Uddrag-markører:** `ts_headline` bruger `chr(1)`/`chr(2)` (kontroltegn, aldrig i rigtig tekst) som Start/StopSel; app-laget splitter på dem og wrapper i `<mark>` - ingen rå HTML fra db → ingen injection.
- **Idempotent** (`add column if not exists` + `create index if not exists` + `create or replace function`).
- **Verificeret i en lokal engangs-Postgres 16** (sandboxen kan ikke nå Pixa): dansk testdata på tværs af 3 kategorier bekræftede titel-vægtning, dedup til én række pr. tråd, udeladelse af fjernet tråd + fjernet svar, stemming, highlight, GIN-brug og tom-søgning = 0.

**Kode:**
- `lib/forum.ts:getForumSoeg(q, kategoriSlug?, maks=50)` - kalder RPC'en med valgfrit scope, mapper rækker (komponerer `bil`-badge som `mapAuthor`). Tom q → `[]` uden db-kald.
- `lib/forum.ts:getKategoriListe()` - flad, ordnet kategori-liste til scope-dropdown'en.
- `lib/types.ts:ForumSoegeResultat`.
- `app/forum/soeg/page.tsx` - **SSR resultatside** drevet af `?q=` (+ valgfrit `?kat=<slug>`; delbar/bogmærkbar URL, virker uden JS; `robots: noindex`). Validerer scope mod kategori-listen før RPC-kaldet. Trådliste med kategori/model-chip + forfatter/garage-badge + aktivitet + tal + highlightet uddrag; scope vises i tæller + tom-tilstand (med "søg i alle fora"-link). Statisk `soeg` vinder over dynamisk `[kategori]` (samme mønster som `ny`).
- `components/forum/TraadSoegeForm.tsx` - ren GET-form → `/forum/soeg` (ingen state). Tre former via props: `kategorier` → scope-dropdown (Alle fora + hvert rum, grupperet i `<optgroup>`); `scopeSlug` uden liste → skjult `kat`-felt (rum-søgning); ingen → søg i alt. Ligger på forsiden (m. dropdown), på resultatsiden (m. dropdown, forud-valgt), og på hver rum-side (rum-scopet).
- `components/forum/Uddrag.tsx` - splitter `chr(1)/chr(2)`-markører → `<mark>` (kobber, ingen grøn/blå).
- `ForumOversigt` er nu en ren server-visning (kategori-filter-boksen fjernet 23-11, se Beslutninger).

**Mangler/senere:** søg kan senere udvides til også at matche feedback-meldinger (bro til `/feedback`), og "ingen match → opret tråd"-genvej. P16 (afkortet moderings-liste i Værkstedet) kan nu genbruge samme FTS- + scope-mønster.

## Antal ejere pr. model-forum (P6) - bygget 23-11-2026
Social proof på model-foraene: hvert model-forum viser ejer-grafen ("her sker der noget" - den ambitiøse hook fra forum-planen). Tallet kommer fra **Min garage (`cars`), ikke fra forum-tråde**, så model-foraene er substantierede selv med 0 tråde. Verificeret mod garage-data: 7GT = 3 ejere / 3 biler / 11 bekræftelser.

**Beslutninger (truffet i sessionen):**
- **Datavej = server-side aggregering, INGEN migration.** `cars` + `confirmations` er begge read-all, og alt kører SSR, så vi henter de rå model-koblinger og tæller server-side (distinkte `owner_id` pr. `model_id`). `owner_id` når aldrig browseren. Valgt frem for en aggregat-view/RPC fordi P6's pointe er at **virke med det samme på de nuværende data** - en view/RPC ville først virke efter en Studio-kørsel (modarbejder "virker allerede"). Datasættet er lille (få biler/bekræftelser), så en server-query rækker rigeligt. **Vokser garagen sig stor, er en DB-view den naturlige næste optimering** - færdig SQL ligger i `supabase/sql-snippets/p6_model_ejer_tal_view.sql` (valgfri, ikke påkrævet).
- **Tre tal:** `ejere` = antal distinkte `owner_id` i `cars` for modellen (hovedtallet / social proof), `biler` = antal `cars`-rækker, `bekraeftelser` = antal `confirmations`-rækker på modellen (live bekræftelser; legacy-baseline er per-melding og indgår bevidst ikke her). Samme ejer med to biler af samme model tæller som **1 ejer, 2 biler** (verificeret).
- **Kun model-fora** (`model_id != null`) - tværgående kategorier har ingen ejer-graf. Tal under alt (0) skjules, så et helt tomt model-forum ikke viser "0 ejere".
- **Ingen forum-trafik-afhængighed** (modsat P5): ejer-grafen lever på garage-data.

**Kode (ren kode, ingen migration/RPC):**
- `lib/forum.ts:getModelEjerTal()` - henter `cars(owner_id, model_id)` + `confirmations(model_id)`, aggregerer til `Record<model_id, {ejere, biler, bekraeftelser}>` (kun modeller med data optræder). Server-side i `supabaseServer()`.
- `lib/forum.ts:getForumGrupper()` - kalder `getModelEjerTal()` i sin `Promise.all` og hænger `ejere/biler/bekraeftelser` på hver `ForumKategoriStat` (0 på ikke-model-kategorier).
- `lib/types.ts:ModelEjerTal` + 3 felter tilføjet `ForumKategoriStat`.
- `components/forum/ForumOversigt.tsx` - model-rækker viser en **kobber-chip "N ejere"** under navnet (synlig på ALLE skærme, også mobil hvor tal-kolonnerne er skjult - så model-foraene føles levende). Skjult ved 0 ejere.
- `app/forum/[kategori]/page.tsx` - model-kategori-siden viser øverst en chip-linje **"N ejere i Garagen · N biler · N bekræftelser"** (kobber + grafit, kun chips > 0). `getModelEjerTal()` hentes kun når siden er et model-forum.
- Genbruger `.chip`-komponentklassen + grafit/kobber - ingen grøn/blå.

**Verificeret:**
- `npm run build` grønt (type-check + lint).
- Aggregerings-semantikken kørt i lokal engangs-Postgres 16 (sandboxen kan ikke nå Pixa): fixture med 7GT = 3 ejere/3 biler/11 bekræftelser og en samme-ejer-to-biler-model (→ 1 ejer/2 biler) gav præcis de forventede tal. Samme fixture kørt mod TS-aggregeringen → identisk. En model helt uden data → alt 0 (skjult i UI).
- **Live-verifikation (Torben):** åbn `/forum` + et model-forum (fx 7GT) på zeekr-garage.dk og bekræft at "N ejere" matcher antallet af distinkte ejere i Min garage for modellen.

**Mangler/senere:** hvis "bekræftelser" skal følge boardets visning (live + legacy-baseline) i stedet for rene live-rækker, er det en lille ændring i `getModelEjerTal`. Ved stor garage: skift til DB-view'en (SQL ligger klar, se ovenfor).

## Billeder i forum-indlæg (bygget 22-11-2026)
Brugere kan vedhæfte billeder til forum-indlæg (åbnings-indlæg + svar).
- **Storage:** selvhostet Supabase Storage på **Zeekr-instansen** (container `supabase-storage-zdmeluhkaf…` + `imgproxy-zdmeluhkaf…` - hver Supabase-instans har SIN EGEN isolerede storage+DB; vi deler IKKE med Karvia/lejesyn). Verificeret at Kong ruter `/storage/v1` og at tunnelen eksponerer `https://api.zeekr-garage.dk/storage/v1`.
- **Migration `20261122130000_forum_billeder.sql` (KØRT i Studio 22-11, verificeret: bucket + 4 storage-policies + tabel + 3 policies):** public bucket `forum` (maks 5 MB, kun jpeg/png/webp/gif). Storage-policies på `storage.objects`: public læs; authenticated upload/slet kun i egen mappe (`(storage.foldername(name))[1] = auth.uid()`); moderator slet alt i bucketen. Tabel `forum_post_images` (post_id FK cascade, path, display_order) + RLS (læs alle; insert kun på eget indlæg; slet eget/moderator).
- **Flow:** browseren uploader direkte til Storage (`supabaseBrowser().storage.from('forum').upload('<user_id>/<uuid>.<ext>')` - RLS kræver egen mappe), får path'en, og server-actionen (`opretTraad`/`svar`) gemmer path i `forum_post_images` (RLS: eget indlæg). Visning via offentlig URL `…/storage/v1/object/public/forum/<path>` (`lib/billeder.ts:forumBilledeUrl`).
- **Kode:** `lib/billeder.ts` (URL-helper + grænser: 6 billeder, 5 MB). `components/forum/BilledeUpload.tsx` (filvælger → upload → thumbnails m. fjern; henter selv bruger-id). `opretTraad`/`svar` tager nu `billeder: string[]` (validerer path starter med eget user-id). `getIndlaeg` embedder `forum_post_images` → `ForumIndlaeg.billeder` (offentlige URL'er). `NyTraadForm` + `ForumTraad`-composer har billed-upload; `ForumTraad` viser billeder i indlæg (klik = fuld størrelse i ny fane). Svar kan nu være billede-kun.
- **Mangler/senere:** ~~redigering af et indlægs billeder~~ **BYGGET 23-11 (P8, se eget afsnit)**; ~~oprydning af forældreløse storage-filer~~ **BYGGET 23-11 (P9, se eget afsnit)**; billeder i beskeder/feedback.

## Forum-kategorier: bruger-ønsker tilføjet (21-11-2026)
Første bruger-feedback → 6 nye kategorier (migration `20261121220000_forum_kategorier_2.sql`, kørt i Studio): **Dæk, fælge & undervogn** + **DIY & FAQ** (Teknik), **Bilpleje & detailing** + **Forsikring, service & værksted** (Ejer-lounge), **Træf, køreture & events** (ny gruppe **Fællesskab**), **Køb, salg & bytte** (ny gruppe **Marked**). Forum har nu 21 kategorier / 6 grupper.
- **"Køb, priser og levering"-tvivlen er dermed løst:** Ejer-lounge "Køb, priser & levering" = ny bil / forhandler / levering; Marked "Køb, salg & bytte" = brugt mellem ejere. De to dækker hver sit, ingen omdøbning nødvendig. (Kategori-editoren kan nu flytte en kategori mellem grupper direkte i UI - se P7.)

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
- **Indgang:** (1) "✉️ Skriv"-knap på forum-indlæg (ikke egne, kun indlogget) i `ForumTraad.tsx` → `startSamtaleMedBruger` → hopper til samtalen. (2) **Ny: "Ny besked"-compose** (`/beskeder/ny`) - direkte mellem brugere uden oplæg, se "## Beskeder: direkte compose". "✉️ Beskeder"-link i nav (desktop + mobil) for indloggede.
- **pb_besked i klokken:** notifikations-kernens `NotifBell` viser pb_besked generisk (tekst + href `/beskeder/<id>`); klik hopper til samtalen. `markLaest` rydder pb_besked-notifikationer for samtalen.
- **VERIFICERET LIVE 22-11-2026 (via Chrome, Torben + Test konto):** "✉️ Skriv" på forum-indlæg → samtale oprettet + navigeret; send besked (RLS insert) → boble; **realtime begge veje** (svar indsat i Studio dukkede op live uden reload, setAuth-JWT); **pb_besked-klokke** tikkede live da samtalen var lukket, dropdown viste "Test konto sendte dig en besked", klik → samtale + markér læst; **blokér** → composer deaktiveret. Al testdata ryddet op bagefter (convs/parts/msgs/blocks/pb_notifs = 0).
- **Rettet edge (commit efter):** at anmelde en samtale UDEN beskeder sendte et tomt (ugyldigt) besked-id → `anmeldBesked` sender nu `null` som message_id.
- **Mangler/senere:** ~~gruppe-samtaler (modellen holder til det)~~ **BYGGET 23-11 (P12, se "## Beskeder: gruppe-samtaler (P12)")**; ~~billeder i beskeder~~ **BYGGET 23-11 (P10)**. (Moderator-visning af anmeldelser er nu bygget - se "## Admin: besked-anmeldelser".)

## Beskeder: direkte compose (bygget 22-11-2026)
Man kan nu skrive direkte til en anden ejer uden at gå via et forum-indlæg. Motoren (conversations/messages/blokering/anmeldelse/ulæst) fandtes i forvejen - det der manglede var en modtager-indgang. **Ingen migration:** profiler er offentligt læsbare (`profiles_read_all`), og `start_samtale`-RPC'en håndterer alle vagtværker (ikke dig selv, bruger findes, ikke blokeret).

- **Søgning:** `soegBrugere(q)` i `lib/beskeder.ts` - delstrengs-match på `display_name` (renset for PostgREST-metategn), bil-badge med, ekskluderer mig selv + blokerede begge veje, limit 10. Server-action `soegModtagere(q)` i `app/beskeder/actions.ts` (kræver login).
- **UI:** `/beskeder/ny` (`app/beskeder/ny/page.tsx` + `components/beskeder/NyBeskedView.tsx`): debounced søgefelt (min. 2 tegn, ignorerer forældede svar via seq-ref), resultatliste m. navn + garage-badge, klik → `startSamtaleMedBruger` → `/beskeder/<id>`. "Ny besked"-knap + opdateret tekst/empty-state på `/beskeder`. `ny` kolliderer ikke med `[id]` (statisk segment vinder; conv-id'er er uuid'er).
- **Note (spam-flade):** cold-DM via navnesøgning er nu mulig. Afbødet af eksisterende blokér + anmeld + `message_reports`. Navne/bil-badges er i forvejen offentlige på forum, så søgningen afslører intet nyt. Kan gates senere (fx kun præcist navn) hvis det bliver et problem.
- `npm run build` grønt. Ingen DB-ændring, ingen Studio-kørsel.
- **In-context-indgang (bygget 22-11):** "✉️ Skriv privat"-knap på kommentar-forfattere (Byggemøde) i `components/Kommentarer.tsx` (ikke egne, kun indlogget) → `startSamtaleMedBruger` → `/beskeder/<id>`. Dermed er besked-indgangen hel: forum-forfattere + kommentar-forfattere + compose-søgning. **Ikke muligt andre steder:** `/garage` er brugerens egen (ingen andre ejere), melding-siden eksponerer ingen forfatter, og event-deltagere (`EventDeltager`) bærer kun navn/note - intet bruger-id at skrive til.
- **VERIFICERET LIVE 22-11-2026 (Chrome, Torben):** compose virker - søg (`test` → Test konto, ingen bil-badge), compose → samtale åbnede rigtig samtale-id, og **blokeret-ekskludering bekræftet** (blokeret Test konto forsvandt fra søgningen → "Ingen ejere matcher", blokering fjernet igen). Rest: én tom samtale med Test konto (kan ryddes i Studio som sidst). In-context kommentar-knappen kunne IKKE øves live endnu - sitet er under opbygning, og board-kommentarerne er porteret seed-data uden `author_id` (knappen vises korrekt ikke på dem). Den dukker op af sig selv når en registreret bruger (ikke én selv) kommenterer.

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

## Beskeder: billeder (P10) (bygget 23-11-2026)
Sidste trin i billed-sporet **P3 ✓ -> P8 ✓ -> P9 ✓ -> P10 ✓**. En bruger kan vedhæfte 1..n billeder til en besked i en 1:1-samtale og se dem i tråden. Mobil-kamera virker gratis (den genbrugte `BilledeUpload` har `accept="image/*"`), så en ejer kan tage et foto direkte i samtalen.

**Afklaring (Claudes vurdering, kan ændres):** en besked må være **kun-billede** (tekst valgfri når der er mindst ét billede) - passer til snap-og-send fra mobil. `messages.body` er `not null`, så kun-billede gemmes som tom streng (ingen skema-ændring på `messages`). Indbakke-preview viser "📷 Billede" når seneste besked er billed-kun. Kun **eksisterende 1:1-samtaler** (gruppe = P12).

**DET AFGØRENDE = PRIVATLIV (forskellen fra forum/meld).** Forum- og meld-billeder ligger bevidst i **public** read-buckets. Private beskeder må IKKE det - kun samtalens to parter må kunne se billederne. Derfor:
- **Privat bucket `besked`** (`public=false`), INGEN offentlig/bred læse-policy på `storage.objects`. Der er altså ingen `billedeUrl()`-public-vej - `urlFor`-propen blev IKKE genbrugt blindt.
- **Authz'd serve-rute** `app/beskeder/billede/[...sti]/route.ts`: på HVER forespørgsel tjekkes at kalderen er logget ind og enten **uploader** (path-præfiks = eget bruger-id, dækker composer-preview før beskeden er sendt) eller **deltager** i den samtale et besked-billede med dette path hører til. Først derefter streames bytes via **service-rollen** (bypasser RLS i selve storage-opslaget). Ingen signed-URL-token der kan videresendes; adgang revurderes ved hvert hit. `beskedBilledeUrl(path)` (lib/billeder.ts) bygger serve-rute-URL'en.
- **`message_images`-RLS:** læs/skriv KUN for samtale-parter (security-definer-helpere `er_besked_deltager`/`er_besked_afsender`, samme anti-rekursions-mønster som `er_deltager`). **Moderatorer får bevidst INGEN læse-adgang** til besked-billeder (de må kun slette, uden at se) - samme privatlivsvalg som besked-anmeldelser, hvor kun anmeldt indhold eksponeres.

**Filer:**
- Migration `supabase/migrations/20261123160000_besked_billeder.sql` (**skal køres i Studio 8002**): privat bucket + `storage.objects`-policies (insert/delete egen mappe, delete-mod) + helpere + tabel `message_images` + RLS. Idempotent.
- `lib/billeder.ts`: `BESKED_BUCKET` + `beskedBilledeUrl()` (privat serve-rute-vej).
- `app/beskeder/billede/[...sti]/route.ts`: serve-ruten (ny).
- `lib/beskeder.ts` `getSamtale`: henter `message_images` pr. besked (RLS-afgrænset) -> `Besked.billeder`. `getSamtaler`: "📷 Billede"-preview ved kun-billede.
- `app/beskeder/actions.ts` `sendBesked(convId, body, billeder[])`: gemmer `message_images` (kun egne paths, maks `MAKS_ANTAL`), tillader kun-billede, returnerer besked-id (til optimistisk visning).
- `components/beskeder/SamtaleView.tsx`: `BilledeUpload` i composeren (bucket=`besked`, `urlFor=beskedBilledeUrl`), `BilledeGalleri` pr. besked, realtime henter billeder efter beskeden (ét retry pga. indsættelses-race), optimistisk visning af egne.
- Oprydning: `sletAnmeldtBesked` (moderator) fjerner nu storage-filerne straks (P9-mønster, via service-rollen da moderator ikke kan læse `message_images`). Admin-sweep i Værkstedet dækker nu også `besked`-bucketen (`BESKED_SPOR` i `lib/storage-oprydning.ts`, kørt med service-rollen; panelet viser et `besked`-tal). Skjulte samtaler (P15) beholder bevidst filerne (reversibelt, modparten ser dem stadig).

**Verificeret:** `npm run build` grønt (ingen type/lint-fejl). 13 RLS/privatlivs-checks i lokal Postgres 16 (den rigtige migration kørt verbatim mod storage-stubs): part A+B kan læse; udenforstående C **og moderator M kan IKKE** læse; kun afsender kan indsætte (ikke-afsender-part + udenforstående afvist); kun afsender/moderator kan slette; `besked`-bucket er privat; storage-upload kun i egen mappe; ingen direkte storage-listing (ingen select-policy). Migration idempotent (genkørt rent). Mobil-kamera arvet fra den uændrede `BilledeUpload`. Sandboxen kan ikke nå Pixa, så live-visning + realtime testes af Torben efter migrationen er kørt i Studio.

## App-ikon & favicon (23-11-2026)
Bookmark/"installér app" viste før browserens grå "Z"-fallback, fordi sitet ikke havde noget ikon defineret. Nu et rigtigt ikon-sæt i grafit+kobber (sitets egen palet, IKKE Zeekr-logo/-farver): to-tone "ZG"-monogram (Z off-white, G kobber) på grafit-gradient. Filer: `app/icon.png` (512), `app/apple-icon.png` (180, iOS/macOS home-screen), `app/favicon.ico` (16/32/48), `public/icon-192.png` + `public/icon-512.png` + `public/icon-maskable-512.png` (manifest/Android), `app/manifest.ts` (navn + grafit `theme_color` #17191d + maskable-ikon), og `viewport.themeColor` i `app/layout.tsx`. Next App Router auto-wirer icon/apple-icon/favicon/manifest. Dockerfile kopierer allerede `public/`. Ingen migration. Genereret med Pillow (DejaVu Sans Bold) - scriptet bor uden for repoet. Bruger ser først det nye ikon efter et frisk bookmark (gamle cacher browseren).

## Feedback-meldinger: billeder (P3) (bygget 22-11-2026)
Foto-bevis i fejlmeldinger. En fejl med et skærmbillede (OTA-fejlbesked, fysisk defekt, log) vejer tungere over for Zeekr end ren tekst - styrker QA-sagen. Første trin i billed-sporet **P3 → P8 (redigér billeder) → P9 (oprydning af forældreløse filer)**.

- **⚠️ KRÆVER 1 MIGRATION KØRT I STUDIO FØR det virker live:** `supabase/migrations/20261122190000_meld_billeder.sql`. Kør i Zeekr-instansens SQL-editor (`http://192.168.1.18:8002`, Studio → SQL). Idempotent. Opretter: storage-bucket `meld` (public read, kun billeder, 5 MB) + 4 storage-policies + tabel `public.issue_images` + 3 RLS-policies. **PostgREST er all-or-nothing:** `issue_images` SKAL findes før koden deployes, ellers fejler ALLE board/melding-queries (`getIssues`/`getIssueDetalje` selecter nu `issue_images`). Kør migrationen FØR/samtidig med at deployen går live.
- **Arkitektur = kopi af forum-billedmønsteret** (`20261122130000_forum_billeder.sql`), men **egen bucket + egen tabel** (`meld` / `issue_images`), så oprydning (P9) og regler kan holdes adskilt fra forummets `forum`/`forum_post_images`.
- **Upload (klient, i MeldForm):** browseren uploader direkte til Storage med brugerens JWT til `<user_id>/<uuid>.<ext>` (RLS: egen mappe). Efter `issues`-insert + `issue_models`-insert kobles paths i `issue_images` (filtreret til egen mappe, maks 6). **Best-effort:** fejler billed-koblingen, tabes selve meldingen IKKE (evt. forældreløse filer ryddes af P9-sweep'et).
- **Genbrugt komponent:** `components/forum/BilledeUpload.tsx` er generaliseret med props `bucket` / `urlFor` / `maksAntal` (forum-default uændret). `/meld` kalder den med `bucket="meld"` + `meldBilledeUrl`.
- **Visning:** board-kort (`FejlBoard.tsx`) viser 📷-tal + op til 3 thumbnails (klik → melding); melding-detalje (`/melding/[id]`) viser galleri ("Foto-bevis" for fejl, "Billeder" for ønske) via `components/BilledeGalleri.tsx` - en client-lightbox: klik åbner billedet i et overlay i selve siden (kryds, luk på Esc + klik udenfor, baggrunds-scroll låst), IKKE en ny fane. Begge via `issue.billeder` (offentlige URL'er), hentet i `ISSUE_SELECT`/`mapIssue` (`lib/queries.ts`). `BilledeGalleri` bruges nu også i forum-visningen (`ForumTraad.tsx`) - samme lightbox på forum-indlægs billeder.
- **Datalag:** `lib/billeder.ts` har nu `MELD_BUCKET` + `meldBilledeUrl` + fælles `billedeUrl(bucket,path)`. `IssueRow.billeder: string[]` tilføjet. Tilladte typer/størrelse (JPG/PNG/WebP/GIF, 5 MB, 6 stk.) deles med forum.
- **Stil:** grafit/kobber, ingen ny farve; genbrugte mønstre. Almindelige bindestreger.
- `npm run build` grønt.
- **Live-test mangler** (kræver migration kørt). Test-vej: log ind → `/meld` → vælg fejl → udfyld → "Tilføj billede" (1-6 stk.) → meld → se thumbnails på board-kortet og galleri på detaljen. Tjek også at en melding UDEN billeder ser uændret ud.
- **Åbent/næste i sporet:** P8 = redigér et indlægs billeder - **BYGGET 23-11 for FORUM-indlæg** (se "## Forum-indlæg: redigering af billeder (P8)"). NB: feedback-meldinger har stadig ingen edit-UI overhovedet (kun kommentarer kan rettes), så billed-redigering af en *melding* afventer at melding-edit bygges. P9 = ryd forældreløse storage-filer når indhold slettes - **BYGGET 23-11** (meld-sletning rydder straks; forum-soft-remove bevarer bevidst; admin-sweep rydder orphans). Se "## Forum/Meld: oprydning af forældreløse storage-filer (P9)".

## Forum-indlæg: redigering af billeder (P8) (bygget 23-11-2026)
Et forum-indlægs redigér-tilstand kunne før kun rette teksten. Nu kan man også tilføje nye billeder og fjerne eksisterende, direkte i samme redigér-boks. Andet trin i billed-sporet **P3 ✓ → P8 ✓ → P9**.

- **INGEN migration.** Genbruger forum-billed-infrastrukturen fuldt ud: `forum`-bucket + `forum_post_images` + deres RLS fra `20261122130000_forum_billeder.sql`. De nødvendige politikker fandtes allerede: `forum_post_images_insert` (indsæt på eget indlæg), `forum_post_images_delete` (slet eget/moderator), og storage-policyerne (upload/slet i egen mappe + moderator-slet). P8 er ren kode.
- **Arkitektur = samme mønster som opret/svar:** browseren uploader nye filer direkte til Storage (egen mappe, via `BilledeUpload`), server-actionen kobler paths i `forum_post_images`. Fjernelse sker server-side: DB-rækken slettes (RLS) + best-effort sletning af selve storage-filen (forældreløse rester ryddes af P9-sweep'et).
- **Datalag:** `ForumIndlaeg` har nu `billederPaths` (rå storage-paths, parallelt med `billeder`-URL'erne) - `getIndlaeg` (`lib/forum.ts`) fylder begge. Redigér-UI'en bruger paths til at udpege hvilke eksisterende billeder der fjernes.
- **Server-action `retIndlaeg` (`app/forum/actions.ts`) udvidet** med to valgfrie params: `fjernPaths` (eksisterende paths til fjernelse) + `nyeBilleder` (netop uploadede paths). Ren tekst-redigering er uændret (begge default `[]`). Actionen henter indlæggets nuværende billeder for at (a) validere resulterende antal og (b) give de tilføjede et `display_order`-offset efter de beholdte (ingen kollision). Validering: åbnings-indlæg skal altid have tekst; et svar må være tomt for tekst hvis mindst ét billede er tilbage; maks `MAKS_ANTAL` (6) i alt. `tilfoejBilleder` fik en `offset`-param (default 0 → opret/svar uændret).
- **UI (`components/forum/ForumTraad.tsx`):** i redigér-tilstand vises eksisterende billeder som thumbnails med et ×-kryds; klik markerer til fjernelse (dæmpes + gråtones, ↺ fortryder) - intet slettes før man trykker **Gem**, så Annullér er sikker. `BilledeUpload` genbruges til nye billeder med `maksAntal` = resterende plads. **Kun forfatteren kan tilføje nye** (RLS: insert kræver eget indlæg); moderator kan stadig **fjerne** eksisterende (RLS dækker eget/moderator). Visning (ikke-redigér) er uændret: `BilledeGalleri`-lightbox.
- **Note (orphans):** uploader man et nyt billede i editoren og trykker Annullér (eller forlader siden), bliver filen liggende forældreløs i storage - samme best-effort-mønster som svar/opret-composeren. **Ryddes nu af P9-sweep'et** (se nedenfor).
- `npx tsc --noEmit` + `npm run build` grønt.
- **Live-test mangler** (sitet kører på Pixa; ingen DB-ændring at køre). Test-vej: log ind → åbn egen forum-tråd/svar → ✏️ Ret → fjern et eksisterende billede (×) + Tilføj billede → Gem → bekræft at galleriet viser den nye sammensætning og at "redigeret" vises. Tjek også: moderator kan fjerne et fremmed indlægs billede men ser ikke "Tilføj billede"; åbnings-indlæg kan ikke gemmes med tom tekst.

## Forum/Meld: oprydning af forældreløse storage-filer (P9) (bygget 23-11-2026)
Tredje og sidste trin i billed-sporet **P3 ✓ → P8 ✓ → P9 ✓**. Mål: billed-filer skal ikke hobe sig op i storage når indhold fjernes eller uploads fortrydes. **INGEN migration/SQL** - ren kode, genbruger de eksisterende buckets/tabeller/policies fra `20261122130000_forum_billeder.sql` + `20261122190000_meld_billeder.sql` (storage-read `using(bucket_id=...)` + `*_delete_mod` via `er_moderator()`).

**Beslutning (de to spor behandles bevidst forskelligt - reversibilitet afgør):**
- **Meld = HÅRD sletning → ryd filer straks.** `sletMelding` (`app/admin/actions.ts`) hard-sletter issue'et (cascade fjerner `issue_images`-rækkerne). Nu hentes billed-paths FØR delete, issue'et slettes, og filerne fjernes til sidst best-effort via `sb.storage.from(MELD_BUCKET).remove(paths)`. Sletningen er allerede uoprettelig, så der er intet at bevare.
- **Forum = soft-remove → bevar filer bevidst.** `fjernIndlaeg`/`fjernTraad` er uændrede: de sætter kun `is_removed=true` og **beholder både `forum_post_images`-rækkerne og storage-filerne**. Begrundelse: soft-remove er reversibelt (ingen gendan-UI i dag, men datamodellen holder til det), og at destruere filen ved en reversibel handling ville give et evt. gendannet indlæg brudte billeder uden reel gevinst. Mængden fra fjernelser er afgrænset af moderering, ikke en løbesk lækage. **NB:** fordi rækkerne bevares, tæller soft-removed forum-filer som "refererede" og røres derfor IKKE af sweep'et - en ren "slet filer uden reference"-sweep ville aldrig have fanget dem.
- **Den reelle ubundne lækage = compose/editor-upload-så-fortryd** (+ P8-edit hvor best-effort fil-slet fejlede) = ægte forældreløse filer (ingen DB-række). Dem rydder admin-sweep'et.

**Admin-sweep (Værkstedet, kun admin):**
- `lib/storage-oprydning.ts`: lister ALLE objekter i en bucket via storage-API'et (`list` rekursivt gennem `<user_id>/`-mapperne, pagineret), henter ALLE refererede paths fra koblings-tabellen, og regner differencen = forældreløse. **Aldersgrænse `MIN_ALDER_TIMER = 24t`:** filer yngre end et døgn spares, så en igangværende compose-upload aldrig rammes. Sletter via storage-API'et (`remove`, i batches à 100) - **IKKE** SQL-delete på `storage.objects` (det fjerner ikke selve filen - lært i P8).
- `app/admin/actions.ts`: `taelForaeldreloeseFiler()` (tæl) + `rydForaeldreloeseFiler()` (ryd), begge `erAdmin()`-gated. **Serveren rescanner selv ved sletning** - klienten sender aldrig paths (ingen injection-flade).
- `components/admin/StorageOprydningPanel.tsx`: "🗂️ Forældreløse billed-filer" i Værkstedet (`app/admin/page.tsx`, efter Oprydning). Samme tæl→ryd-mønster som stemme-oprydningen; viser forum/meld-split; sletning kan ikke fortrydes.
- **Rydder også allerede-ophobede orphans** (den sammenligner nuværende storage mod nuværende referencer), så eksisterende rester fjernes i app'en - intet manuelt arbejde i Studio.

**Verificering:** `npx tsc --noEmit` + `npm run build` grønt. **Live-test mangler** (ingen DB-ændring at køre; auto-deploy on push). Test-vej: log ind som admin → Værkstedet → "Vis antal" (ser nuværende orphans) → upload et billede i en forum-compose og forlad uden at gemme → vent >24t (eller sænk `MIN_ALDER_TIMER` midlertidigt) → "Vis antal" tæller det → "Ryd" fjerner det. Tjek også at et soft-removed forum-indlægs billeder IKKE ryddes, og at sletning af en melding med billeder fjerner meld-filerne straks.

## Beskeder: bruger-sletning af samtaler (P15) (bygget 22-11-2026)
Brugere kan nu selv fjerne egne samtaler fra indbakken, så oprydning ikke kræver SQL i Studio. **Semantik: skjul-for-mig** (ikke hård sletning).

- **⚠️ KRÆVER 1 MIGRATION KØRT I STUDIO FØR koden pushes/deployes:** `supabase/migrations/20261122180000_samtale_skjul.sql`. Kør i Zeekr-instansens SQL-editor (`http://192.168.1.18:8002`, Studio). Idempotent (`add column if not exists`). Tilføjer kun én kolonne - ingen ny tabel/policy. PostgREST er all-or-nothing, så kolonnen SKAL findes før `getSamtaler` selecter `hidden_at`, ellers fejler alle besked-queries.
- **Semantik:** "Slet" sætter MIN egen `conversation_participants`-rækkes `hidden_at = now()`. Samtalen filtreres fra i `getSamtaler` (`hidden_at` sat OG `last_message_at <= hidden_at`). Den **dukker op igen** hvis den anden skriver - en ny besked bumper `conversations.last_message_at > hidden_at` via den eksisterende `messages_after_insert`-trigger. Ingen hård sletning: den andens kopi/historik røres ikke, og skriver jeg selv i samtalen igen, kommer den også tilbage hos mig.
- **Ingen ny RLS:** den eksisterende `conv_part_update_own` (update på egen række, `user_id = auth.uid()`) dækker allerede at sætte `hidden_at`.
- **Backend:** `hidden_at` tilføjet til `PART_SELECT` + filter-loop i `getSamtaler` (`lib/beskeder.ts`). Ny server-action `sletSamtale(convId)` i `app/beskeder/actions.ts` (`kraevBruger`-gated, `revalidatePath('/beskeder')`).
- **UI:** (1) "Slet"-knap i samtale-header (`components/beskeder/SamtaleView.tsx`) med inline bekræft ("Slet samtale?" / "Fortryd") → `router.push('/beskeder')` + refresh. (2) "Slet"-knap pr. indbakke-række (`components/beskeder/IndbakkeSletKnap.tsx`, ny client-komponent) med samme inline bekræft → `router.refresh()`. Rækken i `app/beskeder/page.tsx` er delt op, så `<Link>` er klikområdet og slet-knappen er en separat kontrol ved siden af (ikke en knap inde i et link).
- **Stil:** grafit/kobber, ingen ny farve; inline bekræft i stedet for native dialog (samme mønster som moderering). Almindelige bindestreger.
- `npm run build` grønt.
- **Live-test mangler** (kræver migration kørt). Test-vej: åbn en samtale → "Slet" → bekræft → væk fra indbakken; få den anden til at skrive → den dukker op igen med ulæst-prik.

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

## Selvbetjent mail-skift (bygget + opsat 22-11-2026, E2E-testet 23-11-2026 ✅)
Brugere kan selv skifte login-mail under **Min garage** med **enkelt bekræftelse** (kun den nye adresse, ét link). **End-to-end-testet live 23-11 af Torben: virker** (skift i Min garage → dansk mail på ny adresse → klik → `/auth/confirm` → login med ny mail). Kode + Supabase-opsætning færdig.
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

## Værksted: kategori-editor flyt mellem grupper (P7) - bygget 23-11-2026
Fjerner den sidste SQL-only pligt for kategori-kuratering: flytning mellem grupper og omsortering af grupperne kan nu gøres i UI på `/admin/forum`, uden SQL i Studio. **Ingen migration** - forum-RLS gav allerede `er_moderator()` skriveadgang til `forum_categories` (jf. "## Værkstedet - samlet administration"), så det er ren kode via server-actions.

- **To nye server-actions i `app/admin/forum-actions.ts`:**
  - `flytKategoriTilGruppe(id, maalGruppe)` - sætter kategoriens `group_label` + `group_order` (arvet fra målgruppen) og lægger den sidst i målgruppen (`display_order` = max+1). **Ét enkelt rækkes-update = atomisk.** Værn: en model-kategori (`model_id != null`) kan ikke flyttes, og ingen kategori kan flyttes IND i en model-gruppe. Målgruppen skal findes i forvejen (nye grupper laves stadig via "Ny kategori").
  - `flytGruppe(label, retning)` - omsorterer hele grupper ved at bytte `group_order` med nabogruppen. `group_order` er denormaliseret på hver række i gruppen, så det er to bulk-updates (én `update ... where group_label=` pr. gruppe). Der er ingen unique-constraint på `group_order`, så et direkte bytte er sikkert; hvert update er atomisk, og et evt. halv-gennemført bytte er selv-helbredende (kør igen).
  - `opretKategori` fik et **værn**: en almindelig kategori kan ikke oprettes i model-gruppen (`modelGruppeLabels`-tjek) - ellers kunne man skrive "Modellerne" i gruppe-feltet og lave en tom skal uden model-kobling (det skete faktisk under test: "17 X"). `flytKategori` (op/ned), `retKategori`, `saetKategoriLaast`, `sletKategori` er uændrede.
- **Model-gruppen identificeres robust** via `model_id != null` (ikke via den bogstavelige label "Modellerne"), så det holder selv hvis gruppen omdøbes.
- **UI (`components/admin/KategoriStyring.tsx`):**
  - Hver gruppe-overskrift har ↑/↓-pile (`flytGruppe`), deaktiveret på første/sidste gruppe. Ny indre `GruppeBlok`-komponent (egen `useKoer`).
  - Hver ikke-model-kategori har en "Flyt til gruppe:"-dropdown med de øvrige grupper (model-gruppen udeladt som mål). Model-kategorier viser i stedet en dæmpet note "🚗 Model-forum - fast i Modellerne".
  - **Oprettelse pr. gruppe (follow-up efter Torben-feedback 23-11):** den gamle ene "Ny kategori"-boks med et frit gruppe-skrivefelt var forvirrende (teksten blev stående, grupperne forsvandt, og man kunne komme til at lave en ny gruppe i stedet). Nu: en **"+ Ny kategori"-knap under hver gruppe** (låser gruppen fast, intet skrivefelt) + en **"+ Ny gruppe"-knap nederst** til en helt ny spand. `NyKategori` tog en `fastGruppe`-prop. Model-gruppen får ingen "+ Ny kategori" (viser i stedet "Model-fora tilføjes ikke her - de er koblet til en bil-model").
  - Grafit/kobber hele vejen, ingen grøn/blå.
- **Scope bevidst holdt til at redigere/flytte/oprette eksisterende grupper.** Slet-hvis-tom (findes). Arkivér-i-UI ikke med.
- `npm run build` **grønt** (`/admin/forum` 4.64 kB). **Verificeret live af Torben 23-11:** flyt/omsortering + ny gruppe/kategori i UI virker (to pushes: 1) flyt mellem grupper + gruppe-sortering, 2) per-gruppe-oprettelse + server-værn). Ingen migration/RPC at køre.
- **Oprydning:** test-kategorien **"17 X"** (lavet under test, lå som almindelig kategori i Modellerne) er **slettet af Torben 23-11**. Server-værnet forhindrer at den slags genskabes. (Tjek ved lejlighed om test-gruppen "TRÆF IGEN IGEN" også skal væk.)

## Tilføj model i Værkstedet (P17) - bygget 23-11-2026
En ny Zeekr-model + dens model-forum (+ 0..n varianter) kan nu oprettes i admin uden SQL. Det var den sidste SQL-only pligt på model-siden: et model-forum SKAL kobles til en `models`-række (badge, Min Garage-bil, "mig med"-bekræftelser, Zeekr-rapport), så Modellerne er bevidst spærret for almindelige kategorier (P7) - og en ny model kunne derfor kun fødes i Studio. Nu gøres det i Værkstedet.

- **⚠️ KRÆVER 1 MIGRATION KØRT I STUDIO (ellers fejler "Opret model"-knappen - resten af siden virker fint):** `supabase/migrations/20261123140000_tilfoej_model.sql`. Kør i Zeekr-instansens SQL-editor (`http://192.168.1.18:8002`, Studio). Idempotent (`create or replace function` + ingen skema-ændring), kan køres igen uden skade. SQL'en blev givet til Torben direkte (svar + fil) i sessionen, da repoet ikke er lokalt.
- **Beslutninger (truffet i sessionen):**
  - **Platform = dropdown af de kendte (SEA-R / PMA2+ / SEA1/SEA2) + "Anden (skriv selv)".** Ren fritekst inviterer til tastefejl ("PMA2" vs "PMA2+"), og platform-feltet driver "fejl rammer hele platformen"-grupperingen - så kontrolleret liste med escape-luge til en fremtidig platform.
  - **Varianter tastes med i samme flow (0..n rækker, valgfrit).** RPC'en opretter alt atomisk alligevel, og der er endnu ingen variant-editor (det er "senere"), så ellers ville en ny model stå helt uden trims. 0 varianter er tilladt.
- **RPC (mønsteret noten anbefalede):** `admin_opret_model(p_name, p_platform, p_slug, p_varianter text[])` - SQL/plpgsql, `security definer`, pinnet `search_path = public`, `er_admin()`-gated (rejser ellers). Opretter i ÉN transaktion: (1) `models`-række (`display_order` = max+10, samme 10-spring som seed), (2) `forum_categories`-række (slug=model-slug, description "Alt om <navn> - snak, spørgsmål og erfaringer.", icon 🚗, `model_id` sat, `display_order` = max+1 i model-gruppen), (3) 0..n `variants`. **Gruppen afledes ROBUST fra eksisterende model-fora** (`model_id != null`, ikke den bogstavelige label "Modellerne"), så det holder selv hvis gruppen er omdøbt/omsorteret; fallback 'Modellerne'/group_order 2 hvis DB er tom for model-fora. `grant execute ... to authenticated` + `revoke from public`. **models + variants beholder deres rene læse-RLS** - ingen nye insert-policies; skrivning sker kun gennem denne funktion (security definer bypasser RLS). Slug-konflikt (model ELLER kategori) rejser venlig fejl → hele oprettelsen ruller tilbage (ingen forældreløs model).
- **App:**
  - `app/admin/forum-actions.ts`: `opretModel({name, platform, varianter})` (ny `kraevAdmin()`-gate) kalder RPC'en. `slugModel()` sikrer `zeekr-`-præfiks (så model-badge + URL-mønster holder); varianter trimmes + dedup'es (case-insensitivt) + tomme fjernes før de sendes. Revaliderer `/admin/forum` + `/forum` + `/` + `/feedback` + `/meld` + `/garage` (model-listen driver dem alle).
  - `components/admin/TilfoejModel.tsx`: client-flow - navn, platform-dropdown (+ "Anden"-fritekst), dynamiske variant-rækker (+ tilføj / ✕ fjern), "Opret model". Succes viser link til det nye `/forum/<slug>`. Grafit/kobber, ingen grøn/blå.
  - `app/admin/forum/page.tsx`: ny **admin-only** sektion "Tilføj model" (gated på `erAdmin()` i server-komponenten - moderatorer ser den ikke; RPC'en er den egentlige grænse).
- **Verificeret:**
  - **RPC-SQL kørt i lokal engangs-Postgres 16** (sandboxen kan ikke nå Pixa): atomisk oprettelse (model+kategori+varianter), 0-variant-model, slug-konflikt → fuld rollback (ingen forældreløs model/variant), tomme/dublerede varianter håndteret, ikke-admin afvist, ny kategori lander sidst i Modellerne med group_order=2.
  - **0-variant-sikkerhed traced:** `getVarianter` bruger `?? []` overalt; `BilVaelger` deaktiverer variant-valget ved 0 (ingen "vælg variant"-tvang); `MinGarageForm`/`LoginForm` sætter `variant_id = null` (`ny.variantId || vs[0]?.id || null`); `ConfirmButton` bekræfter pr. bil med bilens `variant_id` (null OK); rapport-RPC'erne er uændrede og har altid tålt null variant. To-trins-flowet springer variant-valg over ved <2 varianter.
  - Det nye model-forum får **model-badge (ikke 💬)** og **ingen flyt-dropdown** i kategori-editoren - begge følger automatisk af `model_id != null`.
  - `npx tsc --noEmit` + `npm run build` **grønt** (`/admin/forum` 5,57 kB).
- **Live-test mangler** (kræver migrationen kørt i Studio): derefter som admin → Værkstedet → Forum → "Tilføj model" → opret en testmodel med 0 og med 2 varianter → se den i Modellerne + `/forum/<slug>` + i Min garage/meld-filter; ryd testmodellen op bagefter (slet-i-UI for en model er "senere", så en testmodel skal pt. fjernes i Studio).
- **Senere (ikke i P17):** rediger platform/varianter for en eksisterende model, slet/arkivér en model (cascade-værn mod model-forum med tråde).

## Slet/arkivér model i Værkstedet (P18) - bygget 23-11-2026
Modstykket til P17. En model kunne tilføjes i UI, men ikke fjernes/arkiveres - så en admin **uden Studio-adgang** sad fast (kunne ikke rydde en fejloprettet model). Nu kan hele model-siden kureres i Værkstedet uden SQL. Det var det sidste hul.

- **⚠️ KRÆVER 1 MIGRATION KØRT I STUDIO:** `supabase/migrations/20261123150000_arkiver_model.sql`. Kør i Zeekr-instansens SQL-editor (`http://192.168.1.18:8002`, Studio). Idempotent (`add column if not exists` + `create or replace function`). Indtil den er kørt: `getModels()` falder robust tilbage til ufiltreret (offentlige sider braekker IKKE), men Modeller-panelets handlinger fejler, og arkiv-filtrering er inaktiv. SQL'en blev givet til Torben direkte (svar + fil) i sessionen, da repoet ikke er lokalt.
- **To veje (en model er rygraden: badge, Min Garage-bil, bekræftelser, forum, rapport):**
  - **Slet (hard delete) KUN når modellen er TOM:** 0 ikke-fjernede forum-tråde, 0 `cars`, 0 `confirmations`. `admin_slet_model(p_slug)` tæller de tre; er alt 0 → slet `forum_categories`-rækken (evt. soft-removed tråde cascader med - de er allerede usynlige) + `models`-rækken (`variants` cascader). Ellers rejs en fejl der peger på "arkivér i stedet". (`cars.model_id` har bevidst INGEN cascade, så FK er sidste værn - men vi tæller før, så brugeren får en pæn fejl og intet forsøges slettet.)
  - **Arkivér når modellen ER i brug:** `admin_saet_model_arkiv(p_slug, p_arkiv)` sætter `models.archived` + låser/låser-op model-foraet (`is_locked`). Arkiveret = ude af alle "vælg model"-lister, men data + rapport intakt; foraet **låst men læsbart** (ikke skjult). Genaktivér = lås op (vi husker ikke en evt. tidligere manuel lås - simpelt).
- **Migration + RPC'er (samme mønster som `admin_opret_model`):**
  - `models.archived boolean not null default false` (lille skema-tilføjelse).
  - `admin_model_oversigt()` - read-RPC (security definer, `er_admin()` i WHERE → ikke-admin får tom liste). Én række pr. model (også arkiverede, så de kan genaktiveres) med brugs-tal; tæller KUN ikke-fjernede tråde. Korrekte tal uanset RLS.
  - `admin_slet_model(p_slug)` + `admin_saet_model_arkiv(p_slug, p_arkiv)` - mutations-RPC'er, `security definer`, pinnet `search_path`, `er_admin()`-gated (rejser ellers). `grant execute to authenticated` + `revoke from public`. models/variants/forum_categories beholder deres rene læse-RLS; skrivning sker kun gennem funktionerne.
- **App:**
  - `lib/queries.ts`: `getModels()` filtrerer nu `archived=false` (driver board-filter, Min garage, signup, `/meld`). Robust fallback: hvis `archived`-kolonnen mangler (før migration), køres en ufiltreret query i stedet, så de offentlige sider ikke braekker i vinduet mellem deploy og migration (intet er arkiveret før migrationen alligevel). Historik/rapport uroert: eksisterende biler/bekræftelser/rapport læser model via joins/`issue_models`, ikke `getModels()`, så arkiverede modeller vises stadig dér.
  - `lib/queries-admin.ts`: `getModelOversigt()` → `ModelOversigt[]` (kalder `admin_model_oversigt`).
  - `app/admin/forum-actions.ts`: `saetModelArkiv(slug, arkiv)` + `sletModel(slug)` (begge ny `kraevAdmin()`-gate). Revaliderer `/admin/forum` + `/forum` + `/` + `/feedback` + `/meld` + `/garage`.
  - `components/admin/ModellerPanel.tsx`: client-panel - liste med ModelBadge + navn + platform + brugs-tal ("N biler · N bekræftelser · N tråde") + handling pr. model. Tom model → Slet (bekræft-trin inline); model i brug → Arkivér; arkiveret model → Genaktivér, vist i egen dæmpet "Arkiveret"-underdeling. Grafit/kobber, ingen grøn/blå.
  - `app/admin/forum/page.tsx`: panelet ligger under "Tilføj model" i samme **admin-only** sektion (`erAdmin()`-gated; `getModelOversigt()` hentes kun når admin).
- **Verificeret:**
  - `npx tsc --noEmit` + `npm run build` **grønt** (`/admin/forum` 6,7 kB).
  - **RPC-SQL kørt i lokal engangs-Postgres 16** (sandboxen kan ikke nå Pixa), 8 scenarier: (1) oversigt som admin = korrekte tal (soft-removed tråd tælles ikke med); (2) slet model i brug → fejl der peger på arkivér; (3) arkivér → `archived=true` + forum `is_locked=true`, væk fra `archived=false`-listen, confirmations bevaret (rapport intakt); (4) genaktivér → `archived=false` + forum låst op; (5) slet tom model → model + forum-kategori + variant væk (cascade); (6) model med KUN soft-removed tråd → slettes (tæller som tom, tråd cascader); (7) non-admin → tom oversigt + slet/arkivér afvist; (8) ukendt slug → venlig fejl.
- **Live-test mangler** (kræver migrationen kørt i Studio): som admin → Værkstedet → Forum → Modeller-panel → opret en testmodel (P17) → slet den (tom, skal lykkes) → arkivér en rigtig model → se den forsvinde fra Min garage/meld/board-filter men stadig tælle i rapporten → genaktivér.
- **Senere (ikke i P18):** redigér platform/varianter for en eksisterende model (variant-editor); evt. huske tidligere manuel lås-tilstand ved genaktivér (pt. genaktivér = lås altid op).

## Backlog-note: Slet/arkivér model i Værkstedet (P18) - brief til frisk session
> **BYGGET 23-11-2026 - se "## Slet/arkivér model i Værkstedet (P18)" ovenfor.** Noten herunder er det oprindelige oplæg (historik).

Mål: modstykket til P17. Man kan tilføje en model i UI; man skal også kunne fjerne/arkivere den - ellers er en admin uden Studio-adgang låst ude (Torbens pointe 23-11), og det bryder princippet om at ALT forum-/model-kuratering sker i Værkstedet uden SQL. Dette er det sidste hul på model-siden.

- **Kerne-spænding:** en model er rygraden (badge, Min Garage-bil, bekræftelser, forum, rapport). At hard-slette en model i brug ville cascade-smadre ejer-biler (`cars` → `confirmations` cascader) og forum-indhold. Derfor to veje:
  - **Slet (hard delete) KUN når modellen er tom:** 0 ikke-fjernede tråde i dens forum, 0 `cars`, 0 `confirmations`. Så er det en ren fjernelse (som en testmodel). Admin-RPC `admin_slet_model(p_slug)` (security definer, `er_admin()`): tæl de tre; er alt 0 → slet `forum_categories`-rækken + `models`-rækken (`variants` cascader); ellers rejs en fejl der peger på "arkivér i stedet". (models/variants/forum_categories har ingen delete-policy i dag - derfor RPC, samme mønster som `admin_opret_model`.)
  - **Arkivér når modellen ER i brug:** bevar alle data + rapporter, men tag modellen ud af omløb. Kræver flag `models.archived boolean not null default false` (lille migration, køres i Studio ÉN gang - selve arkiverings-HANDLINGEN er derefter UI). Admin-RPC `admin_saet_model_arkiv(p_slug, p_arkiv boolean)`.
- **Hvad "arkiveret" betyder (beslut i sessionen):**
  - Forsvinder fra "vælg model"-lister: `getModeller()` (board-filter), `BilVaelger` (Min garage + signup), `/meld`. Filtrér `archived=false` dér (evt. et `inkluderArkiverede`-flag til admin-visninger). **Gennemgå ALLE steder `models` læses**, så en arkiveret model ikke kan vælges nyt, men stadig vises på eksisterende biler/bekræftelser/rapporter (historik intakt).
  - Forummet: **BESLUTTET 23-11 (Torben):** et arkiveret model-forum **låses** (`is_locked` = ingen nye tråde) men **forbliver læsbart** - skjules IKKE. Så arkivér-handlingen sætter `is_locked=true` på model-foraet (og genaktivér låser op igen, medmindre det var manuelt låst før - overvej at huske tidligere lås-tilstand, ellers simpelt: genaktivér = lås op).
  - Rapporten: arkiverede modeller tæller stadig deres historiske bekræftelser med - rør ikke rapport-RPC'erne.
  - Badge/oversigt: vis evt. arkiverede model-fora dæmpet eller i egen sektion.
- **UI:** udvid "Tilføj model"-sektionen til et lille **Modeller-panel**: liste over modeller med brugs-tal ("N biler · N bekræftelser · N tråde") + handling pr. model - **Slet** (hvis tom, med bekræft-trin) / **Arkivér** (hvis i brug) / **Genaktivér** (hvis arkiveret). **BESLUTTET 23-11 (Torben):** arkiverede modeller **vises i dette panel** (så de kan genaktiveres) - fx dæmpet eller i en "Arkiveret"-underdeling. Admin-only, grafit/kobber.
- **Gating:** admin (som P17).
- **Begge åbne beslutninger afklaret 23-11 (Torben):** (a) arkiveret model-forum = **låst men læsbart**, ikke skjult; (b) arkiverede modeller **vises i Modeller-panelet** så de kan genaktiveres. (Torben forventer sjældent/aldrig at arkivere i praksis, men vil have muligheden.)

## Backlog-note: Tilføj model i Værkstedet (P17) - brief til frisk session
> **BYGGET 23-11-2026 - se "## Tilføj model i Værkstedet (P17)" ovenfor.** Noten herunder er det oprindelige oplæg (historik).

Mål: en "Tilføj model"-knap i Værkstedet der opretter en ny Zeekr-model + dens forum-forum i ét hug, uden Studio. Baggrund: `/admin/forum`-kategori-editoren (P7) kan nu alt for de tematiske grupper, men Modellerne er med vilje spærret for almindelige kategorier, fordi et model-forum SKAL kobles til en `models`-række (badge, Min Garage-bil, "mig med"-bekræftelser, Zeekr-rapport). Det er den eneste tilbageværende SQL-only pligt på model-siden.

- **Hvad skal oprettes (atomisk):**
  1. `models`-række: `slug` (unik), `name`, `platform` (fri tekst: SEA-R / PMA2+ / SEA1/SEA2), `display_order` (max+1).
  2. `forum_categories`-række: `slug` = model-slug, `name`, `description` ("Alt om <navn> - snak, spørgsmål og erfaringer."), `icon` '🚗' (ignoreres i rendering, men holdes), `group_label` = model-gruppens label, `group_order` = model-gruppens order, `display_order` = max+1 i Modellerne, `model_id` = den nye model.
  3. (Valgfrit i samme flow) `variants`: 0..n varianter (`name`, `display_order`).
- **Migration nødvendig (giv Torben SQL'en direkte - svar + fil - til Studio port 8002; han har ikke repoet lokalt):** `models` har i dag KUN `models_read_all`, og `variants` ligeså (ingen insert/update-policy). `forum_categories` har allerede moderator-insert. **Anbefalet mønster: én security-definer RPC** (`er_admin()`-gated) der opretter alle rækker i én transaktion (undgår delvist-oprettet model + tre separate RLS-policies). Alternativt admin-insert-policies på models+variants.
- **Verificér bagefter:** at en model med 0 varianter ikke brækker `ConfirmButton`/`getVarianter()`/garage/rapport (to-trins-flow springer variant-valg over ved <2 varianter). Og at det nye model-forum får model-badge (ikke 💬) og IKKE en flyt-dropdown (dvs. `model_id` sat korrekt).
- **Gating:** admin (ikke bare moderator), da det er struktur på rygraden.
- **Senere (ikke i P17):** rediger platform/varianter, slet/arkivér en model (cascade-værn mod model-forum med tråde).

## Model-badge på forum-ikoner (22-11-2026)
De generiske røde bil-emoji (🚗) på model-foraene er erstattet af et **typografisk model-badge** - modellens betegnelse (9X, 001, 001S, X, 7X, 7GT) i en lys grafit-100-chip (samme som emoji-kategorierne) med kobber-700-tekst (Archivo, tabular, tight). (Først prøvet grafit-900/kobber-300 = for sort/tungt på hvid liste, rettet til lys variant.) Ligner et trim-/datablad-mærke: differentierer hver model uden farve. Fravalgt: seks forskellige farver pr. model (ville blive "farvelade" og undergrave det rene/premium look - afklaret med Torben). Topiske kategorier (ikke-model) beholder deres emoji.
- `lib/model-badge.ts`: ren `modelBadge(slug)` - fjerner `zeekr-`-præfiks, hvert ord efter det første → forbogstav (`zeekr-001-sport` → `001S`). Nye modeller følger automatisk med.
- Brugt i: `components/forum/ForumOversigt.tsx` (oversigts-rækker, `modelId != null`), `app/forum/[kategori]/page.tsx` (kategori-header), `app/forum/[kategori]/[traad]/page.tsx` (breadcrumb - lille badge). `getTraad` embedder nu `model_id`; `ForumTraadDetalje.kategori` fik `modelId`.
- DB uændret: `forum_categories.icon` beholder stadig '🚗' for model-fora, men feltet ignoreres nu i rendering af model-rækker. Ingen migration.
- `npx tsc --noEmit` grønt. Deployet via n8n-poller.
- **Delt komponent + badge-match i Værkstedet + flyde-ud-fix (23-11, efter P17-test):** badge-markuppen var kopieret ind flere steder som en FAST firkant (`w-10`/`w-12`), så en betegnelse over ~4 tegn (fx "MODEL7" fra testmodellen "Model 78", eller en lang model-betegnelse) flød ud af den grå boks. Samlet i én delt `components/forum/ModelBadge.tsx` (`size` sm/md/lg): boksen vokser nu i BREDDEN efter indholdet (`min-w` = højden → korte er kvadratiske, lange bliver en afrundet rektangel) og skriften skrumper ved længere betegnelser, så intet flyder ud. Brugt i `ForumOversigt` (md) + kategori-header (lg). **Værkstedet (`components/admin/KategoriStyring.tsx`) viste stadig det rå ikon-felt 🚗 for model-fora - nu viser den samme model-badge (sm)** som forummet, så de matcher. (Breadcrumb-badgen var allerede fleksibel/inline og urørt.) Ingen migration/DB-ændring; `tsc` + `build` grønt.

## Feedback-kategorier: 9 faste spande (22-11-2026)
`issues.category` var et frit tekstfelt (alle skrev deres eget → ubrugeligt til filter). Nu en **fast liste af 9 spande** (`ISSUE_CATEGORIES` i `lib/config.ts`, lagret som slug): Kørehjælp & ADAS · Kørsel, bremser & understel · Opladning & rækkevidde · Skærm, stemme & infotainment · App, lås & forbindelse · Lys, ruder & udsyn · Klima, sæder & kabine · Hjul, dæk & TPMS · Andet. Udledt af meldingerne + Zeekr-manualens 22 afsnit komprimeret til ejer-venlige spande.
- **Oprettelse** (`components/MeldForm.tsx`): fri-tekst-feltet er nu en **krævet** dropdown (gemmer slug). "Andet" er sikker udvej, så kravet koster intet. Feltet vises for både fejl og ønsker (ikke gated på type). Gælder kun nye meldinger - de ~31 gamle mærkes op i Værkstedet.
- **Board-filter** (`components/FejlBoard.tsx`): "Alle kategorier"-dropdown ved siden af søgefeltet. **Standard = Alle**, så intet skjules.
- **Kuratering** (`components/admin/ModereringsTabel.tsx`): kategori-dropdown pr. række i Værkstedet + action `saetKategori` (moderator, validerer slug, revaliderer /admin + / + /feedback). Det er her de ~31 eksisterende mærkes op.
- **Ingen migration, ingen databrud:** kolonnen var allerede tekst; `category` vises ingen steder som label (kun brugt i søgning), så gamle fri-tekst-værdier bevares urørt og dukker bare op under "Alle" indtil de re-mærkes. `kategoriLabel()`-helper falder tilbage til rå værdi hvis en slug ikke kendes.
- `tsc` + build grønt.
- **Næste (aftalt retning):** samme 9 spande genbruges som emne-mærker på forummet (tag + filter, ikke nestede rum) - men først når forummet har tråde. Kategori-chip på board-rækkerne **gjort** (se "Gjort 22-11"); rapport grupperet efter spand **gjort 22-11** (se "## Zeekr-rapport: gruppering efter kategori-spand (P1)").

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
