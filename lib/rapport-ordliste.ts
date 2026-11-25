// Term-beskyttelse + kilde-rensning omkring maskinoversættelsen af RAPPORTENS
// fritekst (trin 1 i nordisk i18n-planen). Motor-AGNOSTISK: lagret som et rent,
// dependency-frit lag der kører FØR + EFTER et vilkårligt da->en-kald (i dag
// LibreTranslate, senere NLLB/LLM). Forbedrer kun den engelske udgave; den danske
// ORIGINAL er altid record og røres aldrig.
//
// Baggrund: LibreTranslate laver meningsfejl på rapportens fagsprog - fx
// "modkørende" -> "On-board", "vognbaneskift" -> "runway change",
// "lade-punkt" -> "let-point". En bug-rapport gentager det samme fagsprog, så en
// kontrolleret ordliste fanger langt de fleste fejl.
//
// Sådan virker det:
//  1) rensKilde()      - normaliserer whitespace/sætningsgrænser FØR oversættelse
//                        (MT-modeller læner sig hårdt på sætningsgrænser).
//  2) beskytTermer()   - piler kendte termer ud af den danske kilde og sætter en
//                        placeholder-token ([[0]], [[1]], ...) i stedet, FØR
//                        oversættelse. Tokens er valgt så de overlever MT.
//  3) genindsaetTermer() - sætter den rigtige engelske term ind EFTER oversættelse.
//
// Redigér ORDLISTE/BEVAR nedenfor for at tilføje termer. (Redigering i Værkstedet
// = separat senere opgave.)

// --- Datatyper ---------------------------------------------------------------

// Én oversættelses-regel: danske overfladeformer (inkl. bøjninger) -> fast engelsk
// term. Matches uafhængigt af store/små bogstaver; engelsk indsættes ordret (dog
// stort forbogstav ved sætningsstart).
type TermRegel = { da: readonly string[]; en: string };

// En "bevar urørt"-regel: tekst der skal overleve oversættelsen UÆNDRET
// (akronymer, modelnavne, reference-numre, versioner). 'ord' matches
// case-sensitivt (akronymer er versaler i kilden, undgår at ramme fx danske "os").
type BevarRegel = { ord?: string; soeg?: RegExp };

// --- Ordlisten (da -> en) ----------------------------------------------------
// Seedet fra fejlene i 25-11-rapporten (modkørende, vognbaneskift, lade-punkt) +
// oplagte ADAS-/kørsels-/lade-fagtermer. Tilføj frit; længste match vinder, så en
// flerords-term (fx "adaptiv fartpilot") slår den korte ("fartpilot").
export const ORDLISTE: readonly TermRegel[] = [
  // ADAS / kørehjælp
  { da: ['adaptiv fartpilot'], en: 'adaptive cruise control' },
  { da: ['fartpilot', 'fartpiloten'], en: 'cruise control' },
  { da: ['vognbaneskift', 'vognbaneskifte', 'banenskift', 'vognbane-skift'], en: 'lane change' },
  { da: ['vognbanen', 'vognbane', 'kørebane', 'kørebanen'], en: 'lane' },
  { da: ['vognbaneassistent', 'vognbaneassistenten', 'banehjælp'], en: 'lane assist' },
  { da: ['nødbremsning', 'automatisk nødbremsning', 'automatisk nødbremse'], en: 'automatic emergency braking' },
  { da: ['nødbremse', 'nødbremsen'], en: 'emergency brake' },
  { da: ['kørehjælp', 'kørehjælpen', 'førerstøtte'], en: 'driver assistance' },
  { da: ['afstandsføler', 'afstandssensor', 'afstandssensoren'], en: 'distance sensor' },
  { da: ['parkeringssensor', 'parkeringssensoren', 'parkeringssensorer'], en: 'parking sensor' },
  { da: ['bakkamera', 'bakkameraet', 'bakkameraets'], en: 'reversing camera' },
  { da: ['dødvinkel', 'dødvinklen', 'blindvinkel'], en: 'blind spot' },
  { da: ['trafikskiltegenkendelse', 'skiltegenkendelse'], en: 'traffic sign recognition' },

  // Modkørende / lys / udsyn (25-11: "modkørende" -> "On-board", "fjernlys")
  { da: ['modkørende', 'modkørendes'], en: 'oncoming traffic' },
  { da: ['fjernlys', 'fjernlyset'], en: 'high beam' },
  { da: ['nærlys', 'nærlyset'], en: 'low beam' },
  { da: ['automatisk fjernlys', 'automatiske fjernlys'], en: 'automatic high beam' },
  { da: ['blinklys', 'blinklyset', 'blinklysene'], en: 'turn signal' },
  { da: ['tågelys', 'tågelyset', 'tågeforlygte'], en: 'fog light' },
  { da: ['forlygte', 'forlygten', 'forlygter', 'forlygterne'], en: 'headlight' },
  { da: ['baglygte', 'baglygten', 'baglygter'], en: 'tail light' },
  { da: ['kørelys', 'kørelyset'], en: 'daytime running light' },
  { da: ['forrude', 'forruden'], en: 'windscreen' },
  { da: ['bagrude', 'bagruden'], en: 'rear window' },
  { da: ['sidespejl', 'sidespejlet', 'sidespejle'], en: 'side mirror' },
  { da: ['bakspejl', 'bakspejlet'], en: 'rear-view mirror' },
  { da: ['vinduesvisker', 'vinduesviskere', 'visker', 'viskere', 'viskerblad'], en: 'windscreen wiper' },

  // Opladning / rækkevidde (25-11: "lade-punkt")
  { da: ['ladepunkt', 'ladepunktet', 'lade-punkt', 'lade-punktet', 'ladeport', 'ladeporten'], en: 'charging point' },
  { da: ['ladestander', 'ladestanderen', 'lader', 'laderen'], en: 'charger' },
  { da: ['ladekabel', 'ladekablet', 'ladekabler'], en: 'charging cable' },
  { da: ['ladeeffekt', 'ladeeffekten', 'ladehastighed', 'ladehastigheden'], en: 'charging power' },
  { da: ['opladning', 'opladningen', 'ladning'], en: 'charging' },
  { da: ['rækkevidde', 'rækkevidden'], en: 'range' },
  { da: ['batteriprocent', 'batteriniveau', 'batteriniveauet'], en: 'battery level' },
  { da: ['lynlader', 'lynladning', 'hurtiglader', 'hurtigladning'], en: 'fast charging' },

  // Kørsel / bremser / understel
  { da: ['rattet', 'rat'], en: 'steering wheel' },
  { da: ['speeder', 'speederen', 'speederpedal'], en: 'accelerator pedal' },
  { da: ['bremsepedal', 'bremsepedalen'], en: 'brake pedal' },
  { da: ['håndbremse', 'håndbremsen', 'parkeringsbremse', 'parkeringsbremsen'], en: 'parking brake' },
  { da: ['gearvælger', 'gearvælgeren', 'gearvælgeren'], en: 'gear selector' },
  { da: ['bakgear', 'bakgearet'], en: 'reverse gear' },
  { da: ['affjedring', 'affjedringen', 'understel', 'understellet'], en: 'suspension' },
  { da: ['bremselængde', 'bremselængden'], en: 'braking distance' },
  { da: ['regenerering', 'rekuperation', 'motorbremsning'], en: 'regenerative braking' },

  // Skærm / infotainment / app / lås
  { da: ['instrumentbræt', 'instrumentbrættet', 'instrumentpanel', 'instrumentpanelet'], en: 'dashboard' },
  { da: ['midterskærm', 'midterskærmen', 'infoskærm', 'infoskærmen'], en: 'center screen' },
  { da: ['berøringsskærm', 'berøringsskærmen', 'touchskærm', 'touchskærmen'], en: 'touchscreen' },
  { da: ['stemmestyring', 'stemmestyringen', 'stemmeassistent'], en: 'voice control' },
  { da: ['softwareopdatering', 'softwareopdateringen', 'softwareopdateringer'], en: 'software update' },
  { da: ['fjernlås', 'fjernlåsen', 'fjernlåsning'], en: 'remote lock' },
  { da: ['nøglekort', 'nøglekortet'], en: 'key card' },
  { da: ['nøglebrik', 'nøglebrikken'], en: 'key fob' },

  // Klima / kabine / hjul
  { da: ['kabine', 'kabinen'], en: 'cabin' },
  { da: ['klimaanlæg', 'klimaanlægget'], en: 'climate control' },
  { da: ['sædevarme', 'sædevarmen'], en: 'seat heating' },
  { da: ['varmepumpe', 'varmepumpen'], en: 'heat pump' },
  { da: ['dæktryk', 'dæktrykket'], en: 'tyre pressure' },
  { da: ['fælg', 'fælgen', 'fælge', 'fælgene'], en: 'wheel rim' },
  { da: ['sommerdæk', 'vinterdæk', 'dæk', 'dækkene'], en: 'tyre' },
];

// --- Bevar urørt (akronymer, modelnavne, reference-numre, versioner) ---------
// Disse SKAL overleve oversættelsen ordret. Akronymer matches case-sensitivt
// (versaler i kilden), så danske småord ("os", "ev") ikke rammes.
export const BEVAR: readonly BevarRegel[] = [
  // Reference-numre (fx "#10") og versioner (fx "3.0.4", "OS 3.0.4") - ellers
  // æder MT dem eller vender dem om.
  { soeg: /#\d+[a-zæøå]*/gi },
  { soeg: /(?<![\w.])\d+\.\d+(?:\.\d+)?(?![\w.])/g },

  // ADAS-/bil-akronymer (versaler, case-sensitivt)
  { ord: 'ACC' }, { ord: 'LCC' }, { ord: 'LKA' }, { ord: 'LDW' }, { ord: 'AEB' },
  { ord: 'ADAS' }, { ord: 'TPMS' }, { ord: 'OTA' }, { ord: 'ABS' }, { ord: 'ESP' },
  { ord: 'SOC' }, { ord: 'BMS' }, { ord: 'OBD' }, { ord: 'HUD' }, { ord: 'EV' },
  { ord: 'OS' }, { ord: 'V2L' }, { ord: 'WLTP' }, { ord: 'NEDC' },

  // Mærke + modelnavne (case-insensitivt - skrives ofte blandet)
  { ord: 'Zeekr' }, { ord: 'Geely' },
  { soeg: /\bZeekr\s+(?:001|007|009|X|7X|7GT|Mix)\b/gi },
  { soeg: /(?<![\p{L}\p{N}])(?:7GT|7X)(?![\p{L}\p{N}])/gu },
];

// --- Placeholder-token -------------------------------------------------------
// [[0]], [[1]], ... Dobbelt-firkantklamme + tal: usandsynligt i kilde-fritekst
// (ingen kollision), og MT'ens copy-mekanisme bevarer typisk klamme+tal. Genindsæt
// er TOLERANT (tåler at motoren flytter mellemrum eller taber en klamme).
function token(i: number): string {
  return `[[${i}]]`;
}

// --- Kilde-rensning ----------------------------------------------------------
// Strukturel, ALDRIG semantisk: rører ikke ordvalg/betydning. Giver MT rene
// sætningsgrænser (som den læner sig hårdt på) og fjerner oversætter-støj-triggere.
export function rensKilde(raw: string): string {
  if (!raw) return '';
  let s = raw;

  // 1) Fjern usynlige/kontroltegn (zero-width, BOM, soft hyphen) der kan trigge
  //    MT-støj ("PACKAGE LEAFLET"-fænomenet rammer ofte odd/empty input).
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F­​-‍﻿]/g, '');

  // 2) Hård linjeombrydning -> sætningsgrænse. En linje der IKKE ender på
  //    tegnsætning får et punktum, så MT ikke smelter to tanker til én løbsk
  //    sætning. Linje der allerede ender på .!?: -> bare mellemrum.
  s = s.replace(/[ \t]*(\r\n|\r|\n)+[ \t]*/g, (_m, _br, offset: number, hel: string) => {
    const foer = hel.slice(0, offset).trimEnd();
    if (!foer) return ' ';
    return /[.!?:;]$/.test(foer) ? ' ' : '. ';
  });

  // 3) Kollaps gentagen whitespace til ét mellemrum.
  s = s.replace(/[ \t]{2,}/g, ' ');

  // 4) Kollaps gentagen tegnsætning (!!! / ... håndteres varsomt: ... bevares).
  s = s.replace(/([!?])\1{1,}/g, '$1');

  // 5) Mellemrum efter sætningstegn hvis det mangler ("ord.Næste" -> "ord. Næste")
  //    - en hyppig kilde til løbske sætninger i indtastede meldinger. Rør ikke
  //    decimaltal (3.0) eller versioner: kun når der følger et bogstav.
  s = s.replace(/([.!?])([A-ZÆØÅa-zæøå])/g, '$1 $2');

  s = s.trim();

  // 6) Afsluttende sætningsgrænse, så MT får en ren hale.
  if (s && /[\p{L}\p{N})]$/u.test(s)) s += '.';

  return s;
}

// --- Term-beskyttelse --------------------------------------------------------

function escReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function storForbogstav(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Er positionen offset en sætningsstart (begyndelse eller efter .!?:)? Bruges til
// at give den indsatte engelske term stort forbogstav dér.
function erSaetningsstart(foer: string): boolean {
  return foer.length === 0 || /[.!?:]\s+$/.test(foer) || /\n\s*$/.test(foer);
}

type Applier = { soeg: RegExp; en?: string; bevar?: boolean };

// Byg listen af replacers, længste danske match FØRST (så flerords-/sammensatte
// termer vinder over korte). BEVAR-regler (ref#, version, akronym, model) lægges
// forrest.
function byggAppliers(): Applier[] {
  const ud: Applier[] = [];

  // BEVAR: regex-regler som de er; ord-regler case-sensitivt med ord-grænser.
  for (const b of BEVAR) {
    if (b.soeg) {
      ud.push({ soeg: new RegExp(b.soeg.source, b.soeg.flags.includes('g') ? b.soeg.flags : b.soeg.flags + 'g'), bevar: true });
    } else if (b.ord) {
      ud.push({ soeg: new RegExp(`(?<![\\p{L}\\p{N}])${escReg(b.ord)}(?![\\p{L}\\p{N}])`, 'gu'), bevar: true });
    }
  }

  // Term-regler: fladgør til (overfladeform, en), sortér længste form først.
  const former: { form: string; en: string }[] = [];
  for (const r of ORDLISTE) for (const f of r.da) former.push({ form: f, en: r.en });
  former.sort((a, b) => b.form.length - a.form.length);
  for (const { form, en } of former) {
    ud.push({ soeg: new RegExp(`(?<![\\p{L}\\p{N}])${escReg(form)}(?![\\p{L}\\p{N}])`, 'giu'), en });
  }
  return ud;
}

const APPLIERS = byggAppliers();

export type BeskyttetKilde = { tekst: string; erstatninger: string[] };

// Piller kendte termer ud og erstatter med placeholder-tokens. Returnerer den
// beskyttede tekst + den ordnede liste af engelske erstatninger (index = token-nr).
export function beskytTermer(kilde: string): BeskyttetKilde {
  const erstatninger: string[] = [];
  let tekst = kilde;

  for (const a of APPLIERS) {
    tekst = tekst.replace(a.soeg, (match: string, ...rest: unknown[]) => {
      // Sidste to callback-args (bortset fra evt. navngivne grupper) er offset + hel streng.
      const hel = rest[rest.length - 1] as string;
      const offset = rest[rest.length - 2] as number;
      const i = erstatninger.length;
      let en: string;
      if (a.bevar) {
        en = match; // bevar urørt
      } else {
        en = a.en as string;
        if (erSaetningsstart(hel.slice(0, offset))) en = storForbogstav(en);
      }
      erstatninger.push(en);
      return token(i);
    });
  }

  return { tekst, erstatninger };
}

// Genindsætter de engelske termer EFTER oversættelse. Tolerant: tåler at motoren
// har flyttet mellemrum ([[ 0 ]]) eller dubleret/tabt en enkelt klamme ([0]/[[0]).
// Højeste index først, så fler-cifrede tokens ([[10]]) ikke forveksles med [[1]].
export function genindsaetTermer(oversat: string, erstatninger: string[]): string {
  let s = oversat;
  for (let i = erstatninger.length - 1; i >= 0; i--) {
    const re = new RegExp(`\\[+\\s*${i}\\s*\\]+`, 'g');
    s = s.replace(re, () => erstatninger[i]);
  }
  return s;
}

// Hvor mange af vores tokens overlevede IKKE genindsætningen (diagnostik/test).
export function uindsatteTokens(oversat: string, erstatninger: string[]): number {
  let n = 0;
  for (let i = 0; i < erstatninger.length; i++) {
    if (new RegExp(`\\[+\\s*${i}\\s*\\]+`).test(oversat)) n++;
  }
  return n;
}

// Samlet forberedelse af den danske kilde FØR da->en-kaldet: rens + beskyt.
// Defensiv - kaster aldrig; en fejl falder tilbage til rå tekst uden beskyttelse,
// så oversættelsen aldrig bryder.
export function forberedKilde(kilde: string): BeskyttetKilde {
  try {
    return beskytTermer(rensKilde(kilde));
  } catch {
    return { tekst: kilde, erstatninger: [] };
  }
}
