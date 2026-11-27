#!/usr/bin/env node
// UI-i18n: enhedstests af sprog-opløsningen + ordbogs-fuldstændighed.
// Kør: node scripts/i18n-test.mjs
//
// Transpilerer lib/i18n/{sprog,da,sv,en}.ts i hukommelsen (typescript er en
// dev-afhængighed) til en midlertidig mappe og importerer dem - ingen ekstra
// test-afhængigheder. Exit-kode 1 ved første fejl-sum > 0.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const ROD = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'zg-i18n-'));

for (const navn of ['sprog', 'da', 'sv', 'en']) {
  const kilde = fs.readFileSync(path.join(ROD, 'lib/i18n', `${navn}.ts`), 'utf8');
  const ud = ts.transpileModule(kilde, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText.replace(/from '\.\/(\w+)'/g, "from './$1.mjs'");
  fs.writeFileSync(path.join(TMP, `${navn}.mjs`), ud);
}

const sprog = await import(path.join(TMP, 'sprog.mjs'));
const { da } = await import(path.join(TMP, 'da.mjs'));
const { sv } = await import(path.join(TMP, 'sv.mjs'));
const { en } = await import(path.join(TMP, 'en.mjs'));

let ok = 0;
let fejl = 0;
function lig(navn, faktisk, forventet) {
  const a = JSON.stringify(faktisk);
  const b = JSON.stringify(forventet);
  if (a === b) ok++;
  else {
    fejl++;
    console.log(`FEJL  ${navn}: fik ${a}, forventede ${b}`);
  }
}

// --- Accept-Language -> UI-sprog ---
const H = sprog.uiSprogFraHeader;
lig('header tom', H(''), 'da');
lig('header null', H(null), 'da');
lig('header undefined', H(undefined), 'da');
lig('header kun *', H('*'), 'da');
lig('header da', H('da'), 'da');
lig('header da-DK med q', H('da-DK,da;q=0.9,en;q=0.8'), 'da');
lig('header sv-SE', H('sv-SE,sv;q=0.9,en-US;q=0.8'), 'sv');
lig('header sv-FI', H('sv-FI'), 'sv');
lig('header en-US', H('en-US,en;q=0.9'), 'en');
lig('header nb-NO -> en', H('nb-NO,nb;q=0.9,no;q=0.8,nn;q=0.7,en;q=0.5'), 'en');
lig('header nn -> en', H('nn'), 'en');
lig('header no -> en', H('no'), 'en');
lig('header de -> en', H('de-DE,de;q=0.9'), 'en');
lig('header fi -> en', H('fi'), 'en');
lig('header store bogstaver', H('SV-se'), 'sv');
lig('header mellemrum', H('  da ; q=1 , en'), 'da');
lig('header q-orden vinder over position', H('en;q=0.5,sv;q=0.9'), 'sv');
lig('header lige q: første vinder', H('sv,da'), 'sv');
lig('header q=0 springes over', H('sv;q=0,en'), 'en');
lig('header ugyldig q', H('sv;q=abc,da'), 'da');

// --- Opløsning: profil > cookie > header > da ---
const O = sprog.oploesSprog;
lig('profil vinder over cookie+header', O({ profil: 'sv', cookie: 'en', header: 'da' }), 'sv');
lig('cookie vinder over header', O({ profil: null, cookie: 'en', header: 'sv-SE' }), 'en');
lig('header når ingen profil/cookie', O({ profil: null, cookie: null, header: 'sv-SE' }), 'sv');
lig('fallback da', O({}), 'da');
lig('ugyldig profil ignoreres', O({ profil: 'nb', cookie: 'sv', header: 'en' }), 'sv');
lig('ugyldig cookie ignoreres', O({ cookie: 'xx', header: 'sv' }), 'sv');
lig('manipuleret cookie ignoreres', O({ cookie: "da'; drop", header: '' }), 'da');
lig('tom header -> da selv med ugyldig cookie', O({ cookie: '', header: '' }), 'da');
lig('profil da slår cookie sv', O({ profil: 'da', cookie: 'sv' }), 'da');
lig('nordmand uden valg -> en', O({ header: 'nb-NO' }), 'en');
lig('nordmand der har valgt dansk', O({ cookie: 'da', header: 'nb-NO' }), 'da');

// --- erUiSprog ---
lig('erUiSprog da', sprog.erUiSprog('da'), true);
lig('erUiSprog nb', sprog.erUiSprog('nb'), false);
lig('erUiSprog tal', sprog.erUiSprog(1), false);

// --- Login-synk-plan ---
const S = sprog.synkPlan;
lig('synk: profil sat, cookie anden -> cookie følger profil',
  S({ profil: 'sv', cookie: 'da', metadata: 'sv' }), { saetCookie: 'sv', saetProfil: null, saetMetadata: null });
lig('synk: profil sat, alt enigt -> intet',
  S({ profil: 'en', cookie: 'en', metadata: 'en' }), { saetCookie: null, saetProfil: null, saetMetadata: null });
lig('synk: profil sat, metadata mangler -> metadata følger',
  S({ profil: 'sv', cookie: 'sv', metadata: null }), { saetCookie: null, saetProfil: null, saetMetadata: 'sv' });
lig('synk: tom profil, cookie -> profil (første gang)',
  S({ profil: null, cookie: 'sv', metadata: null }), { saetCookie: null, saetProfil: 'sv', saetMetadata: 'sv' });
lig('synk: tom profil, ingen cookie, signup-metadata -> profil + cookie',
  S({ profil: null, cookie: null, metadata: 'en' }), { saetCookie: 'en', saetProfil: 'en', saetMetadata: null });
lig('synk: tom profil, cookie vinder over metadata',
  S({ profil: null, cookie: 'da', metadata: 'sv' }), { saetCookie: null, saetProfil: 'da', saetMetadata: 'da' });
lig('synk: intet kendt -> intet',
  S({ profil: null, cookie: null, metadata: null }), { saetCookie: null, saetProfil: null, saetMetadata: null });
lig('synk: ugyldig cookie ignoreres',
  S({ profil: null, cookie: 'nb', metadata: 'sv' }), { saetCookie: 'sv', saetProfil: 'sv', saetMetadata: null });

// --- Ordbøger: samme nøgler + samme form (streng/funktion) i alle tre ---
function form(o, sti = '') {
  const ud = {};
  for (const [k, v] of Object.entries(o)) {
    const s = sti ? `${sti}.${k}` : k;
    if (v && typeof v === 'object') Object.assign(ud, form(v, s));
    else ud[s] = typeof v;
  }
  return ud;
}
const fDa = form(da);
for (const [navn, o] of [['sv', sv], ['en', en]]) {
  const f = form(o);
  const mangler = Object.keys(fDa).filter((k) => !(k in f));
  const overskud = Object.keys(f).filter((k) => !(k in fDa));
  const typeForskel = Object.keys(fDa).filter((k) => k in f && f[k] !== fDa[k]);
  lig(`${navn}: ingen manglende nøgler`, mangler, []);
  lig(`${navn}: ingen overskydende nøgler`, overskud, []);
  lig(`${navn}: samme form`, typeForskel, []);
}

// --- Ingen lange tankestreger (U+2013/U+2014) i nogen tekst, heller ikke i funktioner ---
function alleTekster(o, ud = []) {
  for (const v of Object.values(o)) {
    if (typeof v === 'string') ud.push(v);
    else if (typeof v === 'function') ud.push(String(v(2, 'X')), String(v(1, 'X')));
    else if (v && typeof v === 'object') alleTekster(v, ud);
  }
  return ud;
}
for (const [navn, o] of [['da', da], ['sv', sv], ['en', en]]) {
  const med = alleTekster(o).filter((t) => /[\u2013\u2014]/.test(t));
  lig(`${navn}: ingen lange tankestreger`, med, []);
  const tomme = alleTekster(o).filter((t) => !t.trim());
  lig(`${navn}: ingen tomme tekster`, tomme, []);
}

// --- Flertal ---
lig('da flertal 1', da.software.aendringer(1), '1 ændring');
lig('da flertal 2', da.software.aendringer(2), '2 ændringer');
lig('sv flertal 1', sv.tid.uger(1), '1 vecka sedan');
lig('en flertal 3', en.tid.uger(3), '3 weeks ago');
lig('en aabneRapporter 1', en.nav.aabneRapporter(1), '1 open forum report');

// --- U1b: DB-indhold (lib/i18n/indhold.ts + lib/links-oversaettelser.ts) ---
function transpiler(rel, navn) {
  const kilde = fs.readFileSync(path.join(ROD, rel), 'utf8');
  const ud = ts.transpileModule(kilde, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  fs.writeFileSync(path.join(TMP, `${navn}.mjs`), ud);
  return import(path.join(TMP, `${navn}.mjs`));
}
const ind = await transpiler('lib/i18n/indhold.ts', 'indhold');
const lo = await transpiler('lib/links-oversaettelser.ts', 'links-ov');
const ok_ = await transpiler('lib/ota-oversaet-kerne.ts', 'ota-kerne');

const R = ind.rensOversaettelser;
lig('rens null', R(null, ['navn']), {});
lig('rens streng', R('x', ['navn']), {});
lig('rens array', R([1], ['navn']), {});
lig('rens ukendt sprog/felt ud', R({ de: { navn: 'X' }, sv: { navn: ' Ja ', url: 'u' } }, ['navn']), { sv: { navn: 'Ja' } });
lig('rens tomt felt droppes, tomt sprog ud', R({ sv: { navn: '   ' }, en: { navn: 'Hi' } }, ['navn']), { en: { navn: 'Hi' } });
lig('rens ikke-streng droppes', R({ sv: { navn: 5, kilde: 'k' } }, ['navn', 'kilde']), { sv: { kilde: 'k' } });
lig('rens cap 300', R({ en: { navn: 'a'.repeat(400) } }, ['navn']).en.navn.length, 300);

const F = ind.oversatFelt;
const ov = { sv: { navn: 'Pris & info' }, en: { navn: 'Price & info' } };
lig('felt da -> dansk', F('Pris & info', ov, 'da', 'navn'), 'Pris & info');
lig('felt en', F('Pris & info', ov, 'en', 'navn'), 'Price & info');
lig('felt sv', F('Pris & info', ov, 'sv', 'navn'), 'Pris & info');
lig('felt mangler -> dansk', F('Fælge & dæk', {}, 'en', 'navn'), 'Fælge & dæk');
lig('felt tomt -> dansk', F('Fælge & dæk', { en: { navn: '  ' } }, 'en', 'navn'), 'Fælge & dæk');
lig('felt null dansk -> null', F(null, { en: { kilde: 'x' } }, 'en', 'kilde'), null);
lig('felt ov null -> dansk', F('A', null, 'sv', 'navn'), 'A');

lig('link ov navn+kilde', lo.linkOversaettelser('Fællesskab & erfaringer', 'Facebook-gruppe'),
  { sv: { navn: 'Gemenskap & erfarenheter', kilde: 'Facebook-grupp' }, en: { navn: 'Community & experiences', kilde: 'Facebook group' } });
lig('link ov domæne-kilde urørt', lo.linkOversaettelser('Pris & info', 'viabiler.dk'),
  { sv: { navn: 'Pris & info' }, en: { navn: 'Price & info' } });
lig('link ov ukendt', lo.linkOversaettelser('Noget nyt', 'x.dk'), {});
lig('gruppe ov', lo.gruppeOversaettelser('Tilbehør & dele'), { sv: { titel: 'Tillbehör & delar' }, en: { titel: 'Accessories & parts' } });
lig('gruppe ov ukendt', lo.gruppeOversaettelser('Leasing'), {});

// Kode-fallback og migrationens seed er SAMME tabel (hver triple står i SQL'en).
const SQL = fs.readFileSync(path.join(ROD, 'supabase/migrations/20261127130000_u1b_links_ota_i18n.sql'), 'utf8');
const sqlStr = (x) => `'${x.replace(/'/g, "''")}'`;
const manglerISql = [];
for (const tabel of [lo.GRUPPE_TITLER, lo.LINK_NAVNE, lo.LINK_KILDER]) {
  for (const [daT, { sv: s, en: e }] of Object.entries(tabel)) {
    const re = new RegExp(`\\(${[daT, s, e].map(sqlStr).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(',\\s*')}\\)`);
    if (!re.test(SQL)) manglerISql.push(daT);
  }
}
lig('seed i migration == kode-tabel', manglerISql, []);
// Antal VALUES-rækker i seed == antal i kode-tabellen (ingen ekstra i SQL'en).
lig('seed antal', (SQL.match(/^\s+\('[^']*(?:''[^']*)*',\s+'/gm) ?? []).length,
  Object.keys(lo.GRUPPE_TITLER).length + Object.keys(lo.LINK_NAVNE).length + Object.keys(lo.LINK_KILDER).length);
for (const [navn, tabel] of [['grupper', lo.GRUPPE_TITLER], ['navne', lo.LINK_NAVNE], ['kilder', lo.LINK_KILDER]]) {
  const tekster = Object.entries(tabel).flatMap(([d, p]) => [d, p.sv, p.en]);
  lig(`links ${navn}: ingen lange tankestreger`, tekster.filter((t) => /[–—]/.test(t)), []);
}

// --- U1b: OTA-kerne (stub-motor + stub-cache) ---
lig('spejl: intet punktum i kilde', ok_.spejlSlut('Rulles ud gradvis', 'Rolled out gradually.'), 'Rolled out gradually');
lig('spejl: punktum i kilde bevares', ok_.spejlSlut('Bedre ACC.', 'Better ACC.'), 'Better ACC.');
lig('spejl: ellipse urørt', ok_.spejlSlut('Mere', 'More...'), 'More...');
lig('spejl: trim', ok_.spejlSlut('  A ', ' B. '), 'B');

function stubDeps({ cache = [], fejl = false, taber = false } = {}) {
  const skrevet = [];
  const kald = [];
  return {
    skrevet, kald,
    deps: {
      noegle: (s) => 'H:' + s,
      hentCache: async () => cache,
      skrivCache: async (r) => { skrevet.push(...r); },
      oversaet: async (t) => {
        kald.push(t);
        if (fejl) throw new Error('LT nede');
        const ud = t.map((x) => 'EN<' + x + '>.');
        if (taber) ud[0] = '';
        return ud;
      },
      maksNye: 2,
    },
  };
}
const K = [
  { id: 'a', punkter: ['Et.', 'To'], note: 'Rulles ud' },
  { id: 'b', punkter: ['Tre'], note: null },
  { id: 'c', punkter: ['Fire'], note: null },
];
{
  const s = stubDeps();
  const r = await ok_.oversaetOtaKerne(K, s.deps);
  lig('ota: ét motor-kald', s.kald.length, 1);
  lig('ota: maksNye respekteret (a+b, ikke c)', [...r.keys()], ['a', 'b']);
  lig('ota: flad rækkefølge punkter+note', s.kald[0], ['Et.', 'To', 'Rulles ud', 'Tre']);
  lig('ota: a oversat + spejlet slut', r.get('a'), { punkter: ['EN<Et.>.', 'EN<To>'], note: 'EN<Rulles ud>' });
  lig('ota: b uden note', r.get('b'), { punkter: ['EN<Tre>'], note: null });
  lig('ota: cachet a+b', s.skrevet.map((x) => x.update_id), ['a', 'b']);
  lig('ota: hash = noegle(kildeTekst)', s.skrevet[1].kilde_hash, 'H:' + ok_.otaKildeTekst(K[1]));
}
{
  const hashA = 'H:' + ok_.otaKildeTekst(K[0]);
  const s = stubDeps({ cache: [
    { update_id: 'a', kilde_hash: hashA, punkter: ['X', 'Y'], note: 'N' },
    { update_id: 'b', kilde_hash: 'forældet', punkter: ['gammel'], note: null },
  ] });
  const r = await ok_.oversaetOtaKerne(K, s.deps);
  lig('ota cache: hit serveres', r.get('a'), { punkter: ['X', 'Y'], note: 'N' });
  lig('ota cache: hash-mismatch gen-oversættes', r.get('b'), { punkter: ['EN<Tre>'], note: null });
  lig('ota cache: kun miss sendt', s.kald[0], ['Tre', 'Fire']);
}
{
  const hashA = 'H:' + ok_.otaKildeTekst(K[0]);
  const s = stubDeps({ cache: [{ update_id: 'a', kilde_hash: hashA, punkter: ['kun én'], note: null }] });
  const r = await ok_.oversaetOtaKerne([K[0]], s.deps);
  lig('ota cache: forkert antal punkter = miss', r.get('a').punkter, ['EN<Et.>.', 'EN<To>']);
}
{
  const s = stubDeps({ fejl: true });
  const r = await ok_.oversaetOtaKerne(K, s.deps);
  lig('ota: motor nede -> intet (original vises)', r.size, 0);
  lig('ota: motor nede -> intet cachet', s.skrevet.length, 0);
}
{
  const s = stubDeps({ taber: true });
  const r = await ok_.oversaetOtaKerne(K, s.deps);
  lig('ota: tabt punkt -> det opslag vises på dansk', r.has('a'), false);
  lig('ota: tabt punkt -> andre opslag fine', r.has('b'), true);
  lig('ota: tabt punkt -> ikke cachet', s.skrevet.map((x) => x.update_id), ['b']);
}
{
  const s = stubDeps();
  s.deps.hentCache = async () => { throw new Error('tabel mangler'); };
  s.deps.skrivCache = async () => { throw new Error('tabel mangler'); };
  const r = await ok_.oversaetOtaKerne([K[1]], s.deps);
  lig('ota: cache-fejl (før migration) crasher ikke', r.get('b'), { punkter: ['EN<Tre>'], note: null });
}
{
  const s = stubDeps();
  const r = await ok_.oversaetOtaKerne([{ id: 'tom', punkter: [], note: '  ' }], s.deps);
  lig('ota: tomt opslag -> intet kald', [r.size, s.kald.length], [0, 0]);
}

{
  const s = stubDeps();
  s.deps.maksNye = 0;
  const hashB = 'H:' + ok_.otaKildeTekst(K[1]);
  s.deps.hentCache = async () => [{ update_id: 'b', kilde_hash: hashB, punkter: ['B!'], note: null }];
  const r = await ok_.oversaetOtaKerne(K, s.deps);
  lig('ota: maksNye 0 = kun cache, intet motorkald', [s.kald.length, [...r.keys()]], [0, ['b']]);
}

// --- U1b live-runde: token-fletning + skade-værn (lib/rapport-ordliste.ts) ---
const ro = await transpiler('lib/rapport-ordliste.ts', 'rapport-ordliste');
const bt = (t) => ro.beskytTermer(t);
lig('flet parentes', bt('Kørselsopsætning (Drive Setup):').tekst, 'Kørselsopsætning [[0]]:');
lig('flet parentes erstatning', bt('Kørselsopsætning (Drive Setup):').erstatninger, ['(Drive Setup)']);
lig('flet anførselstegn', bt('hvis "Adapt to Route Ahead" står på "Off".').tekst, 'hvis [[0]] står på [[1]].');
lig('flet skråstreg', bt('når ACC/LCC er aktiv').erstatninger.filter(Boolean), ['ACC/LCC']);
lig('flet ikke uparret', bt('(ACC og LCC)').tekst, '([[0]] og [[1]])');
lig('genindsæt flettet', ro.genindsaetTermer('Driving setup [[0]]:', ['(Drive Setup)']), 'Driving setup (Drive Setup):');
lig('bestemt form -> the', bt('knap på rattet').erstatninger, ['the steering wheel']);
lig('the the ryddes', ro.samlOversatteSaetninger(['on the [[0]].'], { dele: [{ tekst: '', erstatninger: ['the steering wheel'] }], skilletegn: [] }), 'on the steering wheel.');
lig('skadet: klamme-rest', ro.erTokenSkadet('ACC / [[2] är aktiv', ['ACC', 'LCC']), true);
lig('skadet: erstatning mangler', ro.erTokenSkadet('Bättre beteende', ['ACC/LCC']), true);
lig('skadet: rent', ro.erTokenSkadet('Bättre ACC/LCC-beteende', ['ACC/LCC', '']), false);
lig('pivot bevar flettet', ro.beskytBevar('Adds Remote Park Assist (RPA) and "Off".').erstatninger, ['Remote Park Assist', '(RPA)', '"Off"']);

// --- U1b: svenske fagtermer på pivoten (EN_SV) ---
const bs = (t) => ro.beskytTilSvensk(t);
lig('sv: term + sætningsstart', bs('Fine-tuned speed adaptation in curves.').erstatninger, ['hastighetsanpassning i kurvor', 'Finjusterad']);
lig('sv: bestemt form først', bs('a button of the steering wheel').erstatninger, ['ratten']);
lig('sv: indeholder bevar-ord', bs('Drive Setup shortcut: Quick menu').erstatninger, ['Drive Setup-genväg', 'Snabbmeny']);
lig('sv: bevar stadig', bs('ACC on Zeekr OS 3.0.4').erstatninger.sort(), ['3.0.4', 'ACC', 'OS', 'Zeekr'].sort());
lig('sv: generiske ord urørt', bs('A wide range of options for the cabin.').erstatninger, []);
lig('sv: ingen lange tankestreger', Object.values(ro.EN_SV).filter((t) => /[\u2013\u2014]/.test(t)), []);

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\n${ok}/${ok + fejl} assertioner grønne.`);
process.exit(fejl ? 1 : 0);
