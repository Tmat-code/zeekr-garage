'use client';

import { useState, type ReactNode } from 'react';

// Statisk, rollestyret manual til Værkstedet. Skrevet ud fra den faktiske
// admin-kode (app/admin/* + components/admin/* + lib/admin.ts), så den
// beskriver fladerne som de rent faktisk virker - ikke et gæt. Holdes i sync
// med features: retter du en flade, så ret den tilhørende sektion her.
//
// Indholdet er den samme ManualIndhold-komponent styret af en enkelt "admin"-
// prop: admin=false er PRÆCIS det en moderator ser. Derfor kan en admin slå
// moderator-manualen op (admin=false) til onboarding og se nøjagtig det samme.

// --- Små præsentations-byggeklodser ---

function Kort({
  ikon,
  titel,
  kunAdmin,
  kunSuperadmin,
  children,
}: {
  ikon: string;
  titel: string;
  kunAdmin?: boolean;
  kunSuperadmin?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-grafit-200 bg-white p-5 sm:p-6">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span aria-hidden className="text-lg">
          {ikon}
        </span>
        <h3 className="text-lg font-semibold text-grafit-900">{titel}</h3>
        {kunSuperadmin && <span className="chip bg-grafit-900 text-white">kun dig (superadmin)</span>}
        {kunAdmin && <span className="chip bg-kobber-100 text-kobber-800">kun admin</span>}
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-grafit-700">{children}</div>
    </section>
  );
}

// Overskrift til en gruppe handlinger.
function Afsnit({ titel }: { titel: string }) {
  return (
    <h4 className="mt-1 text-xs font-semibold uppercase tracking-wide text-grafit-400">{titel}</h4>
  );
}

function Liste({ children }: { children: ReactNode }) {
  return <ul className="space-y-1.5 pl-5 [list-style:disc] marker:text-kobber-500">{children}</ul>;
}

function Punkt({ navn, children }: { navn?: string; children: ReactNode }) {
  return (
    <li>
      {navn && <span className="font-medium text-grafit-900">{navn}: </span>}
      {children}
    </li>
  );
}

// Inline "kun admin"-handling - vises kun i admin-visningen.
function AdminPunkt({ navn, children }: { navn?: string; children: ReactNode }) {
  return (
    <li>
      {navn && <span className="font-medium text-grafit-900">{navn} </span>}
      <span className="mr-1 align-middle text-[11px] font-semibold uppercase tracking-wide text-kobber-700">
        [kun admin]
      </span>
      {children}
    </li>
  );
}

// Scenarie-liste: fra "det sker" til "hvor + hvad".
function SituationListe({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y divide-grafit-100 overflow-hidden rounded-xl border border-grafit-200">
      {children}
    </ul>
  );
}

function Situation({ naar, children }: { naar: string; children: ReactNode }) {
  return (
    <li className="px-3 py-2.5">
      <p className="font-medium text-grafit-900">{naar}</p>
      <p className="mt-0.5 text-grafit-700">{children}</p>
    </li>
  );
}

// --- Selve manualen. admin=false er moderator-visningen. ---

function ManualIndhold({ admin, superadmin }: { admin: boolean; superadmin: boolean }) {
  return (
    <div className="space-y-5">
      {/* Hvad er Zeekr Garage */}
      <Kort ikon="🚗" titel="Hvad er Zeekr Garage">
        <p>
          Zeekr Garage er et uafhængigt, uofficielt community for Zeekr-ejere i Norden. Sitet har to
          halvdele: <span className="font-medium text-grafit-900">feedback-boardet</span>, hvor
          ejere melder fejl og ønsker ind, og andre trykker &quot;mig med&quot; for at lægge en
          stemme på (en <em>melding</em>), og <span className="font-medium text-grafit-900">forummet</span>
          , hvor man snakker (tråde og svar).
        </p>
        <p>
          Pointen med det hele: de bedste, mest bekræftede meldinger samles i en{' '}
          <span className="font-medium text-grafit-900">rapport til Zeekr</span> - professionel,
          struktureret ejer-feedback. Jo renere og mere civilt board og forum, jo stærkere står den
          rapport. Det er dét, moderering tjener - ikke at patruljere, men at holde signalet skarpt.
        </p>
        <p>
          <span className="font-medium text-grafit-900">Værkstedet</span> (her) er bagscenen, hvor
          det arbejde foregår.
        </p>
        <Liste>
          <Punkt navn="Hvor forum-rapporterne kommer fra">
            Brugerne trykker ⚑ ude på selve forummet; det markerede indhold lander i rapport-køen
            øverst på Forum-fanen. (Forveksl ikke de to slags &quot;rapport&quot;: en{' '}
            <em>forum-rapport</em> er en anmeldelse fra en bruger - <em>rapporten til Zeekr</em> er
            den samlede feedback, du sender videre.)
          </Punkt>
        </Liste>
      </Kort>

      {/* Sådan hænger det sammen */}
      <Kort ikon="🧭" titel="Sådan hænger Værkstedet sammen">
        {admin ? (
          <>
            <p>
              Værkstedet er bagscenen til Zeekr Garage - her modererer vi forummet og feedback-
              meldingerne, kuraterer links og OTA-historik, samler rapporten til Zeekr og holder
              styr på brugerne.
            </p>
            <p>
              Der er to roller.{' '}
              <span className="font-medium text-grafit-900">Moderator</span> klarer det daglige:
              rapporter, tråde og indlæg, anmeldte beskeder, feedback-meldinger og advarsler/
              suspensioner.{' '}
              <span className="font-medium text-grafit-900">Admin</span> kan alt det samme
              plus strukturen bagved: links, OTA, modeller, den officielle Zeekr-rapport,
              oprydning og forside-beskeden - derfor ser du alt herunder. Hvem der er moderator
              eller admin styres af superadmin.
            </p>
          </>
        ) : (
          <>
            <p>
              Værkstedet er bagscenen til Zeekr Garage - her holder vi forummet og feedback-
              meldingerne civile og brugbare, så den feedback, ejerne giver, bliver til en stærk
              rapport til Zeekr.
            </p>
            <p>
              Som moderator håndterer du det daglige: forum-rapporter, tråde og indlæg, anmeldte
              beskeder, feedback-meldinger og advarsler/suspensioner. Denne manual dækker det hele.
            </p>
          </>
        )}
        {superadmin && (
          <p>
            Som <span className="font-medium text-grafit-900">superadmin</span> (dig alene) styrer du
            desuden hvem der er moderator eller admin (rolle-styringen i Adgange er kun din), og du
            har <span className="font-medium text-grafit-900">Audit</span>-fanen: et fuldt spor over
            hvad stab har ændret, med mulighed for at fortryde en sikker delmængde.
          </p>
        )}
        <Liste>
          <Punkt navn="Navigation">
            Fane-rækken øverst følger fladerne:{' '}
            {superadmin
              ? 'Overblik, Feedback, Forum, Links, OTA, Anmeldelser, Rapport, Aktivitet, Adgange, Audit'
              : admin
                ? 'Overblik, Feedback, Forum, Links, OTA, Anmeldelser, Rapport, Aktivitet, Adgange'
                : 'Overblik, Feedback, Forum, Anmeldelser, Rapport, Aktivitet, Adgange'}
            . Forum-fanen får et lille kobber-tal, når der er åbne rapporter.
          </Punkt>
          <Punkt navn="Grundregel">
            Hver handling, der rammer en bruger - fjern med grund, advarsel, suspension - sender
            personen en officiel besked med grunden og lander i moderations-loggen. Ingen stumme
            fjernelser.
          </Punkt>
          <Punkt navn="Grunde">
            De faste grunde er Dublet, Tone / personangreb, Off-topic, Spam og Andet. Du kan altid
            uddybe i fritekst-feltet.
          </Punkt>
        </Liste>
      </Kort>

      {/* Typiske situationer */}
      <Kort ikon="🧰" titel="Typiske situationer - sådan gør du">
        <p>
          Fra &quot;det sker&quot; til &quot;hvor + hvad&quot;. Mangler du detaljerne, står de under
          den enkelte flade længere nede.
        </p>
        <SituationListe>
          <Situation naar="Et indlæg eller en tråd er grimt eller et personangreb">
            Er det allerede anmeldt: Forum-fanen → rapport-køen øverst → 🗑 Fjern med grund (eller 🛡
            Advar forfatteren). Ellers: Forum-moderering → søg tråden/indlægget frem → 🗑 Fjern med
            grund. Forfatteren får automatisk en besked.
          </Situation>
          <Situation naar="En bruger spammer eller bliver ved">
            Adgange → find brugeren → 🛡 Advar først; fortsætter det, ⏸ Suspendér (vælg antal dage).
          </Situation>
          <Situation naar="To tråde om samme fejl (dublet)">
            Forum-moderering → Fjern den ene med grund = Dublet, og skriv linket til originalen i
            uddyb-feltet.
          </Situation>
          <Situation naar="En privat besked er anmeldt">
            Anmeldelser-fanen → læs den → ✓ Markér håndteret, eller 🗑 Slet besked hvis den bryder
            reglerne.
          </Situation>
          <Situation naar="En melding er klassificeret forkert eller skal strammes op">
            Feedback-fanen → ret Status/Alvor/Kategori på rækken, eller ✏️ Redigér titel og
            beskrivelse under ⋯-menuen.
          </Situation>
          <Situation naar="Zeekr har rettet en fejl i en opdatering">
            Feedback-fanen → find meldingen → ✅ Markér løst → Løst i OTA.
          </Situation>
          {admin && (
            <>
              <Situation naar="Du skal sende rapporten til Zeekr">
                Rapport-fanen → vælg udsnit (antal, indhold, sprog) → Forhåndsvis først → 📮 Dan
                Zeekr-rapport (markerer udsnittet som sendt).
              </Situation>
              <Situation naar="Der er kommet en ny OTA/software-opdatering">
                OTA-fanen → vælg model(ler), version + dato, og indsæt changeloggen (én linje bliver
                ét punkt).
              </Situation>
              <Situation naar="Et nyt link skal på links-siden">
                Links-fanen → opret linket i den rigtige gruppe (evt. med model-tag).
              </Situation>
              <Situation naar="En ny Zeekr-model skal oprettes">
                Forum-fanen → Tilføj model - den får automatisk sit eget forum under Modellerne.
              </Situation>
              <Situation naar="En bruger skal fjernes helt">
                Adgange → 👤 Anonymisér (rydder persondata, men beholder biler og bekræftelser - det
                er QA-signalet). Der er bevidst ingen hard-delete.
              </Situation>
            </>
          )}
          {superadmin && (
            <>
              <Situation naar="En ny moderator eller admin skal have adgang">
                Adgange → Giv adgang (email + rolle), eller Søg brugere → sæt rollen direkte. Kun du
                som superadmin kan det.
              </Situation>
              <Situation naar="Du vil se hvad en moderator eller admin har ændret - eller fortryde det">
                Audit → Pr. person → vælg personen → se deres spor. Felt-ændringer kan rulles tilbage
                med ↩ Fortryd (så længe rækken er urørt siden).
              </Situation>
            </>
          )}
        </SituationListe>
      </Kort>

      {/* Overblik */}
      <Kort ikon="📊" titel="Overblik (forsiden)">
        <p>
          Landingssiden i Værkstedet. Tal-tiles for Feedback (meldinger, bekræftelser, åbne, løst i
          OTA) og Forum (kategorier, tråde, indlæg), plus et genvejs-gitter til alle fladerne. Rent
          overblik - du handler ikke her.
        </p>
        {admin && (
          <>
            <Afsnit titel="Forside-besked" />
            <Liste>
              <AdminPunkt navn="Forside-besked">
                Nederst kan du skrive en besked øverst på det offentlige site (fx &quot;nu sendt en
                rapport til Zeekr&quot;). Skriv teksten, og tryk <em>Tænd</em> for at vise den eller{' '}
                <em>Sluk</em> for at skjule den igen. <em>Gem ændringer</em> gemmer teksten uden at
                ændre tænd/sluk.
              </AdminPunkt>
            </Liste>
          </>
        )}
      </Kort>

      {/* Feedback */}
      <Kort ikon="🗒️" titel="Feedback - meldinger">
        <p>
          Alle ejernes meldinger, sorteret med flest stemmer øverst. Hver række viser stemmetal,
          titel, type (fejl eller ønske), model og evt. software-version, og et link til
          kommentarerne, hvis der er nogen.
        </p>
        <Afsnit titel="Sådan gør du" />
        <Liste>
          <Punkt navn="Klassificér">
            De tre dropdowns sætter Status, Alvor og Kategori. Det gemmer med det samme.
          </Punkt>
          <Punkt navn="Markér løst">
            Tryk <em>✅ Markér løst</em> og vælg enten <em>Løst i OTA</em> (Zeekr har rettet det i
            en opdatering) eller <em>💬 Afklaret</em> (afsluttet uden et OTA-fix, fx en misforstået
            melding).
          </Punkt>
          <Punkt navn="Redigér">
            Under ⋯-menuen: ret titel og beskrivelse (fx stramme en melding op før rapporten).
          </Punkt>
          <Punkt navn="Slet">
            Under ⋯-menuen, med en bekræftelse. Sletningen er uoprettelig og fjerner også meldingens
            billeder.
          </Punkt>
        </Liste>
        <p className="text-grafit-500">
          Fanen viser også &quot;Seneste feedback-aktivitet&quot; (nye meldinger og bekræftelser).
        </p>
        {admin && (
          <>
            <Afsnit titel="Oprydning (nederst på fanen)" />
            <Liste>
              <AdminPunkt navn="Oprydning - stemmer">
                Fjern &quot;mig med&quot;-stemmer fra før en dato, fx test-klik fra før lanceringen.
                Vælg dato, tryk <em>Vis antal</em>, og tryk så <em>Fjern N stemmer</em>. Kan ikke
                fortrydes.
              </AdminPunkt>
              <AdminPunkt navn="Forældreløse billed-filer">
                Rydder billed-filer uden reference (fortrudte uploads, rester fra slettede
                meldinger) i forum-, meld-, avatar- og besked-bucketen. Filer under et døgn gamle
                spares. Tryk <em>Vis antal</em>, så <em>Ryd N filer</em>. Kan ikke fortrydes.
              </AdminPunkt>
            </Liste>
          </>
        )}
      </Kort>

      {/* Forum */}
      <Kort ikon="💬" titel="Forum - rapport-køen">
        <p>
          Øverst på Forum-fanen: indhold som brugere (eller senere AI) har markeret. Hvert kort
          viser om det er en tråd eller et indlæg, grunden, hvem der rapporterede, forfatteren og et
          uddrag.
        </p>
        <Afsnit titel="Tre valg pr. rapport" />
        <Liste>
          <Punkt navn="🗑 Fjern tråd/indlæg">
            Vælg en grund (forvalgt til rapportens egen) + evt. uddyb, og tryk{' '}
            <em>Fjern + giv besked</em>. Fjerner indholdet, giver forfatteren besked og markerer
            rapporten håndteret i ét hug.
          </Punkt>
          <Punkt navn="🛡 Advar forfatter">
            Grund + uddyb + <em>Send advarsel</em>. Sender en officiel besked uden at fjerne
            indholdet.
          </Punkt>
          <Punkt navn="Afvis rapport">
            Lukker rapporten uden handling - fx hvis den er grundløs.
          </Punkt>
        </Liste>
        <p className="text-grafit-500">
          En handling henter køen forfra, så det håndterede punkt falder ud. &quot;Vis flere&quot;
          henter næste side.
        </p>
      </Kort>

      <Kort ikon="💬" titel="Forum - moderering af tråde og indlæg">
        <p>
          To kolonner - Tråde og Indlæg. Søg i titel eller forfatter, eller slå{' '}
          <em>⚑ Kræver opmærksomhed</em> til (tråde/indlæg med en åben rapport, eller skrevet af en
          bruger der er spærret lige nu). &quot;Vis flere&quot; henter næste 25. Handlingerne slår
          igennem på forummet med det samme.
        </p>
        <Afsnit titel="Tråde" />
        <Liste>
          <Punkt navn="📌 Fastgør / Fjern fastgør.">
            Sætter tråden øverst i sin kategori. 📌 ved titlen = allerede fastgjort.
          </Punkt>
          <Punkt navn="🔒 Lås / Lås op">
            Låser for nye svar. 🔒 ved titlen = allerede låst.
          </Punkt>
          <Punkt navn="🗑 Fjern tråd">Med grund + besked til forfatteren.</Punkt>
        </Liste>
        <Afsnit titel="Indlæg" />
        <Liste>
          <Punkt navn="🗑 Fjern">
            Med grund + besked. Åbnings-indlægget kan ikke fjernes for sig - brug &quot;Fjern
            tråd&quot; i tråd-kolonnen.
          </Punkt>
        </Liste>
        <p className="text-grafit-500">
          Forum-fanen har også &quot;Seneste forum-aktivitet&quot; (nye tråde og svar) - et rent
          overblik, ingen handlinger.
        </p>
      </Kort>

      <Kort ikon="🗂️" titel="Forum - kategorier">
        <p>
          Opret, omdøb, flyt mellem grupper, sortér og lås kategorier - direkte her, uden at gå i
          databasen.
        </p>
        <Liste>
          <Punkt navn="Ny kategori">
            &quot;+ Ny kategori&quot; under en gruppe lægger den i netop den gruppe.
          </Punkt>
          <Punkt navn="Ny gruppe">&quot;+ Ny gruppe&quot; nederst laver en helt ny spand.</Punkt>
          <Punkt navn="Sortér + flyt">
            Pilene omsorterer kategorien i gruppen; dropdown&apos;en flytter den til en anden
            gruppe; pilene ved gruppe-overskriften omsorterer selve grupperne.
          </Punkt>
          <Punkt navn="Lås">
            En låst kategori kan kun moderatorer starte tråde i (fx en opslagstavle).
          </Punkt>
          <Punkt navn="Slet">Kun muligt når kategorien er tom - flyt eller fjern trådene først.</Punkt>
          <Punkt navn="Model-fora">
            Fora under Modellerne er fast koblet til en bil-model. De kan ikke flyttes, og
            Modellerne kan ikke få almindelige kategorier.
          </Punkt>
        </Liste>
      </Kort>

      <Kort ikon="📜" titel="Forum - regler">
        <p>
          De fælles spilleregler for forummet. Rediger teksten og gem - så slår den igennem på{' '}
          <span className="font-mono text-grafit-600">/forum/regler</span> med det samme.
        </p>
      </Kort>

      {/* Links - admin */}
      {admin && (
        <Kort ikon="🔗" titel="Links" kunAdmin>
          <p>
            Kuratér den offentlige links-side (<span className="font-mono text-grafit-600">/links</span>
            ) uden at gå i databasen.
          </p>
          <Liste>
            <Punkt navn="Opret / omdøb / slet">Links og grupper styres direkte på fanen.</Punkt>
            <Punkt navn="Sortér + flyt">
              Pilene omsorterer i gruppen; dropdown&apos;en flytter et link til en anden gruppe;
              pilene ved gruppe-overskriften omsorterer grupperne.
            </Punkt>
            <Punkt navn="Model-tag">
              Et link kan tagges med en model; links uden model gælder alle. Model-filteret på
              links-siden dukker op af sig selv, når mindst to modeller har links.
            </Punkt>
          </Liste>
        </Kort>
      )}

      {/* OTA - admin */}
      {admin && (
        <Kort ikon="📦" titel="OTA-historik" kunAdmin>
          <p>
            Den strukturerede software-/OTA-log pr. model (adskilt fra snakken i forummet). Vises
            offentligt på <span className="font-mono text-grafit-600">/software</span>.
          </p>
          <Afsnit titel="Log en opdatering" />
          <Liste>
            <AdminPunkt navn="Vælg model(ler)">
              Samme opdatering kan dække flere modeller på én gang (mindst én kræves).
            </AdminPunkt>
            <AdminPunkt navn="Version + dato">
              Skriv versionen (fx Zeekr OS 3.0.4); datoen er forudfyldt til i dag.
            </AdminPunkt>
            <AdminPunkt navn="Changelog">
              Indsæt changeloggen som ren tekst - én linje bliver ét punkt, med live-preview mens du
              skriver. En valgfri note kan komme oveni.
            </AdminPunkt>
            <AdminPunkt navn="Ret / slet">Hvert opslag kan rettes eller slettes fra listen.</AdminPunkt>
          </Liste>
          <p className="text-grafit-500">
            Et nyt opslag sender en klokke-notifikation til ejere af de ramte modeller (ikke alle).
          </p>
        </Kort>
      )}

      {/* Anmeldelser */}
      <Kort ikon="🚩" titel="Anmeldelser - private beskeder">
        <p>
          Beskeder som nogen har anmeldt - du ser kun det anmeldte, ikke de øvrige samtaler. Hvert
          kort viser anmelderen, begrundelsen og selve beskeden.
        </p>
        <Liste>
          <Punkt navn="Åbn samtale">Hopper til samtalen, hvis du har brug for konteksten.</Punkt>
          <Punkt navn="✓ Markér håndteret">
            Lukker anmeldelsen (kan sættes tilbage til &quot;ny&quot; igen).
          </Punkt>
          <Punkt navn="🗑 Slet besked">
            Fjerner den anmeldte besked, med en bekræftelse. Anmeldelsen bliver stående som
            historik.
          </Punkt>
          <Punkt navn="Vis alle / kun nye">Skifter mellem alle anmeldelser og kun de ubehandlede.</Punkt>
        </Liste>
      </Kort>

      {/* Rapport */}
      <Kort ikon="📮" titel="Rapport til Zeekr">
        <p>
          Her samles ejernes meldinger til den rapport, der er hele pointen med sitet. Øverst ser du
          &quot;Siden sidste rapport&quot; (hvor meget nyt der er kommet) og nederst en log over,
          hvem der har downloadet rapporter.
        </p>
        <Afsnit titel="Forhåndsvisning" />
        <Liste>
          <Punkt navn="Vælg udsnit">
            Antal (top 20/50/100/alle), indhold (fejl, ønsker eller begge), og sprog (dansk,
            engelsk, svensk).
          </Punkt>
          <Punkt navn="Til/fra">
            <em>Inkludér kommentarer</em> (uden den markerede løsning - Zeekr skal have fejlen, ikke
            workaround&apos;en) og <em>Kun nye + eskalerende</em>.
          </Punkt>
          <Punkt navn="Forhåndsvis PDF / CSV">
            Henter rapporten uden at ændre noget. Den må du gerne bruge frit.
          </Punkt>
          <Punkt navn="🔍 Test oversættelse">
            Tjekker at oversættelsen til engelsk/svensk virker (LibreTranslate). Er den ikke
            konfigureret, er rapporterne kun på dansk.
          </Punkt>
        </Liste>
        {admin ? (
          <>
            <Afsnit titel="Officiel rapport" />
            <Liste>
              <AdminPunkt navn="📮 Dan Zeekr-rapport">
                Markerer hele det valgte udsnit som sendt til Zeekr (med en bekræftelse). Gør det
                kun, når du faktisk sender rapporten nu. <em>↩︎ Fortryd sidste</em> ruller den sidste
                markering tilbage.
              </AdminPunkt>
            </Liste>
          </>
        ) : null}
      </Kort>

      {/* Aktivitet */}
      <Kort ikon="📈" titel="Aktivitet">
        <p>
          Vækst og engagement: unikke aktive brugere pr. dag (stemte, meldte, skrev i forummet eller
          sendte en besked) og nye brugere pr. dag, de sidste 30 dage. En deploy-timing-note peger
          på de roligste timer. Rent overblik - ingen handlinger.
        </p>
      </Kort>

      {/* Adgange */}
      <Kort ikon="👥" titel="Adgange - brugere og sanktioner">
        <p>
          Overblik over alle oprettede brugere. Søg på navn eller email, filtrér på rolle og status
          (aktiv, suspenderet, bannet), og sortér. Hver handling giver brugeren en officiel besked
          med grunden og lander i loggen. Du kan ikke sanktionere din egen konto, en admin eller
          superadmin.
        </p>
        <Afsnit titel="Handlinger pr. bruger" />
        <Liste>
          <Punkt navn="🛡 Advar">En officiel advarsel med grund, uden at spærre noget.</Punkt>
          <Punkt navn="⏸ Suspendér">
            Midlertidig skrive-spærre - vælg varighed (1 til 90 dage) + grund. Brugeren kan stadig
            læse.
          </Punkt>
          {admin ? (
            <>
              <AdminPunkt navn="⛔ Ban">
                Permanent skrive-spærre (kan ophæves igen). Brugeren kan læse, men ikke bidrage.
              </AdminPunkt>
              <AdminPunkt navn="✅ Ophæv spærring">Løfter en suspension eller et ban.</AdminPunkt>
              <AdminPunkt navn="👤 Anonymisér">
                Rydder persondata (navn, e-mail, VIN/noter) og spærrer permanent. Biler,
                bekræftelser og forum-indlæg bevares (de er QA-signalet), men bliver forfatterløse.
                Kan ikke fortrydes.
              </AdminPunkt>
            </>
          ) : null}
        </Liste>
        {superadmin ? (
          <>
            <Afsnit titel="Roller og invitationer (kun dig som superadmin)" />
            <Liste>
              <Punkt navn="Giv adgang">
                Inviter på email: har personen allerede en konto, får de rollen (moderator eller
                admin) med det samme; ellers tildeles den automatisk, når de opretter en konto med
                den email.
              </Punkt>
              <Punkt navn="Søg brugere">
                Find en hvilken som helst oprettet bruger på navn/email og sæt rollen direkte fra
                dropdown&apos;en.
              </Punkt>
              <Punkt navn="Personer med adgang">
                Skift rolle eller tryk <em>Fjern adgang</em>. Din egen adgang kan du ikke ændre, og
                superadmin-rollen kan ikke tildeles herfra (den er din alene, sat i databasen).
              </Punkt>
              <Punkt navn="Afventende invitationer">
                Invitationer der venter på, at personen opretter en konto - kan fjernes igen.
              </Punkt>
            </Liste>
          </>
        ) : admin ? (
          <>
            <Afsnit titel="Roller og invitationer" />
            <p className="text-grafit-500">
              At give eller fjerne moderator-/admin-rettigheder er forbeholdt superadmin. Du
              administrerer brugere (advar/suspendér/ban/ophæv/anonymisér), men ikke roller.
            </p>
          </>
        ) : null}
      </Kort>

      {/* Audit - superadmin */}
      {superadmin && (
        <Kort ikon="🕵️" titel="Audit - spor og fortryd" kunSuperadmin>
          <p>
            Et fuldt spor over hvad stab (moderatorer og admins) har ændret på sitet - kun du som
            superadmin kan se denne side. Hver ændring en stab-person laver i en flade logges
            automatisk (hvad, hvornår, før → efter). Almindelige brugeres aktivitet logges ikke.
          </p>
          <Afsnit titel="Sådan bruger du den" />
          <Liste>
            <Punkt navn="👤 Pr. person">
              Vælg en person i listen til venstre og se deres fulde spor. Hver linje viser, hvad der
              blev ændret, med før → efter.
            </Punkt>
            <Punkt navn="🕒 Seneste">
              En samlet strøm på tværs af alle - nyeste øverst - hvis du hellere vil se alt i
              tidsrækkefølge.
            </Punkt>
            <Punkt navn="↩ Fortryd">
              Ruller en ændring tilbage til det, der stod før. Virker kun på felt-ændringer (ikke på
              oprettelse, sletning, anonymisering eller sanktioner), og kun hvis rækken er urørt
              siden - ellers siger den til, så du retter manuelt. En fortrydelse logges selv.
            </Punkt>
          </Liste>
          <p className="text-grafit-500">
            Tanken er oversyn, ikke overvågning: loggen findes, så et brud med en udefrakommende
            admin kan ses og rettes - ikke for at kigge moderatorer over skulderen i det daglige.
          </p>
        </Kort>
      )}

      {/* Modeller - admin */}
      {admin && (
        <Kort ikon="🚗" titel="Modeller" kunAdmin>
          <p>
            Model-administrationen ligger på Forum-fanen (under &quot;Tilføj model&quot;). Den
            styrer hvilke Zeekr-modeller der kan vælges i Min garage, bruges til bekræftelser og
            tælles i rapporten.
          </p>
          <Liste>
            <AdminPunkt navn="Tilføj model">
              Opret en ny model (+ 0..n varianter). Den får automatisk sit eget forum under
              Modellerne og kan straks vælges i Min garage og meld.
            </AdminPunkt>
            <AdminPunkt navn="Arkivér">
              En model i brug kan arkiveres: den forsvinder fra &quot;vælg model&quot;-listerne,
              mens data og rapport bevares. <em>Genaktivér</em> låser op igen.
            </AdminPunkt>
            <AdminPunkt navn="Slet">
              Kun muligt når modellen er helt tom (0 tråde, 0 biler, 0 bekræftelser) - typisk en
              fejloprettet testmodel. Ellers arkivér i stedet.
            </AdminPunkt>
          </Liste>
        </Kort>
      )}

    </div>
  );
}

export default function ManualVisning({
  erAdmin,
  erSuperadmin = false,
}: {
  erAdmin: boolean;
  erSuperadmin?: boolean;
}) {
  // Admin/superadmin lander på admin-manualen; ét klik til moderator-manualen
  // (onboarding). Superadmin-laget (Audit + rolle-styring) følger admin-visningen,
  // så et skift til moderator-manualen viser præcis det, en moderator ser.
  const [visAdmin, setVisAdmin] = useState(erAdmin);
  const visSuperadmin = erSuperadmin && visAdmin;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-grafit-900">📖 Manual</h2>
        <p className="mt-0.5 text-sm text-grafit-500">
          Opslagsværk til hvordan Værkstedet virker - flade for flade.
        </p>
      </div>

      {erAdmin && (
        <div>
          <div className="inline-flex overflow-hidden rounded-lg border border-grafit-300">
            <button
              type="button"
              onClick={() => setVisAdmin(true)}
              aria-pressed={visAdmin}
              className={`px-4 py-2 text-sm font-medium ${
                visAdmin
                  ? 'bg-kobber-50 text-kobber-800'
                  : 'bg-white text-grafit-600 hover:bg-grafit-50'
              }`}
            >
              Admin-manual
            </button>
            <button
              type="button"
              onClick={() => setVisAdmin(false)}
              aria-pressed={!visAdmin}
              className={`border-l border-grafit-300 px-4 py-2 text-sm font-medium ${
                visAdmin
                  ? 'bg-white text-grafit-600 hover:bg-grafit-50'
                  : 'bg-kobber-50 text-kobber-800'
              }`}
            >
              Moderator-manual
            </button>
          </div>
          <p className="mt-2 text-xs text-grafit-400">
            {visAdmin
              ? 'Du ser admin-manualen - alt i Værkstedet.'
              : 'Du ser moderator-manualen - præcis det, en moderator ser. God til onboarding.'}
          </p>
        </div>
      )}

      <ManualIndhold admin={visAdmin} superadmin={visSuperadmin} />
    </div>
  );
}
