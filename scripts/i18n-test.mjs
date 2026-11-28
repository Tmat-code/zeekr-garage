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
lig('sv: bevar-funktionsnavn vinder over kort term', bs('turns off in Car Wash Mode and the car wash').erstatninger, ['Car Wash Mode', 'biltvätt']);
lig('sv: term med bevar-ord først', bs('Use the Zeekr app').erstatninger, ['Zeekr-appen']);
lig('sv: generiske ord urørt', bs('A wide range of options for the cabin.').erstatninger, []);
lig('sv: ingen lange tankestreger', Object.values(ro.EN_SV).filter((t) => /[\u2013\u2014]/.test(t)), []);

fs.rmSync(TMP, { recursive: true, force: true });
// --- U2: forum-UI ---
lig('U2 da svar-label', da.forum.svarLabel(2), 'svar');
lig('U2 en svar-label 1/2', [en.forum.svarLabel(1), en.forum.svarLabel(2)], ['reply', 'replies']);
lig('U2 en visSvar 1', en.forum.visSvar(1), '▸ Show 1 reply');
lig('U2 sv traadMeta', sv.forum.traadMeta('1 dec. 2026', 3, 1), 'Skapad 1 dec. 2026 · 3 svar · 1 visning');
lig('U2 en traadMeta', en.forum.traadMeta('1 Dec 2026', 1, 5), 'Created 1 Dec 2026 · 1 reply · 5 views');
lig('U2 da traadMeta', da.forum.traadMeta('1. dec. 2026', 2, 7), 'Oprettet 1. dec. 2026 · 2 svar · 7 visninger');
lig('U2 en antalMatcher 1', en.forum.antalMatcher(1), '1 thread matches');
lig('U2 sv tråde', [sv.forum.traadeLabel(1), sv.forum.traadeLabel(4)], ['tråd', 'trådar']);
lig('U2 billed-tæller', sv.billeder.taeller(2, 5), '2/5 · max 5 MB');
lig('U2 galleri aria', en.billeder.aabn(2, 'Image in post'), 'Open image in post 2');
lig('U2 profilbillede uden navn', [da.billeder.profilbillede(null), en.billeder.profilbillede('Ida')], ['Profilbillede', "Ida's profile picture"]);
{
  // Grund-nøglerne skal være præcis DB-enum'en i lib/moderering.ts.
  const mod = fs.readFileSync(path.join(ROD, 'lib/moderering.ts'), 'utf8');
  const enumV = [...mod.match(/const VAERDIER = \[([^\]]+)\]/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  for (const [navn, o] of [['da', da], ['sv', sv], ['en', en]]) {
    lig(`U2 ${navn}: modGrund == DB-enum`, Object.keys(o.modGrund).sort(), [...enumV].sort());
  }
  // Gruppe-undertekster er keyet på de seedede danske gruppenavne.
  for (const g of ['Velkommen', 'Modellerne', 'Ejer-lounge', 'Teknik']) {
    lig(`U2 gruppeTekst '${g}' på alle sprog`, [da, sv, en].every((o) => !!o.forum.gruppeTekst[g]), true);
  }
}

// --- U4: konto ---
{
  const kilde = fs.readFileSync(path.join(ROD, 'lib/gotrue-fejl.ts'), 'utf8');
  const fil = path.join(os.tmpdir(), `zg-gotrue-${process.pid}.mjs`);
  fs.writeFileSync(
    fil,
    ts.transpileModule(kilde, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText,
  );
  const { gotrueFejl: G } = await import(fil);
  fs.rmSync(fil, { force: true });
  // Rigtige GoTrue-svar (beskeder + koder), som supabase-js afleverer dem.
  lig('U4 gotrue: forkert login (besked)', G({ message: 'Invalid login credentials' }), 'forkertLogin');
  lig('U4 gotrue: forkert login (kode)', G({ code: 'invalid_credentials', message: 'x' }), 'forkertLogin');
  lig('U4 gotrue: ikke bekræftet', G({ message: 'Email not confirmed' }), 'ikkeBekraeftet');
  lig('U4 gotrue: findes (signup)', G({ message: 'User already registered' }), 'findesAllerede');
  lig('U4 gotrue: findes (kode)', G({ code: 'user_already_exists' }), 'findesAllerede');
  lig('U4 gotrue: findes (mail-skift)', G({ message: 'A user with this email address has already been registered' }), 'findesAllerede');
  lig('U4 gotrue: svag (længde)', G({ message: 'Password should be at least 6 characters.' }), 'svagKode');
  lig('U4 gotrue: svag (HIBP)', G({ message: 'Password is known to be weak and easy to guess, please choose a different one.' }), 'svagKode');
  lig('U4 gotrue: svag (tegn)', G({ message: 'Password should contain at least one character of each: abc, ABC, 123' }), 'svagKode');
  lig('U4 gotrue: svag (kode)', G({ code: 'weak_password', message: '' }), 'svagKode');
  lig('U4 gotrue: rate limit', G({ message: 'Email rate limit exceeded' }), 'forMange');
  lig('U4 gotrue: for security purposes', G({ message: 'For security purposes, you can only request this after 42 seconds.' }), 'forMange');
  lig('U4 gotrue: ugyldig mail', G({ message: 'Unable to validate email address: invalid format' }), 'mailUgyldig');
  lig('U4 gotrue: signup lukket', G({ message: 'Signups not allowed for this instance' }), 'opretLukket');
  lig('U4 gotrue: samme password', G({ message: 'New password should be different from the old password.' }), 'sammeKode');
  lig('U4 gotrue: samme mail', G({ message: 'New email address should be different from the current email address' }), 'sammeMail');
  lig('U4 gotrue: udløbet link', G({ code: 'otp_expired', message: 'Email link is invalid or has expired' }), 'linkUdloebet');
  lig('U4 gotrue: ukendt -> null', G({ message: 'Database error saving new user' }), null);
  lig('U4 gotrue: tom -> null', [G(null), G(undefined), G({})], [null, null, null]);
  // Hver nøgle gotrueFejl kan returnere findes på alle sprog.
  const noegler = [...kilde.matchAll(/^\s*\| '(\w+)'/gm)].map((m) => m[1]);
  lig('U4 gotrue-nøgler == ordbogens', Object.keys(da.konto.gotrue).sort(), [...noegler].sort());
  for (const [navn, o] of [['sv', sv], ['en', en]]) {
    lig(`U4 ${navn}: gotrue-nøgler`, Object.keys(o.konto.gotrue).sort(), [...noegler].sort());
  }
  // /login?fejl=-koderne fra /auth/confirm + /auth/callback findes i ordbogen.
  const ruter = ['app/auth/confirm/route.ts', 'app/auth/callback/route.ts']
    .map((f) => fs.readFileSync(path.join(ROD, f), 'utf8'))
    .join('\n');
  const koder = new Set([...ruter.matchAll(/'(bekraeft|reset|mail|link)'/g)].map((m) => m[1]));
  for (const k of koder) {
    lig(`U4 linkFejl '${k}' på alle sprog`, [da, sv, en].every((o) => !!o.konto.linkFejl[k]), true);
  }
  lig('U4 confirm-ruten kender alle 4 koder', [...koder].sort(), ['bekraeft', 'link', 'mail', 'reset']);
  // Flertal + parametre.
  lig('U4 notif viser', [da.notif.viser(3, 10), sv.notif.viser(3, 10), en.notif.viser(3, 10)], ['viser 3 af 10', 'visar 3 av 10', 'showing 3 of 10']);
  lig('U4 klokke-aria', [da.notif.klokkeAria(0), sv.notif.klokkeAria(2), en.notif.klokkeAria(1)], ['Notifikationer', 'Notiser (2 olästa)', 'Notifications (1 unread)']);
  lig('U4 navn for kort', [da.garage.navnForKort(2), en.garage.navnForLangt(40)], ['Navnet skal være mindst 2 tegn.', 'The name can be at most 40 characters.']);
  // Mail-emner: ingen $ (Compose), ingen { } (Go-skabelonen) og ingen < > & (skabelonen escaper ikke tekst).
  for (const [navn, o] of [['da', da], ['sv', sv], ['en', en]]) {
    const alle = [o.mail.kopierLink, ...Object.values(o.mail.bekraeft), ...Object.values(o.mail.nulstil)];
    lig(`U4 ${navn}: mail-tekster uden $ { } < > &`, alle.filter((t) => /[${}<>&]/.test(t)), []);
  }
  // Ingen lange tankestreger i U4's namespaces.
  for (const [navn, o] of [['da', da], ['sv', sv], ['en', en]]) {
    const tekst = JSON.stringify([o.konto, o.garage, o.notif, o.mail]);
    lig(`U4 ${navn}: ingen lange tankestreger`, /[\u2013\u2014]/.test(tekst), false);
  }
}

// --- U5: beskeder + events ---
{
  async function hent(rel, navn) {
    const kilde = fs.readFileSync(path.join(ROD, rel), 'utf8');
    const fil = path.join(os.tmpdir(), `zg-${navn}-${process.pid}.mjs`);
    fs.writeFileSync(
      fil,
      ts.transpileModule(kilde, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      }).outputText,
    );
    const m = await import(fil);
    fs.rmSync(fil, { force: true });
    return m;
  }
  const B = await hent('lib/beskeder-fejl.ts', 'beskeder-fejl');
  const E = await hent('lib/events-fejl.ts', 'events-fejl');

  // Nøgle-listerne == ordbogens fejl-namespaces på alle sprog.
  for (const [navn, o] of [['da', da], ['sv', sv], ['en', en]]) {
    lig(`U5 ${navn}: beskeder.fejl == BESKED_FEJL`, Object.keys(o.beskeder.fejl).sort(), [...B.BESKED_FEJL].sort());
    lig(`U5 ${navn}: events.fejl == EVENT_FEJL`, Object.keys(o.events.fejl).sort(), [...E.EVENT_FEJL].sort());
  }

  // De rigtige raise exception-tekster fra migrationerne -> nøgle.
  const sql = ['supabase/migrations/20261122120000_beskeder.sql', 'supabase/migrations/20261123180000_gruppe_samtaler.sql']
    .map((f) => fs.readFileSync(path.join(ROD, f), 'utf8'))
    .join('\n');
  const raises = [...new Set([...sql.matchAll(/raise exception '([^']+)'/g)].map((m) => m[1]))];
  lig('U5 fandt RPC-fejltekster i SQL', raises.length >= 12, true);
  lig('U5 alle RPC-fejltekster genkendes', raises.filter((r) => B.beskedFejlFraDb(r) === null), []);
  const F = B.beskedFejlFraDb;
  lig('U5 blokeret', [F('Samtale ikke mulig (blokeret).'), F('Kan ikke tilfoeje (blokeret).'), F('Samtale ikke mulig (en af deltagerne er blokeret).')], ['blokeret', 'blokeret', 'blokeret']);
  lig('U5 RLS -> blokeret', F('new row violates row-level security policy for table "messages"'), 'blokeret');
  lig('U5 for mange', F('For mange deltagere i gruppen (maks 50).'), 'forMange');
  lig('U5 mindst to', F('En gruppe kraever mindst to andre deltagere.'), 'mindstTo');
  lig('U5 findes ikke', [F('Brugeren findes ikke.'), F('En eller flere brugere findes ikke.')], ['brugerFindesIkke', 'brugerFindesIkke']);
  lig('U5 kun opretter', F('Kun gruppens opretter kan omdoebe gruppen.'), 'kunOpretter');
  lig('U5 dig selv vs. forlad', [F('Du kan ikke skrive til dig selv.'), F('Brug "Forlad gruppe" for at fjerne dig selv.')], ['digSelv', 'brugForlad']);
  lig('U5 log ind', [F('Log ind.'), F('Log ind for at skrive beskeder.')], ['logInd', 'logInd']);
  lig('U5 ukendt/tom -> null', [F('duplicate key value'), F(''), F(null), F(undefined)], [null, null, null, null]);
  lig('U5 erBeskedFejl', [B.erBeskedFejl('blokeret'), B.erBeskedFejl('Blokeret'), B.erBeskedFejl(3)], [true, false, false]);

  // Event-validering (deles af formular + server).
  const V = E.validerEvent;
  lig('U5 titel for kort', [V({ title: '  ab ' }), V({ title: 'abc' })], ['titelForKort', null]);
  lig('U5 slut før start', V({ title: 'Træf', startsAt: '2026-12-01T10:00:00Z', endsAt: '2026-12-01T09:00:00Z' }), 'slutFoerStart');
  lig('U5 slut = start ok', V({ title: 'Træf', startsAt: '2026-12-01T10:00:00Z', endsAt: '2026-12-01T10:00:00Z' }), null);
  lig('U5 kun slut / kun start ok', [V({ title: 'Træf', endsAt: '2026-12-01T09:00:00Z' }), V({ title: 'Træf', startsAt: '2026-12-01T09:00:00Z', endsAt: null })], [null, null]);
  lig('U5 erEventFejl', [E.erEventFejl('slutFoerStart'), E.erEventFejl('x')], [true, false]);

  // Flertal + parametre.
  lig('U5 deltagere', [da.beskeder.deltagere(1), da.beskeder.deltagere(3), sv.beskeder.deltagere(2), en.beskeder.deltagere(1), en.beskeder.deltagere(4)], ['1 deltager', '3 deltagere', '2 deltagare', '1 participant', '4 participants']);
  lig('U5 tilmeldte', [da.events.tilmeldte(1), da.events.tilmeldte(0), sv.events.tilmeldte(1), sv.events.tilmeldte(5), en.events.tilmeldte(2)], ['1 tilmeldt', '0 tilmeldte', '1 anmäld', '5 anmälda', '2 signed up']);
  lig('U5 var tilmeldt', [en.events.tilmeld.varTilmeldt(1), en.events.tilmeld.varTilmeldt(3), sv.events.tilmeld.varTilmeldt(3)], ['1 was signed up.', '3 were signed up.', '3 var anmälda.']);
  lig('U5 mailet', [da.events.admin.mailet(1), en.events.admin.mailet(2)], ['Opdateringen er slået op og mailet til 1 tilmeldt.', 'The update is posted and emailed to 2 people signed up.']);
  lig('U5 opret gruppe / skriv til', [sv.beskeder.opretGruppe(3), en.beskeder.skrivTil('Ida')], ['Skapa grupp (3)', 'Write to Ida']);
  lig('U5 tom indbakke bruger knap-teksten', [da, sv, en].every((o) => o.beskeder.tomIndbakke(o.beskeder.nyBesked).includes(`"${o.beskeder.nyBesked}"`)), true);
  lig('U5 ingen match', sv.beskeder.ingenMatch('Bo'), 'Inga ägare matchar "Bo". Prova ett annat namn.');

  // Ingen lange tankestreger i U5's namespaces.
  for (const [navn, o] of [['da', da], ['sv', sv], ['en', en]]) {
    const tekst = JSON.stringify([o.beskeder, o.events]) + [o.beskeder.tomIndbakke('x'), o.events.admin.mailet(2)].join();
    lig(`U5 ${navn}: ingen lange tankestreger`, /[–—]/.test(tekst), false);
  }

  // U5-filerne rummer ikke længere rå DB-fejl til UI'et (error.message videre).
  for (const f of ['app/beskeder/actions.ts', 'app/events/actions.ts']) {
    const k = fs.readFileSync(path.join(ROD, f), 'utf8');
    lig(`U5 ${f}: ingen throw new Error(error.message)`, /throw new Error\((error|ie|e)\??\.message/.test(k), false);
  }
}

// --- U6: Værkstedet, moderator-delen ---
{
  async function hentMod(rel, navn) {
    const kilde = fs.readFileSync(path.join(ROD, rel), 'utf8');
    const fil = path.join(os.tmpdir(), `zg-u6-${navn}-${process.pid}.mjs`);
    fs.writeFileSync(
      fil,
      ts.transpileModule(kilde, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      }).outputText,
    );
    const m = await import(fil);
    fs.rmSync(fil, { force: true });
    return m;
  }
  const VF = await hentMod('lib/vaerksted-fejl.ts', 'vfejl');
  const { vda } = await hentMod('lib/i18n/vaerksted/da.ts', 'vda');
  const { vsv } = await hentMod('lib/i18n/vaerksted/sv.ts', 'vsv');
  const { ven } = await hentMod('lib/i18n/vaerksted/en.ts', 'ven');
  const V = [['da', vda], ['sv', vsv], ['en', ven]];

  // Samme nøgle-træ på alle sprog (tsc fanger det også - her også runtime).
  function noegler(o, sti = '') {
    if (Array.isArray(o) || typeof o !== 'object' || o === null) return [sti];
    return Object.keys(o).sort().flatMap((k) => noegler(o[k], sti ? `${sti}.${k}` : k));
  }
  for (const [navn, o] of V) {
    lig(`U6 ${navn}: samme nøgler som da`, noegler(o), noegler(vda));
    lig(`U6 ${navn}: fejl == VAERKSTED_FEJL`, Object.keys(o.fejl).sort(), [...VF.VAERKSTED_FEJL].sort());
    lig(`U6 ${navn}: alle fejl-tekster ikke-tomme`, Object.values(o.fejl).every((t) => typeof t === 'string' && t.length > 3), true);
  }

  // Moderator-manualen: samme kort + samme blok-struktur på alle sprog, og
  // markup (**, _, `) er balanceret, så renderen ikke efterlader løse tegn.
  const struktur = (o) =>
    o.manual.kort.map((k) => [k.ikon, k.blokke.map((b) => Object.keys(b)[0] + (b.liste ? b.liste.length : b.situationer ? b.situationer.length : ''))]);
  for (const [navn, o] of V) {
    lig(`U6 ${navn}: manual-struktur == da`, JSON.stringify(struktur(o)), JSON.stringify(struktur(vda)));
    const tekster = o.manual.kort.flatMap((k) =>
      k.blokke.flatMap((b) => [b.p, b.note, b.afsnit, ...(b.liste ?? []).flatMap((p) => [p.navn, p.tekst]), ...(b.situationer ?? []).flatMap((x) => [x.naar, x.tekst])]),
    ).filter(Boolean);
    const ubalanceret = tekster.filter((t) => (t.split('**').length - 1) % 2 || (t.split('`').length - 1) % 2 || (t.replace(/\*\*/g, '').split('_').length - 1) % 2);
    lig(`U6 ${navn}: manual-markup balanceret`, ubalanceret, []);
  }
  lig('U6 manual har Kontakt-kort', vda.manual.kort.some((k) => k.ikon === '📨'), true);
  lig('U6 manual-nav nævner Kontakt + Manual', ['Kontakt', 'Manual'].every((x) => JSON.stringify(vda.manual.kort[1]).includes(x)), true);

  // De rigtige raise exception-tekster fra de RPC'er moderator-fladerne kalder
  // -> nøgle (aldrig null).
  const fn = ['mod_suspender_bruger', 'admin_ban_bruger', 'admin_ophaev', 'admin_anonymiser', 'kontakt_saet_behandlet', 'feedback_saml_dublet', 'feedback_fortryd_sammenlaegning'];
  const sqlFiler = [
    'supabase/migrations/20261124140000_bruger_sanktioner.sql',
    'supabase/migrations/20261124210000_p32_audit_superadmin.sql',
    'supabase/migrations/20261126130000_kontakt_beskeder.sql',
    'supabase/migrations/20261128140000_p43_sammenlaeg_dubletter.sql',
  ].map((f) => fs.readFileSync(path.join(ROD, f), 'utf8'));
  const raises = new Set();
  for (const sql of sqlFiler) {
    const blokke = sql.split(/create or replace function public\./i);
    for (const b of blokke) {
      if (!fn.some((n) => b.startsWith(n + '('))) continue;
      for (const m of b.matchAll(/raise exception\s+'([^']+)'/g)) raises.add(m[1]);
    }
  }
  const R = [...raises];
  lig('U6 fandt RPC-fejltekster i SQL', R.length >= 12, true);
  lig('U6 alle RPC-fejltekster genkendes', R.filter((r) => VF.vFejlFraDb(r) === null), []);
  const F = VF.vFejlFraDb;
  lig('U6 adgang', [F('Kun moderator/admin.'), F('Kun admin.'), F('Kun stab.'), F('new row violates row-level security policy for table "issues"')], ['ingenAdgang', 'ingenAdgang', 'ingenAdgang', 'ingenAdgang']);
  lig('U6 egen konto / admin-mål', [F('Du kan ikke suspendere din egen konto.'), F('En admin/superadmin kan ikke suspenderes - fjern rollen foerst.'), F('En admin kan ikke bannes - fjern admin-rollen foerst.')], ['egenKonto', 'maalErAdmin', 'maalErAdmin']);
  lig('U6 dage / grund / findes ikke', [F('Antal dage skal vaere mellem 1 og 3650.'), F('Ugyldig grund.'), F('Brugeren findes ikke.'), F('Henvendelsen findes ikke.')], ['ugyldigeDage', 'ugyldigGrund', 'brugerFindesIkke', 'henvendelseFindesIkke']);
  // P43: sammenlæg-RPC'ernes tekster -> egne nøgler (ikke den generiske).
  lig('P43 saml/fortryd-fejl', [
    F('Kun moderatorer kan laegge meldinger sammen.'),
    F('Meldingen findes ikke.'),
    F('En melding kan ikke laegges sammen med sig selv.'),
    F('En importeret bugherrer-melding kan ikke vaere dubletten (foer cutover).'),
    F('Dubletten er allerede lagt sammen.'),
    F('duplicate key value violates unique constraint "issue_sammenlaegninger_aktiv_dublet"'),
    F('Originalen er selv lagt sammen med en anden melding.'),
    F('Dubletten har selv faaet meldinger lagt ind - fortryd dem foerst.'),
    F('En fejl og et oenske kan ikke laegges sammen.'),
    F('Sammenlaegningen findes ikke.'),
    F('Sammenlaegningen er allerede fortrudt.'),
    F('Dubletten peger ikke laengere paa originalen - fortryd manuelt.'),
  ], ['ingenAdgang', 'meldingFindesIkke', 'samlSelv', 'samlImporteret', 'samlAllerede', 'samlAllerede', 'samlOriginalSkjult', 'samlHarIndlagte', 'samlTypeForskel', 'sammenlaegningFindesIkke', 'alleredeFortrudt', 'fortrydManuelt']);
  lig('P43 flyttet-tekst', [vda.feedback.flyttet(1, 0, 1, 0), vda.feedback.flyttet(3, 2, 0, 1), ven.feedback.flyttet(2, 1, 2, 2), vsv.feedback.stemmer(1), vsv.feedback.flyttet(0, 1, 1, 0), vsv.feedback.flyttet(2, 2, 0, 0)], ['1 stemme flyttet · 1 kommentar · 0 billeder', '3 stemmer flyttet (2 fra samme bil fjernet) · 0 kommentarer · 1 billede', '2 votes moved (1 from the same car removed) · 2 comments · 2 images', '1 röst', '0 röster flyttade (1 från samma bil borttagen) · 1 kommentar · 0 bilder', '2 röster flyttade (2 från samma bil borttagna) · 0 kommentarer · 0 bilder']);
  lig('U6 ukendt/tom -> null', [F('duplicate key value'), F(''), F(null), F(undefined)], [null, null, null, null]);
  lig('U6 erVFejl', [VF.erVFejl('ingenAdgang'), VF.erVFejl('IngenAdgang'), VF.erVFejl(1)], [true, false, false]);
  lig('U6 gyldigeDage', [0, 1, 7, 3650, 3651, 2.5, '7', NaN].map(VF.gyldigeDage), [false, true, true, true, false, false, false, false]);

  // Flertal + parametre.
  lig('U6 dage', [vda.brugere.dage(1), vda.brugere.dage(7), vsv.brugere.dage(1), vsv.brugere.dage(3), ven.brugere.dage(1), ven.brugere.dage(30)], ['1 dag', '7 dage', '1 dag', '3 dagar', '1 day', '30 days']);
  lig('U6 visninger', [vda.forumMod.visninger(1), vda.forumMod.visninger(4), vsv.forumMod.visninger(2), ven.forumMod.visninger(1)], ['1 visning', '4 visninger', '2 visningar', '1 view']);
  lig('U6 en svar', [ven.forumMod.svar(1), ven.forumMod.svar(3), ven.feedback.svar(1)], ['1 reply', '3 replies', '1 reply']);
  lig('U6 deploy', [vda.aktivitet.deploy('04', null).includes('kl. 04') && !vda.aktivitet.deploy('04', null).includes('travlest'), ven.aktivitet.deploy('04', '20').includes('busiest at 20:00')], [true, true]);
  lig('U6 viser / metaTitel', [vsv.faelles.viser(3, 9), ven.metaTitel('Overview'), vda.metaTitel(vda.nav.feedback)], ['Visar 3 av 9', 'Overview - Workshop', 'Feedback - Værkstedet']);
  lig('U6 intro admin vs. moderator', [vda.brugere.intro(false).includes('ban'), vda.brugere.intro(true).includes('ban')], [false, true]);

  // Ingen lange tankestreger i Værksted-ordbogen (inkl. funktions-output).
  for (const [navn, o] of V) {
    const tekst = JSON.stringify(o) + [o.brugere.intro(true), o.aktivitet.deploy('04', '20'), o.forumSide.modTaeller(1, 2)].join();
    lig(`U6 ${navn}: ingen lange tankestreger`, /[–—]/.test(tekst), false);
  }

  // Isolation: Værksted-ordbogen importeres kun under app/admin + components/admin.
  function alleFiler(dir) {
    return fs.readdirSync(path.join(ROD, dir), { withFileTypes: true }).flatMap((d) => {
      const rel = path.join(dir, d.name);
      if (d.isDirectory()) return d.name === 'node_modules' ? [] : alleFiler(rel);
      return /\.(ts|tsx)$/.test(d.name) ? [rel] : [];
    });
  }
  const udenfor = ['app', 'components', 'lib']
    .flatMap(alleFiler)
    .filter((f) => !f.startsWith('app/admin/') && !f.startsWith('components/admin/') && !f.startsWith('lib/i18n/vaerksted/'))
    .filter((f) => /(from|import)\s*\(?\s*['"][^'"]*i18n\/vaerksted/.test(fs.readFileSync(path.join(ROD, f), 'utf8')));
  lig('U6 vaerksted-ordbogen kun importeret i Værkstedet', udenfor, []);

  // U6-actions sender ikke længere rå DB-fejl videre.
  for (const f of ['app/admin/actions.ts', 'app/admin/beskeder-actions.ts', 'app/admin/kontakt-actions.ts']) {
    const k = fs.readFileSync(path.join(ROD, f), 'utf8');
    lig(`U6 ${f}: ingen throw new Error(...message)`, /throw new Error\((error|e|sletFejl)\??\.message/.test(k), false);
  }
}

// --- U7: DB-indhold (kategorier/grupper/regler/forside-besked) ---
{
  fs.mkdirSync(TMP, { recursive: true }); // TMP er ryddet ovenfor - genskab til U7
  await transpiler('lib/i18n/indhold.ts', 'indhold');
  // forum-kategori-i18n importerer ./i18n/indhold -> peg på den transpilerede kopi.
  const kilde = fs.readFileSync(path.join(ROD, 'lib/forum-kategori-i18n.ts'), 'utf8');
  const ud = ts.transpileModule(kilde, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText.replace(/from '\.\/i18n\/indhold'/g, "from './indhold.mjs'");
  fs.writeFileSync(path.join(TMP, 'fki.mjs'), ud);
  const KI = await import(path.join(TMP, 'fki.mjs'));
  const fo = await transpiler('lib/forum-oversaettelser.ts', 'forum-ov');

  lig('U7 rens maks', [R({ en: { content: 'a'.repeat(25000) } }, ['content'], 20000).en.content.length, R({ en: { navn: 'a'.repeat(400) } }, ['navn']).en.navn.length], [20000, 300]);
  lig('U7 laes kategori-ov', KI.laesKategoriOversaettelser({ sv: { name: ' Teknik ', x: 'y' }, de: {} }), { sv: { name: 'Teknik' } });
  lig('U7 laes kategori-ov null', KI.laesKategoriOversaettelser(undefined), {});

  const k = {
    id: '1', slug: 'diy-faq', name: 'DIY & FAQ', description: 'Gør-det-selv', icon: null, groupLabel: 'Teknik',
    groupOrder: 4, displayOrder: 1, modelId: null, isLocked: false, groupKey: 'Teknik',
    oversaettelser: { en: { name: 'DIY & FAQ', description: 'Do it yourself', group_label: 'Tech' }, sv: { description: 'Gör-det-själv' } },
  };
  lig('U7 lokaliser da = urørt', KI.lokaliserKategori(k, 'da'), k);
  const ken = KI.lokaliserKategori(k, 'en');
  lig('U7 lokaliser en', [ken.name, ken.description, ken.groupLabel, ken.groupKey], ['DIY & FAQ', 'Do it yourself', 'Tech', 'Teknik']);
  const ksv = KI.lokaliserKategori(k, 'sv');
  lig('U7 lokaliser sv: tomt navn/gruppe -> dansk', [ksv.name, ksv.description, ksv.groupLabel], ['DIY & FAQ', 'Gör-det-själv', 'Teknik']);
  lig('U7 lokaliser null-beskrivelse', KI.lokaliserKategori({ ...k, description: null }, 'en').description, null);
  lig('U7 gruppeLabel første med oversættelse', KI.gruppeLabel('Teknik', [{ oversaettelser: {} }, { oversaettelser: { en: { group_label: 'Tech' } } }], 'en'), 'Tech');
  lig('U7 gruppeLabel ingen -> dansk', [KI.gruppeLabel('Ny', [{ oversaettelser: {} }], 'sv'), KI.gruppeLabel('Teknik', [k], 'da')], ['Ny', 'Teknik']);
  lig('U7 lokaliserTekst', [
    KI.lokaliserTekst('Hej', { sv: { message: 'Hej!' } }, 'message', 'sv', 4000),
    KI.lokaliserTekst('Hej', { sv: { message: 'Hej!' } }, 'message', 'en', 4000),
    KI.lokaliserTekst('Hej', { sv: { message: 'Hej!' } }, 'message', 'da', 4000),
    KI.lokaliserTekst('Hej', null, 'message', 'en', 4000),
    KI.lokaliserTekst('', { en: { message: 'Orphan' } }, 'message', 'en', 4000),
  ], ['Hej!', 'Hej', 'Hej', 'Hej', '']);

  // Seed i migrationen == kode-tabellen (hver triple står i SQL'en) + antal.
  const SQL7 = fs.readFileSync(path.join(ROD, 'supabase/migrations/20261128090000_u7_db_indhold_i18n.sql'), 'utf8');
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const mangler7 = [];
  for (const tabel of [fo.GRUPPE_LABELS, fo.KATEGORI_NAVNE, fo.KATEGORI_BESKRIVELSER]) {
    for (const [daT, { sv: s, en: e }] of Object.entries(tabel)) {
      const re = new RegExp(`\\(${[daT, s, e].map(sqlStr).map(esc).join(',\\s*')}\\)`);
      if (!re.test(SQL7)) mangler7.push(daT);
    }
  }
  lig('U7 seed i migration == kode-tabel', mangler7, []);
  lig('U7 seed antal', (SQL7.match(/^\s+\('[^']*(?:''[^']*)*',\s+'/gm) ?? []).length,
    Object.keys(fo.GRUPPE_LABELS).length + Object.keys(fo.KATEGORI_NAVNE).length + Object.keys(fo.KATEGORI_BESKRIVELSER).length);
  // Reglerne: DA == den oprindelige seed, sv/en/da står ordret i U7-migrationen.
  const gammel = fs.readFileSync(path.join(ROD, 'supabase/migrations/20261122150000_forum_regler.sql'), 'utf8').match(/\$rules\$([\s\S]*?)\$rules\$/)[1];
  lig('U7 REGLER_DA == oprindelig seed', fo.REGLER_DA === gammel, true);
  lig('U7 regler sv/en/da i migrationen', [fo.REGLER_DA, fo.REGLER_SV, fo.REGLER_EN].map((x) => SQL7.includes(`$regler$${x}$regler$`)), [true, true, true]);
  const struktur = (x) => x.split('\n').map((l) => (l.startsWith('## ') ? 'H' : l.startsWith('- ') ? 'P' : l.trim() ? 'T' : '_')).join('');
  lig('U7 regler samme struktur som dansk (linje for linje)', [fo.REGLER_SV, fo.REGLER_EN].map(struktur), [struktur(fo.REGLER_DA), struktur(fo.REGLER_DA)]);
  // Model-skabelonen i triggeren == kode-skabelonen.
  const navn = '§';
  const skab = (f) => f(navn).split(navn);
  const [svFoer, svEfter] = skab(fo.MODEL_BESKRIVELSE.sv);
  const [enFoer, enEfter] = skab(fo.MODEL_BESKRIVELSE.en);
  const [daFoer, daEfter] = skab(fo.MODEL_BESKRIVELSE.da);
  lig('U7 model-skabelon i trigger', [
    SQL7.includes(`'${daFoer}' || new.name || '${daEfter}'`),
    SQL7.includes(`'${svFoer}' || new.name || '${svEfter}'`),
    SQL7.includes(`'${enFoer}' || new.name || '${enEfter}'`),
  ], [true, true, true]);
  const alle7 = [fo.GRUPPE_LABELS, fo.KATEGORI_NAVNE, fo.KATEGORI_BESKRIVELSER].flatMap((t) => Object.entries(t).flatMap(([d, p]) => [d, p.sv, p.en]))
    .concat([fo.REGLER_SV, fo.REGLER_EN, fo.MODEL_BESKRIVELSE.sv('X'), fo.MODEL_BESKRIVELSE.en('X')]);
  lig('U7 ingen lange tankestreger (tabel + migration)', [alle7.filter((x) => /[–—]/.test(x)), /[–—]/.test(SQL7)], [[], false]);
  // Gruppe-teksterne i ordbogen er keyet på de danske labels, som stadig findes.
  lig('U7 gruppeTekst-nøgler er kendte gruppe-labels', Object.keys(da.forum.gruppeTekst).filter((g) => !fo.GRUPPE_LABELS[g]), []);
  fs.rmSync(TMP, { recursive: true, force: true });
}

// --- U8: notifikationer + mails ---
{
  async function hent8(rel, navn) {
    const kilde = fs.readFileSync(path.join(ROD, rel), 'utf8');
    const fil = path.join(os.tmpdir(), `zg-${navn}-${process.pid}.mjs`);
    fs.writeFileSync(fil, ts.transpileModule(kilde, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText);
    const m = await import(fil);
    fs.rmSync(fil, { force: true });
    return m;
  }
  const N = await hent8('lib/notif-tekst.ts', 'notif-tekst');
  const EM = await hent8('lib/event-mail.ts', 'event-mail');
  const T = { da: da.notif.tekster, sv: sv.notif.tekster, en: en.notif.tekster };
  const r = (type, params, sp, tekst = 'DANSK-FALLBACK') => N.notifTekst({ type, tekst, params }, T[sp]);

  // Hver type x sprog (dansk = ordret som trigger-teksten).
  const tilfaelde = [
    ['forum_svar', { navn: 'Venø', titel: 'Bremser', direkte: false },
      ['Venø svarede i "Bremser"', 'Venø svarade i "Bremser"', 'Venø replied in "Bremser"']],
    ['forum_svar', { navn: 'Venø', titel: 'Bremser', direkte: true },
      ['Venø svarede på dit indlæg i "Bremser"', 'Venø svarade på ditt inlägg i "Bremser"', 'Venø replied to your post in "Bremser"']],
    ['forum_svar', { titel: 'Bremser', direkte: false },
      ['En ejer svarede i "Bremser"', 'En ägare svarade i "Bremser"', 'An owner replied in "Bremser"']],
    ['mention', { navn: 'Venø', titel: 'Bremser' },
      ['Venø nævnte dig i "Bremser"', 'Venø nämnde dig i "Bremser"', 'Venø mentioned you in "Bremser"']],
    ['pb_besked', { navn: 'Venø', gruppe: false },
      ['Venø sendte dig en besked', 'Venø skickade ett meddelande till dig', 'Venø sent you a message']],
    ['pb_besked', { navn: 'Venø', gruppe: true, gruppenavn: '7GT Sjælland' },
      ['Venø skrev i 7GT Sjælland', 'Venø skrev i 7GT Sjælland', 'Venø wrote in 7GT Sjælland']],
    ['pb_besked', { gruppe: true },
      ['En ejer skrev i en gruppe', 'En ägare skrev i en grupp', 'An owner wrote in a group']],
    ['nyt_event', { titel: 'Træf i Roskilde' },
      ['Holdet oprettede et nyt event: "Træf i Roskilde"', 'Teamet skapade ett nytt evenemang: "Träf i Roskilde"'.replace('Träf', 'Træf'), 'The team created a new event: "Træf i Roskilde"']],
    ['advarsel', { grund: 'tone', fritekst: 'Hold en god tone' },
      ['Du har fået en advarsel fra moderationen - grund: tone (Hold en god tone)', 'Du har fått en varning från moderatorerna - anledning: ton (Hold en god tone)', 'You have received a warning from the moderators - reason: tone (Hold en god tone)']],
    ['forum_rapport', { navn: 'Venø', hvad: 'indlaeg', titel: 'Bremser', grund: 'spam' },
      ['Venø rapporterede et indlæg i "Bremser" - grund: spam', 'Venø rapporterade ett inlägg i "Bremser" - anledning: spam', 'Venø reported a post in "Bremser" - reason: spam']],
    ['forum_rapport', { hvad: 'traad', grund: 'andet' },
      ['En ejer rapporterede en tråd - grund: andet', 'En ägare rapporterade en tråd - anledning: annat', 'An owner reported a thread - reason: other']],
    ['kontakt', { emne: 'Fejl på siden' },
      ['Ny henvendelse via Kontakt: "Fejl på siden"', 'Nytt ärende via Kontakt: "Fejl på siden"', 'New message via Contact: "Fejl på siden"']],
    ['ota', { version: '3.0.4' },
      ['Ny software til din Zeekr: 3.0.4', 'Ny programvara till din Zeekr: 3.0.4', 'New software for your Zeekr: 3.0.4']],
    ['moderation', { v: 'fjern_traad', titel: 'Bremser', grund: 'dublet' },
      ['Din tråd "Bremser" blev fjernet - grund: dublet', 'Din tråd "Bremser" har tagits bort - anledning: dubblett', 'Your thread "Bremser" was removed - reason: duplicate']],
    ['moderation', { v: 'fjern_indlaeg', titel: 'Bremser', grund: 'off-topic', fritekst: 'Se reglerne' },
      ['Dit indlæg i "Bremser" blev fjernet - grund: off-topic (Se reglerne)', 'Ditt inlägg i "Bremser" har tagits bort - anledning: off-topic (Se reglerne)', 'Your post in "Bremser" was removed - reason: off-topic (Se reglerne)']],
    ['moderation', { v: 'fjern_avatar', grund: 'andet' },
      ['Dit profilbillede blev fjernet - grund: andet', 'Din profilbild har tagits bort - anledning: annat', 'Your profile picture was removed - reason: other']],
    // 2026-12-05T13:30Z = 14:30 dansk vintertid; 2026-07-01T12:05Z = 14:05 sommertid.
    ['moderation', { v: 'suspender', til: '2026-12-05T13:30:00+00:00', grund: 'spam' },
      ['Din konto er suspenderet til 05-12-2026 kl. 14:30 - grund: spam. Du kan stadig læse, men ikke bidrage, indtil da.',
       'Ditt konto är avstängt till 2026-12-05 kl. 14:30 - anledning: spam. Du kan fortfarande läsa, men inte bidra, fram till dess.',
       'Your account is suspended until 05/12/2026 at 14:30 - reason: spam. You can still read, but not contribute, until then.']],
    ['moderation', { v: 'suspender', til: '2026-07-01T12:05:00.123456+00:00', grund: 'tone' },
      ['Din konto er suspenderet til 01-07-2026 kl. 14:05 - grund: tone. Du kan stadig læse, men ikke bidrage, indtil da.', null, null]],
    ['moderation', { v: 'ban', grund: 'spam', fritekst: 'Reklame' },
      ['Din konto er permanent spærret - grund: spam (Reklame). Du kan stadig læse, men ikke længere bidrage.',
       'Ditt konto är permanent spärrat - anledning: spam (Reklame). Du kan fortfarande läsa, men inte längre bidra.',
       'Your account is permanently banned - reason: spam (Reklame). You can still read, but no longer contribute.']],
    ['moderation', { v: 'ophaev' },
      ['Din spærring er ophævet. Du kan bidrage igen.', 'Din spärr har hävts. Du kan bidra igen.', 'Your account restriction has been lifted. You can contribute again.']],
  ];
  for (const [type, params, forv] of tilfaelde) {
    ['da', 'sv', 'en'].forEach((sp, i) => {
      if (forv[i] !== null) lig(`U8 ${type}/${params.v ?? ''}${params.direkte ? '/direkte' : ''} ${sp}`, r(type, params, sp), forv[i]);
    });
  }
  // Alle 9 typer har en renderer (ingen falder til fallback med gyldige params).
  const typer9 = new Set(tilfaelde.map((x) => x[0]));
  lig('U8 alle 9 typer dækket', [...typer9].sort(), ['advarsel', 'forum_rapport', 'forum_svar', 'kontakt', 'mention', 'moderation', 'nyt_event', 'ota', 'pb_besked']);

  // Fallback: gamle rækker, ukendte typer/varianter, manglende/forkerte felter.
  const F = 'Gammel dansk tekst';
  const fb = [
    ['forum_svar', null], ['forum_svar', undefined], ['forum_svar', 'streng'], ['forum_svar', ['a']],
    ['forum_svar', {}], ['forum_svar', { navn: 'X', titel: '' }], ['forum_svar', { navn: 'X', titel: 42 }],
    ['ukendt_type', { navn: 'X' }], ['moderation', { v: 'noget_nyt' }], ['moderation', {}],
    ['moderation', { v: 'fjern_traad', titel: 'T' }], ['moderation', { v: 'fjern_traad', titel: 'T', grund: 'ny-grund' }],
    ['moderation', { v: 'suspender', grund: 'spam' }], ['moderation', { v: 'suspender', til: 'ikke-en-dato', grund: 'spam' }],
    ['forum_rapport', { hvad: 'billede', grund: 'spam' }], ['forum_rapport', { hvad: 'traad' }],
    ['kontakt', { emne: '   ' }], ['ota', {}], ['nyt_event', { navn: 'X' }], ['advarsel', { fritekst: 'x' }],
  ];
  for (const [type, params] of fb) {
    for (const sp of ['da', 'sv', 'en']) lig(`U8 fallback ${type} ${JSON.stringify(params)} ${sp}`, r(type, params, sp, F), F);
  }
  // Fritekst/titler er indhold: ordret, ingen escaping (React escaper ved render).
  lig('U8 indhold ordret', r('forum_svar', { navn: '<b>Ø</b>', titel: 'A & "B"', direkte: false }, 'en'), '<b>Ø</b> replied in "A & "B""');
  // Grund-labels: samme nøgler som modGrund på alle sprog.
  for (const [navn, o] of [['da', da], ['sv', sv], ['en', en]]) {
    lig(`U8 ${navn}: grund-nøgler == modGrund`, Object.keys(o.notif.tekster.grund).sort(), Object.keys(o.modGrund).sort());
  }

  // SQL: hver notif-funktion i migrationen fylder params, og de typer/varianter
  // rendereren kender, er dem triggerne skriver.
  const SQL8 = fs.readFileSync(path.join(ROD, 'supabase/migrations/20261128120000_u8_notifikationer_i18n.sql'), 'utf8');
  const fn8 = [...SQL8.matchAll(/create or replace function public\.(\w+)\(/g)].map((m) => m[1]);
  lig('U8 migration: alle 13 notif-funktioner + event-RPC', fn8.sort(), ['admin_ban_bruger', 'admin_ophaev', 'admin_opret_ota', 'event_after_insert', 'event_deltager_modtagere',
    'forum_post_notify', 'forum_rapport_notify', 'kontakt_notify', 'message_after_insert', 'mod_advar_bruger', 'mod_fjern_avatar', 'mod_fjern_indlaeg', 'mod_fjern_traad', 'mod_suspender_bruger']);
  const inserts = SQL8.match(/insert into public\.notifications \([^)]*\)/g) ?? [];
  lig('U8 migration: alle notif-inserts har params', [inserts.length, inserts.filter((x) => !x.includes('params')).length], [14, 0]);
  lig('U8 migration: moderations-varianter == renderer', [...SQL8.matchAll(/'v', '(\w+)'/g)].map((m) => m[1]).sort(),
    ['ban', 'fjern_avatar', 'fjern_indlaeg', 'fjern_traad', 'ophaev', 'suspender']);
  lig('U8 migration: ingen lange tankestreger', /[–—]/.test(SQL8), false);

  // Mail-skift-teksterne: ingen $ { } < > & (skabelonen escaper ikke selv).
  for (const [navn, o] of [['da', da], ['sv', sv], ['en', en]]) {
    lig(`U8 ${navn}: mail-skift-tekster rene`, Object.values(o.mail.mailskift).filter((t) => /[${}<>&]/.test(t)), []);
  }

  // Event-mailen: gruppering pr. sprog + dansk krop ordret som før U8.
  lig('U8 grupper modtagere', EM.grupperModtagere([
    { email: 'a@x.dk', sprog: 'da' }, { email: 'b@x.se', sprog: 'sv' }, { email: 'c@x.com', sprog: 'en' },
    { email: 'd@x.no', sprog: 'nb' }, { email: 'e@x.dk', sprog: null }, { email: 'A@x.dk', sprog: 'sv' },
    { email: 'ikke-mail', sprog: 'sv' }, { sprog: 'en' }, null,
  ]), { da: ['a@x.dk', 'd@x.no', 'e@x.dk'], sv: ['b@x.se'], en: ['c@x.com'] });
  lig('U8 grupper tom/ugyldig', [EM.grupperModtagere(null), EM.grupperModtagere({})], [{ da: [], sv: [], en: [] }, { da: [], sv: [], en: [] }]);
  const a8 = { titel: 'Træf <Roskilde> & "kaffe"', tekst: 'Vi mødes kl. 10\nHusk <termokande>', link: 'https://zeekr-garage.dk/events/traef', domaene: 'zeekr-garage.dk', site: 'Zeekr Garage' };
  const esc = (x) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const gammel = `<p>Der er en ny opdatering til <strong>${esc(a8.titel)}</strong>:</p>` +
    `<p style="white-space:pre-line">${esc(a8.tekst)}</p>` +
    `<p><a href="${a8.link}">Se eventet på ${a8.domaene}</a></p>` +
    `<hr><p style="color:#888;font-size:12px">Du får denne mail, fordi du er tilmeldt eventet på ${a8.site}.</p>`;
  const daMail = EM.bygEventMail(da.events.mail, a8);
  lig('U8 event-mail da == gammel krop', daMail.html, gammel);
  lig('U8 event-mail da emne == gammelt', daMail.emne, `Opdatering: ${a8.titel} - Zeekr Garage`);
  const svMail = EM.bygEventMail(sv.events.mail, a8);
  const enMail = EM.bygEventMail(en.events.mail, a8);
  lig('U8 event-mail sv/en', [svMail.emne, svMail.html.includes('Det finns en ny uppdatering för <strong>'), svMail.html.includes('Se evenemanget på'),
    enMail.emne, enMail.html.includes('View the event on zeekr-garage.dk'), enMail.html.includes('&lt;termokande&gt;')],
    ['Uppdatering: Træf <Roskilde> & "kaffe" - Zeekr Garage', true, true, 'Update: Træf <Roskilde> & "kaffe" - Zeekr Garage', true, true]);

  // Ingen lange tankestreger i U8-teksterne (inkl. funktions-output).
  for (const [navn, o] of [['da', da], ['sv', sv], ['en', en]]) {
    const ud = tilfaelde.map(([type, params]) => N.notifTekst({ type, tekst: '', params }, o.notif.tekster)).join('|')
      + JSON.stringify(o.mail.mailskift) + EM.bygEventMail(o.events.mail, a8).html + o.events.mail.emne('x', 'y');
    lig(`U8 ${navn}: ingen lange tankestreger`, /[–—]/.test(ud), false);
  }
}

console.log(`\n${ok}/${ok + fejl} assertioner grønne.`);
process.exit(fejl ? 1 : 0);
