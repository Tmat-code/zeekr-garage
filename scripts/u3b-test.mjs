#!/usr/bin/env node
// U3b: isolerede assertioner på (1) sprog-detektion, (2) rapport-routing pr.
// kildesprog og (3) søge-match på tværs af sprog. Ingen DB, ingen rigtig
// LibreTranslate: en lokal stub-server spiller LT (/translate + /detect) og
// logger hvert kald (kilde, mål, tekster), og Supabase-klienten er en stub.
//
// Kør: node scripts/u3b-test.mjs   (exit 1 ved fejl)
//
// Stub-LT'ens "oversættelse" = `<<src>tgt>> ` + teksten med små bogstaver. Så kan
// vi se (a) hvilken retning hver tekst gik, og (b) at beskyttede termer
// (ACC, 3.0.3, ordliste-termer) overlever som deres originale/fastlagte form.

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const lavJiti = createRequire(import.meta.url)('jiti');

const ROD = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'zg-u3b-'));

let ok = 0;
let fejl = 0;
function lig(navn, faktisk, forventet) {
  const a = JSON.stringify(faktisk);
  const b = JSON.stringify(forventet);
  if (a === b) ok++;
  else {
    fejl++;
    console.log(`FEJL  ${navn}\n      fik       ${a}\n      forventede ${b}`);
  }
}
function sand(navn, v) {
  lig(navn, !!v, true);
}

// ---------------------------------------------------------------------------
// Stub-LibreTranslate
// ---------------------------------------------------------------------------
const kald = [];
let detektSvar = [{ language: 'sv', confidence: 90 }];
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const j = JSON.parse(body || '{}');
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/detect') {
      kald.push({ vej: 'detect', q: j.q });
      res.end(JSON.stringify(detektSvar));
      return;
    }
    const q = Array.isArray(j.q) ? j.q : [j.q];
    kald.push({ vej: 'translate', kilde: j.source, maal: j.target, q });
    const ud = q.map((t) => `<<${j.source}>${j.target}>> ${String(t).toLowerCase()}`);
    res.end(JSON.stringify({ translatedText: Array.isArray(j.q) ? ud : ud[0] }));
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
process.env.LIBRETRANSLATE_URL = `http://127.0.0.1:${port}`;
delete process.env.NLLB_URL;

// ---------------------------------------------------------------------------
// Stub-Supabase (oversaettelser / kommentar_oversaettelser): tom cache, upserts
// logges.
// ---------------------------------------------------------------------------
fs.writeFileSync(
  path.join(TMP, 'sb-stub.mjs'),
  `export const upserts = (globalThis.__u3bUpserts ??= []);
function q(tabel) {
  const b = {
    select() { return b; }, in() { return b; }, eq() { return b; },
    then(res) { return Promise.resolve({ data: [], error: null }).then(res); },
    upsert(rows) { upserts.push({ tabel, rows }); return Promise.resolve({ error: null }); },
  };
  return b;
}
export function supabaseServer() { return { from: q }; }
export function supabaseService() { return { from: q }; }
`,
);
const jiti = lavJiti(new URL(import.meta.url).pathname, {
  alias: {
    '@/lib/supabase/server': path.join(TMP, 'sb-stub.mjs'),
    '@/lib/supabase/service': path.join(TMP, 'sb-stub.mjs'),
    '@': ROD,
  },
  cache: false,
  requireCache: false,
});

const ks = jiti(path.join(ROD, 'lib/kildesprog.ts'));
const ov = jiti(path.join(ROD, 'lib/oversaet.ts'));
const tk = jiti(path.join(ROD, 'lib/titel-oversaet-kerne.ts'));
const stub = jiti(path.join(TMP, 'sb-stub.mjs'));

// ===========================================================================
// 1) Sprog-detektion
// ===========================================================================
const G = (t) => ks.gaetKildesprog(t);
lig('sv: ä/ö er sikkert svensk', G('Bromsarna låter när jag backar'), { sprog: 'sv', sikker: true });
lig('da: æ/ø er sikkert dansk', G('Nødbremsning i bakgear'), { sprog: 'da', sikker: true });
lig('sv uden ä/ö: stopord', G('Bilen startar inte alltid och det blir svart'), { sprog: 'sv', sikker: true });
lig('da uden æ/ø: stopord', G('Bilen starter ikke og skal genstartes hvis den har stået ude'), { sprog: 'da', sikker: true });
lig('en: stopord', G('The car does not start when it is cold and the screen is black'), { sprog: 'en', sikker: true });
lig('norsk (æ/ø) -> da', G('Bilen bremser når jeg rygger, også på tørr vei'), { sprog: 'da', sikker: true });
lig('kort uden signal -> da, usikker', G('OTA 3.0.3 ACC'), { sprog: 'da', sikker: false });
lig('tom -> da, usikker', G(''), { sprog: 'da', sikker: false });
lig('én svensk stopord-træf -> sv men usikker', G('Fartpilot och ACC'), { sprog: 'sv', sikker: false });
lig('uafgjort da/sv -> da usikker', G('og och'), { sprog: 'da', sikker: false });
lig('store bogstaver Ä/Ö', G('NÖDBROMSNING VID BACKNING'), { sprog: 'sv', sikker: true });
// Rigtige meldings-typer
lig('dansk titel uden æøå', G('ADAS afbryder ved kraftig regn.'), { sprog: 'da', sikker: false });
lig('dansk titel uden æøå + beskrivelse', G('ADAS afbryder ved kraftig regn.\nDet sker hver gang, og jeg kan ikke slå det til igen.'), { sprog: 'da', sikker: true });

// LT-detekt-mapping + endelig afgørelse
lig('fraLtDetekt sv', ks.fraLtDetekt([{ language: 'sv', confidence: 88 }]), 'sv');
lig('fraLtDetekt nb -> da', ks.fraLtDetekt([{ language: 'nb', confidence: 70 }]), 'da');
lig('fraLtDetekt lav konfidens -> null', ks.fraLtDetekt([{ language: 'sv', confidence: 20 }]), null);
lig('fraLtDetekt ukendt sprog -> null', ks.fraLtDetekt([{ language: 'de', confidence: 99 }]), null);
lig('fraLtDetekt tom -> null', ks.fraLtDetekt([]), null);
lig('bestem: sikker heuristik slår LT', ks.bestemKildesprog({ sprog: 'sv', sikker: true }, 'da'), 'sv');
lig('bestem: usikker -> LT', ks.bestemKildesprog({ sprog: 'da', sikker: false }, 'en'), 'en');
lig('bestem: usikker + intet LT -> heuristik', ks.bestemKildesprog({ sprog: 'da', sikker: false }, null), 'da');

// Stopord-listerne: disjunkte + IDENTISKE med SQL-spejlet i migrationen.
const alle = [...ks.STOP_SV, ...ks.STOP_DA, ...ks.STOP_EN];
lig('stopord-lister disjunkte', alle.length, new Set(alle).size);
const sql = fs.readFileSync(path.join(ROD, 'supabase/migrations/20261127140000_u3b_feedback_sprog.sql'), 'utf8');
function sqlListe(navn) {
  const m = sql.match(new RegExp(`${navn} constant text\\[\\] := array\\[([^\\]]*)\\]`));
  return m ? [...m[1].matchAll(/'([^']*)'/g)].map((x) => x[1]) : null;
}
lig('SQL stop_sv == TS', sqlListe('stop_sv'), [...ks.STOP_SV]);
lig('SQL stop_da == TS', sqlListe('stop_da'), [...ks.STOP_DA]);
lig('SQL stop_en == TS', sqlListe('stop_en'), [...ks.STOP_EN]);

// Prøver til SQL-spejl-testen (SQL-spejl-testen i lokal Postgres læser /tmp/zg-u3b-proever.json).
const PROEVER = [
  'Bromsarna låter när jag backar',
  'Nødbremsning i bakgear',
  'Bilen startar inte alltid och det blir svart',
  'Bilen starter ikke og skal genstartes hvis den har stået ude',
  'The car does not start when it is cold and the screen is black',
  'OTA 3.0.3 ACC',
  '',
  'og och',
  'NÖDBROMSNING VID BACKNING',
  'ÆBLE',
  'ADAS afbryder ved kraftig regn.',
  'Fartpilot och ACC',
  'the and och och',
];
fs.writeFileSync(
  path.join(os.tmpdir(), 'zg-u3b-proever.json'),
  JSON.stringify(PROEVER.map((t) => ({ tekst: t, forventet: ks.kildesprogAf(t) }))),
);

// ===========================================================================
// 2) Rapport-routing pr. kildesprog
// ===========================================================================
function nulstil() {
  kald.length = 0;
  stub.upserts.length = 0;
}
const tr = () => kald.filter((k) => k.vej === 'translate');
const retninger = () => tr().map((k) => `${k.kilde}>${k.maal}`);
const basis = {
  type: 'fejl', severity: 'middel', status: 'ny', software_version: null, phone_model: null,
  phone_os: null, created_at: '2026-11-27', modeller: 'Zeekr 7GT', stemmer: 1, antal_svar: 0,
  sidst_sendt_stemmer: null, sidst_sendt_dato: null, variant_fordeling: [], category: null,
};
const DA = { ...basis, id: 'da1', sprog: 'da', title: 'Fartpilot slår fra', description: 'Fartpiloten slår fra efter 3.0.3.' };
const SV = { ...basis, id: 'sv1', sprog: 'sv', title: 'Farthållaren stängs av', description: 'ACC stängs av efter uppdateringen till 3.0.3.' };
const EN = { ...basis, id: 'en1', sprog: 'en', title: 'Cruise control turns off', description: 'ACC turns off after 3.0.3.' };

// FØR (gammel vej): svensk tekst sendt gennem rapportens DA-sti.
nulstil();
await ov.oversaetFraKilde([SV.description], 'da', 'en');
lig('FØR: svensk tekst gennem da-stien -> source=da', retninger(), ['da>en']);

// EFTER: engelsk rapport.
nulstil();
const enR = await ov.oversaetFejl([DA, SV, EN], 'en');
lig('en-rapport: da-melding via da>en, sv-melding via sv>en, en-melding ikke sendt',
  [...new Set(retninger())].sort(), ['da>en', 'sv>en']);
sand('en-rapport: da-titel fik ordlistens "cruise control"', enR[0].title.toLowerCase().includes('cruise control'));
lig('en-rapport: en-original uoversat', [enR[2].title, enR[2].description], [EN.title, EN.description]);
sand('en-rapport: sv-melding oversat (stub-markør)', enR[1].description.startsWith('<<sv>en>>'));
sand('en-rapport: ACC + 3.0.3 bevaret i sv->en', enR[1].description.includes('ACC') && enR[1].description.includes('3.0.3'));
const svTekster = tr().filter((k) => k.kilde === 'sv').flatMap((k) => k.q);
sand('sv->en: ingen dansk ordliste - kun BEVAR-tokens ([[0]],[[1]]) i motor-input',
  svTekster.every((t) => !/\[\[[2-9]\]\]/.test(t)) && svTekster.some((t) => t.includes('[[0]]')));
sand('sv->en: svenske ord når motoren urørt', svTekster.some((t) => t.includes('stängs av')));
lig('en-rapport: kun de to oversatte caches (en-original caches ikke)',
  stub.upserts.flatMap((u) => u.rows.map((r) => r.issue_id)).sort(), ['da1', 'sv1']);

// Svensk rapport.
nulstil();
const svR = await ov.oversaetFejl([DA, SV, EN], 'sv');
lig('sv-rapport: svensk original vist UOVERSAT', [svR[1].title, svR[1].description], [SV.title, SV.description]);
lig('sv-rapport: sv-melding aldrig sendt til motoren', tr().some((k) => k.kilde === 'sv'), false);
lig('sv-rapport: da via da>en>sv-pivot, en direkte en>sv',
  [...new Set(retninger())].sort(), ['da>en', 'en>sv']);
sand('sv-rapport: en-melding oversat en>sv', svR[2].description.startsWith('<<en>sv>>'));

// Dansk rapport: alt original, intet kald.
nulstil();
const daR = await ov.oversaetFejl([DA, SV, EN], 'da');
lig('da-rapport: ingen motor-kald', tr().length, 0);
lig('da-rapport: originaler', daR.map((f) => f.title), [DA.title, SV.title, EN.title]);

// Cache-nøglen indeholder kildesproget (rettet sprog -> cache-miss).
nulstil();
await ov.oversaetFejl([{ ...SV, sprog: 'da' }], 'en');
const hashDa = stub.upserts[0]?.rows[0]?.kilde_hash;
nulstil();
await ov.oversaetFejl([SV], 'en');
const hashSv = stub.upserts[0]?.rows[0]?.kilde_hash;
sand('cache-hash afhænger af kildesproget', hashDa && hashSv && hashDa !== hashSv);

// Kommentarer: kildesprog pr. kommentar (heuristik).
nulstil();
const komm = await ov.oversaetKommentarer(
  [
    { id: 'k1', tekst: 'Samma här, bromsarna låser.' },
    { id: 'k2', tekst: 'Det samme sker for mig efter opdateringen.' },
    { id: 'k3', tekst: 'Same here, it happens every morning.' },
  ],
  'en',
);
lig('kommentarer en: sv>en + da>en, engelsk urørt', [...new Set(retninger())].sort(), ['da>en', 'sv>en']);
lig('kommentarer en: engelsk original', komm[2], 'Same here, it happens every morning.');
nulstil();
const kommSv = await ov.oversaetKommentarer([{ id: 'k1', tekst: 'Samma här, bromsarna låser.' }], 'sv');
lig('kommentarer sv: svensk original uoversat', kommSv[0], 'Samma här, bromsarna låser.');
lig('kommentarer sv: intet kald', tr().length, 0);

// oversaetFraKilde: alle retninger.
for (const [k, m, forv] of [
  ['da', 'da', []], ['sv', 'sv', []], ['da', 'en', ['da>en']], ['da', 'sv', ['da>en', 'en>sv']],
  ['en', 'sv', ['en>sv']], ['sv', 'en', ['sv>en']], ['sv', 'da', ['sv>da']], ['en', 'da', ['en>da']],
]) {
  nulstil();
  const r = await ov.oversaetFraKilde(['Testtekst her.'], k, m);
  lig(`oversaetFraKilde ${k}->${m} retninger`, [...new Set(retninger())], forv);
  if (k === m) lig(`oversaetFraKilde ${k}->${m} = original`, r, ['Testtekst her.']);
}

// Sprog-løs-værn gælder også de nye stier (ingen "PACKAGE LEAFLET").
nulstil();
await ov.oversaetFraKilde(['Bromsarna låser. 🚗'], 'sv', 'en');
lig('sv->en: emoji-stump sendes ikke til motoren', tr().flatMap((k) => k.q).includes('🚗'), false);

// LT /detect-wrapperen.
detektSvar = [{ language: 'sv', confidence: 81 }];
lig('ltDetekt -> sv', await ov.ltDetekt('Bilen startar'), { sprog: 'sv', raa: 'sv (81)' });
detektSvar = [{ language: 'nb', confidence: 60 }];
lig('ltDetekt nb -> da', (await ov.ltDetekt('Bilen starter')).sprog, 'da');

// ===========================================================================
// 3) Titel-cache + søge-match på tværs af sprog
// ===========================================================================
const noegle = (t) => `H:${t}`;
const kilder = [
  { id: 'a', title: 'Nødbremsning i bakgear', sprog: 'da' },
  { id: 'b', title: 'Bromsarna låser', sprog: 'sv' },
];
const c1 = tk.anvendTitelCache(kilder, [], noegle);
lig('tom cache: 2 mål pr. melding mangler', c1.mangler.map((m) => `${m.id}:${m.maal}`), ['a:sv', 'a:en', 'b:da', 'b:en']);
const c2 = tk.anvendTitelCache(
  kilder,
  [
    { issue_id: 'a', sprog: 'sv', kilde_hash: noegle('da\nNødbremsning i bakgear'), titel: 'Nödbromsning i backväxel' },
    { issue_id: 'a', sprog: 'en', kilde_hash: 'forældet', titel: 'Old' },
  ],
  noegle,
);
lig('cache-hit bruges, forældet hash = miss', [c2.titler.get('a'), c2.mangler.map((m) => `${m.id}:${m.maal}`)], [
  { sv: 'Nödbromsning i backväxel' },
  ['a:en', 'b:da', 'b:en'],
]);
lig('klumper grupperes pr. kilde>mål', tk.klumpOpgaver(c1.mangler, 10).map((k) => k.map((o) => `${o.kilde}>${o.maal}`)), [
  ['da>sv'], ['da>en'], ['sv>da'], ['sv>en'],
]);
const kl = await tk.oversaetKlump(c1.mangler.slice(0, 1), async (t, k, m) => t.map((x) => `${k}>${m}:${x}`));
lig('oversaetKlump -> cache-række', kl, [{ issue_id: 'a', sprog: 'sv', kilde_hash: noegle('da\nNødbremsning i bakgear'), titel: 'da>sv:Nødbremsning i bakgear' }]);
lig('oversaetKlump: punktum fra rensningen fjernes på titel uden punktum',
  (await tk.oversaetKlump(c1.mangler.slice(0, 1), async () => ['Emergency braking in reverse gear.']))[0].titel,
  'Emergency braking in reverse gear');
lig('oversaetKlump: tomt resultat caches ikke', await tk.oversaetKlump(c1.mangler.slice(0, 1), async () => ['  ']), []);

const daMelding = { title: 'Nødbremsning i bakgear', description: 'Bilen bremser hårdt når jeg bakker.', titler: {} };
const daMeldingOversat = { ...daMelding, titler: { sv: 'Nödbromsning i backväxel', en: 'Emergency braking in reverse gear' } };
const ord = (q) => tk.soegeOrd(q);
lig('stamme: bromsar -> broms', tk.soegeStamme('bromsar'), 'broms');
lig('stamme: bremser -> brems', tk.soegeStamme('bremser'), 'brems');
lig('stamme: kort ord urørt (acc)', tk.soegeStamme('acc'), 'acc');
lig('FØR: svensk søgning "bromsar" finder IKKE dansk melding uden oversættelse', tk.soegeTraef(daMelding, [], ord('bromsar')), 0);
lig('EFTER: "bromsar" finder dansk melding via sv-titel', tk.soegeTraef(daMeldingOversat, [], ord('bromsar')), 1);
lig('EFTER: "backväxel" finder den', tk.soegeTraef(daMeldingOversat, [], ord('backväxel')), 1);
lig('EFTER: engelsk "braking reverse" finder den', tk.soegeTraef(daMeldingOversat, [], ord('braking reverse')), 2);
lig('dansk søgning finder stadig dansk original', tk.soegeTraef(daMeldingOversat, [], ord('nødbremsning')), 1);
const svMelding = { title: 'Bromsarna låser', description: 'Bilen tvärbromsar.', titler: { da: 'Bremserne låser', en: 'The brakes lock' } };
lig('dansk "bremser" finder svensk melding via da-titel', tk.soegeTraef(svMelding, [], ord('bremser')), 1);
lig('kategori-label på læserens sprog tæller med', tk.soegeTraef(daMelding, ['Körning, bromsar & chassi'], ord('chassi')), 1);
lig('intet match -> 0', tk.soegeTraef(daMeldingOversat, [], ord('opladning')), 0);
lig('titelPaaSprog: sv-læser af dansk melding', tk.titelPaaSprog({ ...daMeldingOversat, sprog: 'da' }, 'sv'), 'Nödbromsning i backväxel');
lig('titelPaaSprog: samme sprog -> null', tk.titelPaaSprog({ ...daMeldingOversat, sprog: 'da' }, 'da'), null);
lig('titelPaaSprog: ingen oversættelse endnu -> null', tk.titelPaaSprog({ ...daMelding, sprog: 'da' }, 'en'), null);

server.close();
console.log(`\n${ok}/${ok + fejl} assertioner grønne.`);
process.exit(fejl > 0 ? 1 : 0);
