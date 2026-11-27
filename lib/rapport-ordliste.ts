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
  { da: ['vognbaneskift', 'vognbaneskifte', 'banenskift', 'vognbane-skift', 'baneskift', 'baneskifte'], en: 'lane change' },
  { da: ['svingbane', 'svingbanen'], en: 'turn lane' },
  { da: ['vognbanen', 'vognbane', 'kørebane', 'kørebanen'], en: 'lane' },
  { da: ['vognbaneassistent', 'vognbaneassistenten', 'banehjælp'], en: 'lane assist' },
  { da: ['afkørsel', 'afkørslen', 'afkørsler', 'afkørslerne'], en: 'exit' },
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
  { da: ['blændet', 'blændes'], en: 'dazzled' }, // participium: "bliver blændet" -> "becomes dazzled" (undgår bevidst "blænder": bøjning/kongruens)
  { da: ['fjernlys', 'fjernlyset', 'langt lys', 'lange lys'], en: 'high beam' },
  { da: ['nærlys', 'nærlyset', 'kort lys'], en: 'low beam' },
  { da: ['nedblændning', 'nedblænding', 'nedblændningen'], en: 'high-beam dimming' },
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
  { da: ['ladestander', 'ladestanderen', 'laderen'], en: 'charger' }, // 'lader' bevidst UDE: oftest udsagnsordet (lader bilen/lader være), ikke 'charger' (2.3)
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
  { da: ['bakke', 'bakker', 'bakkede'], en: 'reverse' }, // bil-bak dominerer domænet (NLLB gætter "turn"); "bakke" er også "hill", bevidst tradeoff (2.3). Ordgrænser => rammer ikke "bakkamera"/"bakgear"
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
  { da: ['sædejustering', 'sædejusteringen', 'sædeindstilling', 'sædeindstillingen'], en: 'seat adjustment' },
  { da: ['sæde', 'sædet', 'sæder', 'sæderne', 'sædder'], en: 'seat' }, // 'sædder' = kilde-stavefejl (ellers -> "seed")
  { da: ['sikkerhedssele', 'sikkerhedsselen', 'sikkerhedsseler', 'sikkerhedsselerne'], en: 'seat belt' },
  { da: ['varmepumpe', 'varmepumpen'], en: 'heat pump' },
  { da: ['dæktryk', 'dæktrykket'], en: 'tyre pressure' },
  { da: ['fælg', 'fælgen', 'fælge', 'fælgene'], en: 'wheel rim' },
  { da: ['sommerdæk', 'vinterdæk', 'dæk', 'dækkene'], en: 'tyre' },

  // --- Runde 3 (2.8): fund i den LIVE engelske rapport 27-11 ------------------
  // Fire faste fagtermer LibreTranslate ramte forkert. Samme bare-ord-disciplin
  // som runde 2: hvert bare-ord auditeret for farlig hverdagsbetydning - kan en
  // term ikke mappes sikkert, mappes KUN de entydige komposita/fraser, og det bare
  // ord lades til review-gaten (Torben læser den engelske rapport før afsendelse).

  // "hakker"/"hakket" om en bil = rykvis/stammende gang (motor, acceleration,
  // skærm), 27-11: -> "minced" (hakket kød). Bil-domænet dominerer her (ingen
  // melder hakkekød som bil-fejl), som dæk/rat/visker i runde 2. Ordgrænser;
  // present/datid/participium. "stuttering" dækker både drivlinje og skærm.
  { da: ['hakker', 'hakkede', 'hakket'], en: 'stuttering' },

  // "overhaling" = at køre forbi. 27-11: -> "overhaul" (engelsk falsk ven = service).
  // KUN substantiv + kompositum (entydige). Verbalformerne (overhale/overhalet kan
  // også betyde "efterset/serviceret" på dansk) bevidst UDE - tvetydige som 'lader'
  // i runde 2; review-gaten dækker dem. Kompositum står før den korte form.
  { da: ['overhalingsbane', 'overhalingsbanen'], en: 'overtaking lane' },
  { da: ['overhaling', 'overhalingen'], en: 'overtaking' },

  // "striber" = vejstriber/kørebaneafmærkning. 27-11: -> "road strips". MEN bart
  // 'stribe'/'striber' er FARLIGT (striber på skærmen/i lakken/på sædet = stripes),
  // så KUN de entydige komposita mappes; bart 'striber' lades BEVIDST til review-
  // gaten (kan ikke mappes sikkert - se bare-ord-reglen ovenfor).
  { da: ['vejstriber', 'vejstriberne', 'vejstribe', 'vejstriben', 'kørebanestriber', 'kørebanestribe', 'vognbanestriber', 'vognbanestribe', 'vejafmærkning', 'vejafmærkningen', 'vejmarkering', 'vejmarkeringen'], en: 'lane markings' },
  { da: ['midterstribe', 'midterstriben'], en: 'centre line' },

  // "indre baner" = inner lanes. 27-11: -> "inner tracks". Bart 'bane'/'baner' er
  // FARLIGT (bane = track/court/orbit/field), så KUN adjektiv+bane-FRASER mappes
  // (entydige i kørsels-kontekst); bart 'baner' lades til review-gaten. Fraserne
  // (med mellemrum) er længere end 'vognbane', så længste-match tager dem først.
  { da: ['indre baner', 'indre banerne', 'inderste baner'], en: 'inner lanes' },
  { da: ['indre bane', 'indre banen', 'inderste bane', 'inderste banen'], en: 'inner lane' },
  { da: ['ydre baner', 'ydre banerne', 'yderste baner'], en: 'outer lanes' },
  { da: ['ydre bane', 'ydre banen', 'yderste bane', 'yderste banen'], en: 'outer lane' },
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

// --- Sætnings-split + indholdstab-værn (trin 2.1) ----------------------------
// NLLB (distilleret, grådig beam=1) kan lejlighedsvis droppe en HEL sætning i
// lange/rodede meldinger (set live 26-11: rapportens #7 tabte førstesætningen).
// To lag imod det, begge motor-agnostiske og rene (ingen HTTP her):
//  1) oversæt sætning-for-sætning - split den RENSEDE kilde på sætningsgrænser,
//     beskyt termerne om HVER sætning, oversæt hver som sin egen enhed, saml
//     igen med samme skilletegn. Så rammer et drop højst én sætning, og korte
//     input droppes stort set aldrig.
//  2) en indholdstab-heuristik (`erIndholdstab`) som længde-vagt i oversaet.ts.

// Splitter en RENSET kilde i sætninger ved tegnsætning+whitespace-grænser.
// Kræver whitespace EFTER tegnsætningen, så decimaler (3.0), versioner (3.0.4)
// og tidspunkter (15:30) ikke knækkes - kun ægte sætningsgrænser (som rensKilde
// netop normaliserer: "ord.Næste" -> "ord. Næste", linjeskift -> ". "). Bevarer
// skilletegnene, så en reassemble er byte-eksakt: dele[i] + (skilletegn[i] ?? '').
export function splitSaetninger(renset: string): { dele: string[]; skilletegn: string[] } {
  const dele: string[] = [];
  const skilletegn: string[] = [];
  const re = /[^.!?:;]*[.!?:;]+(\s+)/g;
  let sidst = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(renset)) !== null) {
    dele.push(renset.slice(sidst, re.lastIndex - m[1].length));
    skilletegn.push(m[1]);
    sidst = re.lastIndex;
  }
  const rest = renset.slice(sidst);
  if (rest.length > 0) dele.push(rest);
  if (dele.length === 0) dele.push(renset); // tom/kun-whitespace -> én (tom) del
  return { dele, skilletegn };
}

// Modstykket til splitSaetninger: sæt delene sammen igen med deres skilletegn.
export function samlSaetninger(dele: string[], skilletegn: string[]): string {
  return dele.map((d, i) => d + (skilletegn[i] ?? '')).join('');
}

// Én melding forberedt til sætnings-for-sætnings-oversættelse: dens beskyttede
// sætninger (hver med egne term-erstatninger) + skilletegnene imellem.
export type ForberedtMelding = { dele: BeskyttetKilde[]; skilletegn: string[] };

// Rens + split i sætninger + beskyt termer om HVER sætning. Defensiv som
// forberedKilde: kaster aldrig (en fejl -> hele teksten som én ubeskyttet del).
export function forberedSaetninger(kilde: string): ForberedtMelding {
  try {
    const { dele, skilletegn } = splitSaetninger(rensKilde(kilde));
    return { dele: dele.map(beskytTermer), skilletegn };
  } catch {
    return { dele: [{ tekst: kilde, erstatninger: [] }], skilletegn: [] };
  }
}

// --- Løse småord ved siden af en beskyttet term (trin 2.8) -------------------
// Beskyttelses-tokens kan isolere et kort dansk funktionsord, så MT'en mister den
// kontekst, den skal bruge for at oversætte det, og lader det stå dansk. Set LIVE
// 27-11: titlen "Nødbremsning i bakgear" koger efter beskyttelsen ned til
// "[[0]] i [[1]]" -> LibreTranslate oversatte ikke det isolerede "i" -> "...braking
// i reverse gear". GENERELT MØNSTER: når en kort melding/titel reduceres til tokens
// + ét løst småord, har MT'en intet at læne sig op ad. Lange beskrivelser rammes
// stort set ikke (rigeligt dansk omkring ordet til at oversætte det).
//
// Fix: et lille, KOLLISIONS-frit da->en-kort for de hyppigste funktionsord, kun
// anvendt når ordet står KLEMT op ad en af VORES placeholder-tokens ([[n]]) - dvs.
// netop den isolerede situation. Ordene er ikke gyldige engelske ord, så en
// overlevende lowercase-forekomst ER et uoversat levn; token-naboskabet gør det
// ekstra snævert, så en ægte oversættelse aldrig røres. "i" matches KUN lowercase
// (engelsk "I" er pronomen); de øvrige er alligevel ikke engelske ord. Kører på den
// rå MT-output FØR genindsaetTermer, mens tokens stadig er [[n]].
const LOESE_SMAAORD: Readonly<Record<string, string>> = {
  i: 'in', 'på': 'on', og: 'and', af: 'of', til: 'to',
  med: 'with', uden: 'without', fra: 'from', ved: 'at',
};

export function ryddLoeseSmaaord(oversat: string): string {
  if (!oversat || !oversat.includes('[[')) return oversat;
  let s = oversat;
  for (const da in LOESE_SMAAORD) {
    const en = LOESE_SMAAORD[da];
    // Lookbehind/lookahead forbruger ikke token-klammerne, så nabo-ord kan overlappe
    // (fx "[[0]] på [[1]] og [[2]]" - både "på" og "og" fanges). Tre naboskaber:
    // mellem to tokens, token+ord+slut, start+ord+token. Case-sensitivt (lowercase).
    s = s
      .replace(new RegExp(`(?<=\\]\\]\\s{0,3})${da}(?=\\s{0,3}\\[\\[)`, 'g'), en)
      .replace(new RegExp(`(?<=\\]\\]\\s{0,3})${da}(?=\\s*$)`, 'g'), en)
      .replace(new RegExp(`(?<=^\\s{0,3})${da}(?=\\s{0,3}\\[\\[)`, 'g'), en);
  }
  return s;
}

// Genindsæt termerne pr. oversat sætning og saml meldingen igen. Robust: mapper
// over forb.dele (det autoritative antal), så en motor der taber et listeelement
// (sætnings-drop -> tom/manglende plads) kun efterlader dén sætning tom og
// beholder resten - netop trin 2.1-pointen. Løse småord ryddes (trin 2.8) på den
// rå MT-output FØR termerne sættes ind igen.
export function samlOversatteSaetninger(oversatteDele: string[], forb: ForberedtMelding): string {
  const dele = forb.dele.map((d, i) => genindsaetTermer(ryddLoeseSmaaord(oversatteDele[i] ?? ''), d.erstatninger));
  return samlSaetninger(dele, forb.skilletegn);
}

// Groft sætnings-antal til indholdstab-heuristikken (tæller terminal-tegnsætning
// efterfulgt af whitespace eller tekst-slut). Mindst 1 hvis der er indhold.
export function antalSaetninger(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  const m = t.match(/[.!?:;]+(?:\s+|$)/g);
  return Math.max(m ? m.length : 0, 1);
}

// Content-loss-heuristik (trin 2.1 længde-vagt): ser oversættelsen drastisk
// kortere ud end kilden -> sandsynligt at motoren tabte indhold (en hel sætning).
// "Drastisk" = under halvdelen af kildens tegn ELLER under halvdelen af dens
// sætninger. Konservativt: en legitim da->en/sv-oversættelse ligger aldrig under
// det (skandinavisk<->engelsk er ~samme længde), så kun et reelt tab udløser den.
export function erIndholdstab(kilde: string, oversat: string): boolean {
  const k = kilde.trim();
  if (!k) return false;
  const o = oversat.trim();
  if (!o) return true;
  if (o.length < k.length * 0.5) return true;
  const ks = antalSaetninger(k);
  if (ks >= 2 && antalSaetninger(o) < ks * 0.5) return true;
  return false;
}

// --- Degenerations-værn (trin 2.2) -------------------------------------------
// NLLB (distilleret, grådig beam=1) hallucinerer lejlighedsvis en KORT titel til
// boilerplate - set LIVE i top-20-rapporten 26-11: melding #1's titel blev
// "The following is the list of the following:" (den ægte danske titel om
// selv-bremsning forsvandt helt). Det er IKKE et drop (outputtet er lige langt
// eller LÆNGERE end kilden), så længde-vagten `erIndholdstab` fanger det ikke.
// Dette er modstykket: fanger output der er degenereret snarere end tabt. Routes
// til SAMME `tvingLT`->LibreTranslate-fallback pr. melding i oversaet.ts.
//
// KALIBRERET MOD DEN FAKTISKE FEJL (26-11): den rigtige degeneration er MILDERE
// end de ekstreme loops man forestiller sig - "The following is the list of the
// following" har kun unik-ratio ~0,63 og ét bigram gentaget 2x. En første, for
// konservativ udgave (<0,5 og >=3) MISSEDE den. Tærsklerne her er sat så den
// fanges, OG så alle 19 øvrige rigtige titler i samme rapport IKKE flagges
// (ADAS interrupts in heavy rain, Cruise control, Improve ACC and LCC tuning ...).
//
// Tre sprog-AGNOSTISKE signaler (ingen hardcodede engelske fraser - sv dækkes med):
//  A) længde-blowup: en KORT kilde (<=40 tegn) hvis output er drastisk længere
//     (>=2,5x tegn OG mindst 30 tegn ekstra).
//  B) kort/titel-agtigt output (6..14 ord) der er boilerplate: et bigram gentaget
//     (>=2x) i lav-diversitets-tekst (unik-ratio <0,7), ELLER ét ord der dominerer
//     (>=40% af ordene). Øvre ord-grænse, så en ægte men ordrig BESKRIVELSE ikke
//     rammes (lange tekster har naturligt lavere unik-ratio).
//  C) ekstrem looping (vilkårlig længde): så lav diversitet (<0,4) OG så gentaget
//     (bigram >=3x) at ægte tekst aldrig rammer det - fanger lange "x of the x of
//     the x"-loops som B's ord-vindue ville springe over.
// Fallback-prisen er lav (LibreTranslate er en gyldig motor), så B er sat til at
// fange den milde boilerplate frem for at være maksimalt konservativ.
export function erDegeneration(kilde: string, oversat: string): boolean {
  const k = kilde.trim();
  const o = oversat.trim();
  if (!o) return false; // tomt output er et DROP (erIndholdstab), ikke degeneration

  // A) Kort kilde eksploderet i længde.
  const kLen = k.length;
  const oLen = o.length;
  if (kLen > 0 && kLen <= 40 && oLen >= kLen * 2.5 && oLen - kLen >= 30) return true;

  const ord = o.toLowerCase().match(/\p{L}+/gu) ?? [];
  if (ord.length < 6) return false;

  const unikRatio = new Set(ord).size / ord.length;
  const ordFrekv = new Map<string, number>();
  const bigrams = new Map<string, number>();
  let maksOrd = 0;
  let maksBigram = 0;
  for (let i = 0; i < ord.length; i++) {
    const n = (ordFrekv.get(ord[i]) ?? 0) + 1;
    ordFrekv.set(ord[i], n);
    if (n > maksOrd) maksOrd = n;
  }
  for (let i = 0; i < ord.length - 1; i++) {
    const bg = ord[i] + ' ' + ord[i + 1];
    const n = (bigrams.get(bg) ?? 0) + 1;
    bigrams.set(bg, n);
    if (n > maksBigram) maksBigram = n;
  }

  // B) Titel-agtigt, kort output (op til ~14 ord): boilerplate.
  if (ord.length <= 14) {
    if (maksBigram >= 2 && unikRatio < 0.7) return true;
    if (maksOrd / ord.length >= 0.4) return true;
  }
  // C) Ekstrem looping, vilkårlig længde.
  if (maksBigram >= 3 && unikRatio < 0.4) return true;

  return false;
}
