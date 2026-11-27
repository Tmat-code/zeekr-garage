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
// `foerst`: reglen køres FØR BEVAR-reglerne - til termer der INDEHOLDER et
// bevar-ord (fx "Drive Setup-genvej", hvor "Drive Setup" ellers ville blive pillet
// ud som bevar-token først og efterlade et løst "-genvej").
type TermRegel = { da: readonly string[]; en: string; foerst?: boolean };

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
  { da: ['rat'], en: 'steering wheel' },
  { da: ['rattet'], en: 'the steering wheel' }, // U1b: dansk bestemt form = "the" (live: "button of steering wheel")
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
  { da: ['kabine'], en: 'cabin' },
  { da: ['kabinen'], en: 'the cabin' },
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

  // --- Runde 4 (U1b, 27-11): fagtermer fra OTA-noterne på /software ---------
  // OTA-noterne er dansk bil-fagtekst skrevet af Torben - præcis hvad laget er
  // tunet til. Samme bare-ord-disciplin: kun entydige komposita/fraser.
  { da: ['Drive Setup-genvej', 'Drive Setup-genvejen'], en: 'Drive Setup shortcut', foerst: true },
  { da: ['hastighedsoverskridelse', 'hastighedsoverskridelser', 'hastighedsoverskridelsen'], en: 'speeding' },
  { da: ['hastighedsadvarsel', 'hastighedsadvarslen'], en: 'speed warning' },
  { da: ['hastighedsadvarsler', 'hastighedsadvarslerne'], en: 'speed warnings' },
  { da: ['køreovervågning', 'førerovervågning'], en: 'driver monitoring' },
  { da: ['køreovervågningen', 'førerovervågningen'], en: 'the driver monitoring' },
  { da: ['føreropmærksomhed', 'føreropmærksomheden'], en: 'driver attention' },
  { da: ['trætheds-/opmærksomhedsalarmer', 'trætheds- og opmærksomhedsalarmer'], en: 'fatigue/attention alerts' },
  { da: ['regenerativ bremsning', 'regenerative bremsning'], en: 'regenerative braking' },
  { da: ['regenereringen'], en: 'the regenerative braking' },
  { da: ['anhængertræk', 'anhængertrækket'], en: 'tow bar' },
  { da: ['træktilstand', 'træktilstanden'], en: 'towing mode' },
  { da: ['køretilstand', 'køretilstanden'], en: 'drive mode' },
  { da: ['køretilstande', 'køretilstandene'], en: 'drive modes' },
  { da: ['fartkamera', 'fartkameraet'], en: 'speed camera' },
  { da: ['fartkameraer', 'fartkameraerne'], en: 'speed cameras' },
  { da: ['selestatus', 'selestatussen'], en: 'seat belt status' },
  { da: ['bagsæde', 'bagsædet'], en: 'rear seat' },
  { da: ['bagsæder'], en: 'rear seats' },
  { da: ['bagsæderne'], en: 'the rear seats' },
  { da: ['forkonditionering', 'forkonditioneringen'], en: 'preconditioning' },
  { da: ['højvoltbatteri', 'højvoltsbatteri'], en: 'high-voltage battery' },
  { da: ['højvoltbatteriet', 'højvoltsbatteriet'], en: 'the high-voltage battery' },
  { da: ['luftfordeling', 'luftfordelingen'], en: 'air distribution' },
  { da: ['startskærm'], en: 'home screen' },
  { da: ['startskærmen'], en: 'the home screen' },
  { da: ['kørebog', 'kørselslog'], en: 'trip log' }, // 'trip log' (ikke 'driving log': sv-pivoten gav "kör logga")
  { da: ['kørebogen', 'kørselsloggen'], en: 'the trip log' },
  { da: ['kurve-farttilpasning', 'kurve-farttilpasningen', 'kurvefarttilpasning'], en: 'speed adaptation in curves' }, // sv-pivoten lod "Curve" stå
  { da: ['farttilpasning', 'farttilpasningen'], en: 'speed adaptation' },
  { da: ['navigations-markør', 'navigations-markøren', 'navigationsmarkør', 'navigationsmarkøren'], en: 'navigation marker' },
  { da: ['rattevarme', 'rattevarmer'], en: 'steering wheel heating' },
  { da: ['rattevarmen'], en: 'the steering wheel heating' },
  { da: ['regndråbe-registrering', 'regndråbe-registreringen', 'regndråberegistrering'], en: 'raindrop detection' },
  { da: ['autovarme', 'autovarmen'], en: 'automatic heating' },
  { da: ['sidespejlene'], en: 'the side mirrors' },
  { da: ['vaskehal', 'vaskehallen'], en: 'car wash' },
  { da: ['kørestilling', 'kørestillingen'], en: 'Drive' }, // "i kørestilling (D)" = gearstillingen D
  { da: ['hurtigmenu', 'hurtigmenuen'], en: 'quick menu' },
  { da: ['ladeindstilling', 'ladeindstillingen'], en: 'charging setting' },
  { da: ['ladeindstillinger', 'ladeindstillingerne'], en: 'charging settings' },
  { da: ['ladelys', 'ladelyset'], en: 'charging light' },
  { da: ['AC-opladning', 'AC-opladningen', 'AC-ladning'], en: 'AC charging' },
  { da: ['lokationssporing', 'lokationssporingen'], en: 'location tracking' },
  { da: ['digital nøgle', 'digitale nøgle', 'digitale nøgler'], en: 'digital key' },
  { da: ['går i dvale'], en: 'enters sleep mode' }, // 'goes to sleep' -> sv "går och lägger sig"
  { da: ['brugerdefinerbar', 'brugerdefinerbare'], en: 'customisable' },
  { da: ['brugervenlighed', 'brugervenligheden'], en: 'usability' },
  // Live-runde (U1b, 27-11 efter deploy): fejl set i den engelske/svenske /software.
  { da: ['Zeekr-appen'], en: 'the Zeekr app', foerst: true }, // ellers "Zeekr the app"
  { da: ['Zeekr-app'], en: 'Zeekr app', foerst: true },
  { da: ['ACC/LCC-opførsel', 'ACC/LCC-opførslen'], en: 'ACC/LCC behaviour', foerst: true },
  { da: ['opførsel', 'opførslen'], en: 'behaviour' },
  { da: ['forbedrer'], en: 'improves' }, // verbum forrest: LT gjorde "Forbedrer information om" til en if-sætning
  { da: ['optimerer'], en: 'optimises' },
  { da: ['skærpet', 'skærpede'], en: 'stricter' }, // LT: "Skipped"
  { da: ['finjusteret', 'finjusterede'], en: 'fine-tuned' },
  { da: ['mindre hakken og ryk'], en: 'less stuttering and jerking' }, // LT: "smaller pick and roll"
  { da: ['hakken og ryk'], en: 'stuttering and jerking' },
  { da: ['hakken'], en: 'stuttering' },
  { da: ['rulles ud gradvis', 'rulles gradvis ud'], en: 'rolling out gradually' },
  { da: ['som udgangspunkt'], en: 'by default' },
  { da: ['flere trin til'], en: 'more levels of' },
];

// --- Svenske fagtermer på en->sv-pivoten (U1b, 27-11) -------------------------
// sv laves via engelsk (da->en->sv). LibreTranslates en->sv-model lader enkelte
// engelske ord stå ("Fine-tuned", "jerking") og rammer termer skævt ("bogsfältet"
// for tow bar). Den engelske mellemtekst er VORES (ORDLISTE-termerne står ordret),
// så de kendte termer kan erstattes direkte med faste svenske termer, før en->sv-
// kaldet. Kun flerords-/entydige fagtermer: generiske ord (range, charging, lane,
// seat, cabin ...) er bevidst UDE, da de også kan stå i fri MT-tekst med anden
// betydning. Bestemte former ("the X") har egen svensk bestemt form og står først.
// Ingen ordliste fanger alt - resten maskinoversættes, originalen er ét klik væk.
export const EN_SV: Readonly<Record<string, string>> = {
  // OTA-noter (runde 4 + live-runder)
  'Drive Setup shortcut': 'Drive Setup-genväg',
  'driving setup': 'körinställningar',
  'ACC/LCC behaviour': 'ACC/LCC-beteende',
  'the Zeekr app': 'Zeekr-appen',
  'Zeekr app': 'Zeekr-appen',
  'the steering wheel heating': 'rattvärmen',
  'steering wheel heating': 'rattvärme',
  'the steering wheel': 'ratten',
  'the regenerative braking': 'den regenerativa bromsningen',
  'regenerative braking': 'regenerativ bromsning',
  'the driver monitoring': 'förarövervakningen',
  'driver monitoring': 'förarövervakning',
  'driver attention': 'föraruppmärksamhet',
  'fatigue/attention alerts': 'trötthets-/uppmärksamhetsvarningar',
  'speed warnings': 'hastighetsvarningar',
  'speed warning': 'hastighetsvarning',
  speeding: 'fortkörning',
  'speed cameras': 'fartkameror',
  'speed camera': 'fartkamera',
  'speed adaptation in curves': 'hastighetsanpassning i kurvor',
  'speed adaptation': 'hastighetsanpassning',
  'tow bar': 'dragkrok',
  'towing mode': 'dragläge',
  'drive modes': 'körlägen',
  'drive mode': 'körläge',
  'seat belt status': 'bältesstatus',
  'the rear seats': 'baksätena',
  'rear seats': 'baksäten',
  'rear seat': 'baksäte',
  preconditioning: 'förkonditionering',
  'the high-voltage battery': 'högvoltsbatteriet',
  'high-voltage battery': 'högvoltsbatteri',
  'air distribution': 'luftfördelning',
  'the home screen': 'hemskärmen',
  'home screen': 'hemskärm',
  'the trip log': 'körjournalen',
  'trip log': 'körjournal',
  'navigation marker': 'navigationsmarkör',
  'raindrop detection': 'regndroppsavkänning',
  'automatic heating': 'automatisk uppvärmning',
  'the side mirrors': 'sidospeglarna',
  'car wash': 'biltvätt',
  'quick menu': 'snabbmeny',
  'charging settings': 'laddningsinställningar',
  'charging setting': 'laddningsinställning',
  'charging light': 'laddningslampa',
  'AC charging': 'AC-laddning',
  'location tracking': 'platsspårning',
  'digital key': 'digital nyckel',
  'enters sleep mode': 'går i viloläge',
  'rolling out gradually': 'rullas ut gradvis',
  'less stuttering and jerking': 'mindre hackighet och ryck',
  'stuttering and jerking': 'hackighet och ryck',
  'fine-tuned': 'finjusterad',
  optimises: 'optimerar', // fra ORDLISTE 'optimerer' (LT lod "Optimises" stå)
  improves: 'förbättrar',
  stricter: 'strängare',
  // Rapportens faste termer (ORDLISTE-runde 1-3)
  'adaptive cruise control': 'adaptiv farthållare',
  'cruise control': 'farthållare',
  'lane change': 'filbyte',
  'turn lane': 'svängfil',
  'lane assist': 'filhållningsassistans',
  'automatic emergency braking': 'automatisk nödbromsning',
  'emergency brake': 'nödbroms',
  'driver assistance': 'förarassistans',
  'distance sensor': 'avståndssensor',
  'parking sensor': 'parkeringssensor',
  'reversing camera': 'backkamera',
  'traffic sign recognition': 'trafikskyltsavläsning',
  'oncoming traffic': 'mötande trafik',
  'automatic high beam': 'automatiskt helljus',
  'high-beam dimming': 'helljusavbländning',
  'high beam': 'helljus',
  'low beam': 'halvljus',
  'turn signal': 'körriktningsvisare',
  'daytime running light': 'varselljus',
  'rear-view mirror': 'backspegel',
  'windscreen wiper': 'vindrutetorkare',
  'charging point': 'laddpunkt',
  'charging cable': 'laddkabel',
  'charging power': 'laddeffekt',
  'fast charging': 'snabbladdning',
  'battery level': 'batterinivå',
  'accelerator pedal': 'gaspedal',
  'brake pedal': 'bromspedal',
  'parking brake': 'parkeringsbroms',
  'gear selector': 'växelväljare',
  'reverse gear': 'backväxel',
  'braking distance': 'bromssträcka',
  'center screen': 'mittskärm',
  'voice control': 'röststyrning',
  'software update': 'programuppdatering',
  'remote lock': 'fjärrlåsning',
  'key card': 'nyckelkort',
  'key fob': 'nyckelbricka',
  'climate control': 'klimatanläggning',
  'seat heating': 'stolsvärme',
  'seat adjustment': 'stolsinställning',
  'seat belt': 'säkerhetsbälte',
  'heat pump': 'värmepump',
  'tyre pressure': 'däcktryck',
  'wheel rim': 'fälg',
  'overtaking lane': 'omkörningsfil',
  'lane markings': 'vägmarkeringar',
  'centre line': 'mittlinje',
  'inner lanes': 'inre filer',
  'inner lane': 'inre fil',
  'outer lanes': 'yttre filer',
  'outer lane': 'yttre fil',
};

// --- Bevar urørt (akronymer, modelnavne, reference-numre, versioner) ---------
// Disse SKAL overleve oversættelsen ordret. Akronymer matches case-sensitivt
// (versaler i kilden), så danske småord ("os", "ev") ikke rammes.
export const BEVAR: readonly BevarRegel[] = [
  // Reference-numre (fx "#10") og versioner (fx "3.0.4", "OS 3.0.4") - ellers
  // æder MT dem eller vender dem om.
  { soeg: /#\d+[a-zæøå]*/gi },
  // P39: lookahead tillader et AFSLUTTENDE punktum (efterfulgt af whitespace eller
  // streng-slut), så en version sidst på en linje/sætning/titel ("3.0.3" + linjeskift
  // -> rensKilde "3.0.3.", "på 3.0.4.", titel "Fejl efter 3.0.3") også beskyttes.
  // Punktummet er ikke en del af matchet og bliver stående uden for tokenet.
  // Et punktum efterfulgt af andet (".4", ".x", "..") blokerer stadig, så
  // "3.0.3.4" ikke dobbelt-/del-matches.
  { soeg: /(?<![\w.])\d+\.\d+(?:\.\d+)?(?!\w|\.(?!\s|$))/g },

  // ADAS-/bil-akronymer (versaler, case-sensitivt)
  { ord: 'ACC' }, { ord: 'LCC' }, { ord: 'LKA' }, { ord: 'LDW' }, { ord: 'AEB' },
  { ord: 'ADAS' }, { ord: 'TPMS' }, { ord: 'OTA' }, { ord: 'ABS' }, { ord: 'ESP' },
  { ord: 'SOC' }, { ord: 'BMS' }, { ord: 'OBD' }, { ord: 'HUD' }, { ord: 'EV' },
  { ord: 'OS' }, { ord: 'V2L' }, { ord: 'WLTP' }, { ord: 'NEDC' },

  // Engelske Zeekr-funktionsnavne i OTA-noterne (U1b, 27-11): produktnavne som de
  // står i bilens UI - må ikke oversættes ("Pet Mode" -> "Husdyrstilstand" ville
  // ikke matche skærmen). Case-sensitivt; længste først (Remote Straight ... før
  // Remote Park ...) er ligegyldigt, de overlapper ikke.
  { ord: 'Drive Setup' }, { ord: 'Remote Straight Park Assist' }, { ord: 'Remote Park Assist' },
  { ord: 'RPA' }, { ord: 'Pet Mode' }, { ord: 'Journey Log' }, { ord: 'Lifeform detection' },
  { ord: 'Car Wash Mode' }, { ord: 'Adapt to Route Ahead' }, { ord: 'Driver Monitoring' },
  { ord: 'Connected Services' }, { ord: 'Bluetooth' }, { ord: 'Off' },

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
  //    MT-støj. (Selve "PACKAGE LEAFLET"-fænomenet skyldtes IKKE kontroltegn, men
  //    sprog-løse stumper efter split/beskyttelse - se harSprogIndhold, trin 2.9.)
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

// U1b (live 27-11): LibreTranslate taber/forvansker tegn der står TÆT om et token -
// "Kørselsopsætning ([[0]]):" -> "Driving setup (Drive Setup:" (slut-parentes væk),
// "\"[[0]]\" står på \"[[1]]\"" -> "\"Adapt to Route Ahead 'is\" Off'", og "[[0]]/[[1]]"
// -> "ACC / LCC". Fix: flet parentes/anførselstegn tæt om ét token, og tokens
// sammenkædet med "/", ind i SELVE erstatningen, så motoren kun ser ét token.
// Et flettet-væk index får erstatning '' (findes ikke længere i teksten).
const PAR: Readonly<Record<string, string>> = { '(': ')', '"': '"', '“': '”', '«': '»' };

export function fletTokens(b: BeskyttetKilde): BeskyttetKilde {
  const e = [...b.erstatninger];
  let tekst = b.tekst;
  let foer = '';
  while (foer !== tekst) {
    foer = tekst;
    tekst = tekst.replace(/\[\[(\d+)\]\]\/\[\[(\d+)\]\]/, (_m, a: string, c: string) => {
      e[+a] = `${e[+a]}/${e[+c]}`;
      e[+c] = '';
      return token(+a);
    });
  }
  tekst = tekst.replace(/([("“«])\[\[(\d+)\]\]([)"”»])/g, (m, o: string, n: string, c: string) => {
    if (PAR[o] !== c) return m;
    e[+n] = `${o}${e[+n]}${c}`;
    return token(+n);
  });
  return { tekst, erstatninger: e };
}

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
function termAppliers(regler: readonly TermRegel[]): Applier[] {
  const former: { form: string; en: string }[] = [];
  for (const r of regler) for (const f of r.da) former.push({ form: f, en: r.en });
  former.sort((a, b) => b.form.length - a.form.length);
  return former.map(({ form, en }) => ({
    soeg: new RegExp(`(?<![\\p{L}\\p{N}])${escReg(form)}(?![\\p{L}\\p{N}])`, 'giu'),
    en,
  }));
}

function bevarAppliers(): Applier[] {
  const ud: Applier[] = [];
  for (const b of BEVAR) {
    if (b.soeg) {
      ud.push({ soeg: new RegExp(b.soeg.source, b.soeg.flags.includes('g') ? b.soeg.flags : b.soeg.flags + 'g'), bevar: true });
    } else if (b.ord) {
      ud.push({ soeg: new RegExp(`(?<![\\p{L}\\p{N}])${escReg(b.ord)}(?![\\p{L}\\p{N}])`, 'gu'), bevar: true });
    }
  }
  return ud;
}

function byggAppliers(): Applier[] {
  const ud: Applier[] = [];

  // U1b: "foerst"-termer (indeholder et bevar-ord) før BEVAR.
  ud.push(...termAppliers(ORDLISTE.filter((r) => r.foerst)));

  // BEVAR: regex-regler som de er; ord-regler case-sensitivt med ord-grænser.
  ud.push(...bevarAppliers());

  // Term-regler: længste danske form først (flerords-/sammensatte termer vinder).
  ud.push(...termAppliers(ORDLISTE.filter((r) => !r.foerst)));
  return ud;
}

const APPLIERS = byggAppliers();
const BEVAR_APPLIERS = bevarAppliers();

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

  return fletTokens({ tekst, erstatninger });
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

// U1b: KUN bevar-reglerne (versioner, akronymer, modelnavne, engelske funktions-
// navne) - til en->sv-pivoten. Den engelske mellemtekst har ingen danske termer
// tilbage, men "Pet Mode", "ACC", "3.0.4" o.l. skal heller ikke ændres på vej til
// svensk. Samme token-format, så genindsaetTermer genbruges.
// Appliers til en->sv: svenske termer FØR bevar (så "Drive Setup shortcut" og
// "the Zeekr app" fanges hele), længste først, case-insensitivt med ordgrænser.
const EN_SV_SORTERET = Object.entries(EN_SV).sort((a, b) => b[0].length - a[0].length);
const tilApplier = ([en, sv]: [string, string]): Applier => ({
  soeg: new RegExp(`(?<![\\p{L}\\p{N}])${escReg(en)}(?![\\p{L}\\p{N}])`, 'giu'),
  en: sv,
});

// Rækkefølge: EN_SV-termer der INDEHOLDER et bevar-ord ("Drive Setup shortcut",
// "the Zeekr app") før bevar; alle andre EFTER bevar, så fx "car wash" ikke river
// "Car Wash" ud af funktionsnavnet "Car Wash Mode".
const indeholderBevar = (en: string) =>
  BEVAR_APPLIERS.some((b) => new RegExp(b.soeg.source, b.soeg.flags.replace('g', '')).test(en));
const EN_SV_FOERST = EN_SV_SORTERET.filter(([en]) => indeholderBevar(en)).map(tilApplier);
const EN_SV_EFTER = EN_SV_SORTERET.filter(([en]) => !indeholderBevar(en)).map(tilApplier);

// U1b: beskyt den engelske mellemtekst før en->sv: kendte fagtermer -> fast svensk
// term (stort forbogstav ved sætningsstart), derefter bevar-ordene. Samme
// token-format, så genindsaetTermer + erTokenSkadet genbruges på pivoten.
export function beskytTilSvensk(tekst: string): BeskyttetKilde {
  const erstatninger: string[] = [];
  let ud = tekst;
  for (const a of [...EN_SV_FOERST, ...BEVAR_APPLIERS, ...EN_SV_EFTER]) {
    ud = ud.replace(a.soeg, (match: string, ...rest: unknown[]) => {
      const hel = rest[rest.length - 1] as string;
      const offset = rest[rest.length - 2] as number;
      let v = a.bevar ? match : (a.en as string);
      if (!a.bevar && erSaetningsstart(hel.slice(0, offset))) v = storForbogstav(v);
      erstatninger.push(v);
      return token(erstatninger.length - 1);
    });
  }
  return fletTokens({ tekst: ud, erstatninger });
}

export function beskytBevar(tekst: string): BeskyttetKilde {
  const erstatninger: string[] = [];
  let ud = tekst;
  for (const a of BEVAR_APPLIERS) {
    ud = ud.replace(a.soeg, (match: string) => {
      erstatninger.push(match);
      return token(erstatninger.length - 1);
    });
  }
  return fletTokens({ tekst: ud, erstatninger });
}

// U1b (live 27-11): har motoren forvansket et token ("[[2]" eller et index der ikke
// findes), står der klamme-rester tilbage efter genindsætningen, eller en erstatning
// mangler. Så må den enhed ikke vises - kalderen oversætter den igen uden tokens.
export function erTokenSkadet(resultat: string, erstatninger: string[]): boolean {
  if (/\[\s*\d+\s*\]|\[\[|\]\]/.test(resultat)) return true;
  return erstatninger.some((x) => x && !resultat.includes(x));
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

// --- Sprog-løse stumper sendes aldrig til motoren (trin 2.9) -----------------
// "PACKAGE LEAFLET" (live 27-11, Other #1): sætnings-splittet + term-beskyttelsen
// kan efterlade enheder UDEN ét eneste bogstav - fx et listenummer "1." (fra
// "1. Åbn appen"), en løs punkt-linje "-." / "***.", en titel der er HELT
// beskyttet ("Fartpilot" -> "[[0]].") eller en tom streng. Sendt alene til
// LibreTranslate/Argos (eller NLLB) har modellen intet sprog at oversætte og
// hallucinerer træningsdata - Argos' da->en-korpus rummer EU-medicin-indlægssedler
// ("1. NAME OF THE MEDICINAL PRODUCT", "PACKAGE LEAFLET"), så en nummer-/tegn-
// stump kan komme ud som "PACKAGE LEAFLET". Det er et pipeline-artefakt, ikke
// kildeteksten, og det rammer enhver motor.
//
// Fix: en enhed uden bogstaver (når vores [[n]]-tokens er trukket fra) har intet
// at oversætte - cifre, tegnsætning, emoji og tokens er sprog-neutrale. Den sendes
// ikke til motoren men går UÆNDRET videre (genindsætningen gør "[[0]]." til
// "Cruise control."). Normal tekst røres aldrig: alt med mindst ét bogstav sendes
// præcis som før.
const TOKEN_RE = /\[+\s*\d+\s*\]+/g;

export function harSprogIndhold(tekst: string): boolean {
  if (!tekst) return false;
  return /\p{L}/u.test(tekst.replace(TOKEN_RE, ''));
}

// Kalder motoren KUN med enhederne der har sprog-indhold; sprog-løse enheder
// returneres ordret på deres plads. Rækkefølge og længde bevares 1:1. Ingen
// enheder med indhold -> intet motor-kald overhovedet. Ren (motoren injiceres).
export async function oversaetKunSprog(
  tekster: string[],
  kald: (udvalg: string[]) => Promise<string[]>,
): Promise<string[]> {
  const idx: number[] = [];
  tekster.forEach((t, i) => {
    if (harSprogIndhold(t)) idx.push(i);
  });
  const ud = [...tekster];
  if (idx.length === 0) return ud;
  const raa = await kald(idx.map((i) => tekster[i]));
  idx.forEach((i, k) => {
    ud[i] = raa[k] ?? '';
  });
  return ud;
}

// Genindsæt termerne pr. oversat sætning og saml meldingen igen. Robust: mapper
// over forb.dele (det autoritative antal), så en motor der taber et listeelement
// (sætnings-drop -> tom/manglende plads) kun efterlader dén sætning tom og
// beholder resten - netop trin 2.1-pointen. Løse småord ryddes (trin 2.8) på den
// rå MT-output FØR termerne sættes ind igen.
export function samlOversatteSaetninger(oversatteDele: string[], forb: ForberedtMelding): string {
  const dele = forb.dele.map((d, i) =>
    // U1b: bestemte former giver nu "the X"; har motoren selv sat et "the" foran, ryddes dubletten.
    genindsaetTermer(ryddLoeseSmaaord(oversatteDele[i] ?? ''), d.erstatninger).replace(/\b(the)\s+the\b/gi, '$1'),
  );
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
