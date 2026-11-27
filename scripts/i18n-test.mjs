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

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\n${ok}/${ok + fejl} assertioner grønne.`);
process.exit(fejl ? 1 : 0);
