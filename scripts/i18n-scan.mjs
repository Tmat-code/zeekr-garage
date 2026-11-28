#!/usr/bin/env node
// UI-i18n: scanner der finder resterende danske UI-strenge i kildefilerne.
//
// Brug:
//   node scripts/i18n-scan.mjs                 -> hele app/, components/, lib/ (oversigt pr. fil)
//   node scripts/i18n-scan.mjs fil1 fil2 ...   -> kun de filer (fx en skives filer), med fund pr. linje
//   node scripts/i18n-scan.mjs --skive U1      -> de filer der hører til skiven (SKIVER nedenfor)
//   tilføj --vis for at liste hvert fund
//
// Hvad tæller som en "UI-streng": JSX-tekst med bogstaver, samt streng-literals
// (inkl. template-strenge) der ligner menneske-tekst (har mellemrum eller dansk
// bogstav æ/ø/å). Fraregnet: kommentarer, import/export-stier, className/key/
// href/src/id-attributter, CSS-klasse-agtige strenge, stier/URL'er, Supabase-
// kald (.from/.select/.eq/...), console.*, og ordbogsfilerne i lib/i18n/.
// En linje kan undtages bevidst med kommentaren `i18n-ok` (fx et brandnavn).
// Exit-kode 1 hvis der er fund i en eksplicit fil-liste/skive (til verifikation).

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROD = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

const SKIVER = {
  U1: [
    'app/layout.tsx',
    'app/manifest.ts',
    'app/page.tsx',
    'app/om/page.tsx',
    'app/links/page.tsx',
    'app/software/page.tsx',
    'app/sprog-actions.ts',
    'components/Header.tsx',
    'components/Nav.tsx',
    'components/Footer.tsx',
    'components/ConfirmButton.tsx',
    'components/LinksVisning.tsx',
    'components/SoftwareHistorik.tsx',
    'components/SprogVaelger.tsx',
    'components/SprogFelt.tsx',
    'lib/config.ts',
    'lib/i18n/sprog.ts',
    'lib/i18n/server.ts',
    'lib/i18n/klient.tsx',
    'lib/i18n/format.ts',
    'lib/i18n/index.ts',
  ],
  // U1b: DB-indhold paa /links + /software. Bevidst UDE: lib/links.ts +
  // lib/links-oversaettelser.ts (data - danske kilde-tekster med sv/en ved siden
  // af), links-editoren i Vaerkstedet (admin-kun = dansk, design valg 2).
  U1b: [
    'app/links/page.tsx',
    'app/software/page.tsx',
    'components/LinksVisning.tsx',
    'components/SoftwareHistorik.tsx',
    'lib/i18n/indhold.ts',
    'lib/ota-oversaet.ts',
    'lib/ota-oversaet-kerne.ts',
  ],
  // U3 + U3b: feedback + kontakt + flersproget feedback. Bevidst UDE:
  // BilledeUpload/BilledeGalleri (forum-komponenter, U2) og ModereringsTabel
  // (Værkstedet, U6).
  U3: [
    'app/feedback/page.tsx',
    'app/meld/page.tsx',
    'app/meld/actions.ts',
    'app/melding/[id]/page.tsx',
    'app/melding/actions.ts',
    'app/kontakt/page.tsx',
    'app/kontakt/actions.ts',
    'components/FejlBoard.tsx',
    'components/MeldFlow.tsx',
    'components/MeldForm.tsx',
    'components/Kommentarer.tsx',
    'components/KontaktForm.tsx',
    'components/BilVaelger.tsx',
    'components/Tags.tsx',
    'components/OversatTitel.tsx',
    'lib/kildesprog.ts',
    'lib/titel-oversaet.ts',
    'lib/titel-oversaet-kerne.ts',
  ],
  // U2: forum-UI. Bevidst UDE: kategorinavne/-beskrivelser + forum-regler (DB-
  // indhold, U7), Værkstedets brug af GrundVaelger/grundLabel (U6 - de følger
  // med automatisk, men filerne hører til U6).
  U2: [
    'app/forum/page.tsx',
    'app/forum/actions.ts',
    'app/forum/[kategori]/page.tsx',
    'app/forum/[kategori]/[traad]/page.tsx',
    'app/forum/[kategori]/ny/page.tsx',
    'app/forum/regler/page.tsx',
    'app/forum/soeg/page.tsx',
    'components/forum/ForumOversigt.tsx',
    'components/forum/ForumTraad.tsx',
    'components/forum/NyTraadForm.tsx',
    'components/forum/TraadModeration.tsx',
    'components/forum/TraadSoegeForm.tsx',
    'components/forum/GrundVaelger.tsx',
    'components/forum/RapporterKnap.tsx',
    'components/forum/BilledeUpload.tsx',
    'components/forum/Avatar.tsx',
    'components/forum/GarageBadge.tsx',
    'components/forum/ModelBadge.tsx',
    'components/forum/Uddrag.tsx',
    'components/forum/LinkPreviewKort.tsx',
    'components/forum/AutolinkTekst.tsx',
    'components/forum/ReglerIndhold.tsx',
    'components/forum/VisningPing.tsx',
    'components/BilledeGalleri.tsx',
    'lib/moderering.ts',
    'lib/forum.ts',
    'lib/forum-oversaet.ts',
    'lib/forum-sprog.ts',
    'lib/forum-regler.ts',
    'lib/forum-links.ts',
    'lib/forum-enheder.ts',
  ],
  // U4: konto (login + opret bruger, nulstil, Min garage, notifikations-side +
  // klokkens ramme, landings-/fejl-redirects efter mail-links) + bekræft-/
  // nulstil-mailskabelonerne (rykket frem fra U8). Bevidst UDE: selve
  // notifikations-teksterne (DB, U8), mail-skift-mailen (U8), BilVaelger (U3).
  U4: [
    'app/login/page.tsx',
    'app/nulstil/page.tsx',
    'app/garage/page.tsx',
    'app/notifikationer/page.tsx',
    'app/auth/confirm/route.ts',
    'app/auth/callback/route.ts',
    'app/auth/confirm-email/route.ts',
    'app/auth/recovery-email/route.ts',
    'components/LoginForm.tsx',
    'components/NulstilForm.tsx',
    'components/MinGarageForm.tsx',
    'components/VisningsnavnForm.tsx',
    'components/SkiftMailForm.tsx',
    'components/AvatarUpload.tsx',
    'components/NotifikationerListe.tsx',
    'components/NotifBell.tsx',
    'lib/gotrue-fejl.ts',
    'lib/mail-skabelon.ts',
    'lib/notifikationer.ts',
  ],
  // U5: beskeder + events. Bevidst UDE: event-MAILEN til de tilmeldte (dansk
  // indtil U8 - markeret i18n-ok i app/events/actions.ts), notifikations-
  // teksterne fra DB (U8), lib/ics.ts (kalender-fil, ikke UI). HTTP-statustekster
  // i route-handlerne er markeret i18n-ok.
  U5: [
    'app/beskeder/page.tsx',
    'app/beskeder/ny/page.tsx',
    'app/beskeder/[id]/page.tsx',
    'app/beskeder/actions.ts',
    'app/beskeder/billede/[...sti]/route.ts',
    'app/events/page.tsx',
    'app/events/actions.ts',
    'app/events/ny/page.tsx',
    'app/events/[slug]/page.tsx',
    'app/events/[slug]/rediger/page.tsx',
    'app/events/[slug]/ics/route.ts',
    'components/beskeder/SamtaleView.tsx',
    'components/beskeder/NyBeskedView.tsx',
    'components/beskeder/GruppePanel.tsx',
    'components/beskeder/IndbakkeSletKnap.tsx',
    'components/events/EventForm.tsx',
    'components/events/EventAdmin.tsx',
    'components/events/TilmeldKnap.tsx',
    'lib/beskeder.ts',
    'lib/beskeder-fejl.ts',
    'lib/events-fejl.ts',
  ],
  // U6: Værkstedet, KUN moderator-delen (design valg 2). Bevidst UDE (forbliver
  // dansk): admin-kun-flader (Links, OTA, Audit, Rapport, AdgangePanel = rolle-
  // styring, ForsideBeskedEditor, Oprydning-panelerne), struktur-editorerne på
  // Forum-fanen (ForumEditorSektioner, KategoriStyring, ForumReglerEditor,
  // TilfoejModel, ModellerPanel - afklaret med Torben 28-11), AdminManual, og
  // app/admin/admin-actions.ts. Selve ordbogen (lib/i18n/vaerksted/) er
  // fraregnet som de øvrige ordbøger.
  U6: [
    'app/admin/layout.tsx',
    'app/admin/page.tsx',
    'app/admin/feedback/page.tsx',
    'app/admin/forum/page.tsx',
    'app/admin/beskeder/page.tsx',
    'app/admin/kontakt/page.tsx',
    'app/admin/aktivitet/page.tsx',
    'app/admin/adgange/page.tsx',
    'app/admin/manual/page.tsx',
    'app/admin/actions.ts',
    'app/admin/beskeder-actions.ts',
    'app/admin/kontakt-actions.ts',
    'components/admin/AdminNav.tsx',
    'components/admin/Overblik.tsx',
    'components/admin/Genveje.tsx',
    'components/admin/ModereringsTabel.tsx',
    'components/admin/AktivitetFeed.tsx',
    'components/admin/BarGraf.tsx',
    'components/admin/ForumModerering.tsx',
    'components/admin/ForumRapporter.tsx',
    'components/admin/AnmeldelserPanel.tsx',
    'components/admin/KontaktBeskeder.tsx',
    'components/admin/BrugerAdministration.tsx',
    'components/admin/ManualVisning.tsx',
    'components/admin/useVKoer.ts',
    'lib/vaerksted-fejl.ts',
    'lib/queries-admin.ts',
  ],
  // U7: DB-indhold (kategorinavne/-beskrivelser/gruppe-label, forum-regler,
  // forside-besked) paa laeserens sprog. Bevidst UDE: lib/forum-oversaettelser.ts
  // (data - danske kilde-tekster med sv/en ved siden af) og editorerne i
  // Vaerkstedet (KategoriStyring, ForumReglerEditor, ForsideBeskedEditor,
  // OversaettelsesFelter: admin-agtige struktur-editorer = dansk UI). lib/queries.ts
  // er ikke med (U3-filer i forvejen; kun kolonnelister roert).
  U7: [
    'lib/forum-kategori-i18n.ts',
    'lib/forum.ts',
    'lib/forum-regler.ts',
    'lib/queries-admin.ts',
    'app/page.tsx',
    'app/forum/page.tsx',
    'app/forum/[kategori]/page.tsx',
    'app/forum/[kategori]/ny/page.tsx',
    'app/forum/[kategori]/[traad]/page.tsx',
    'app/forum/soeg/page.tsx',
    'app/forum/regler/page.tsx',
    'components/forum/ForumOversigt.tsx',
    'components/forum/TraadSoegeForm.tsx',
    'components/admin/ForumModerering.tsx',
    'components/admin/AktivitetFeed.tsx',
  ],
};

const IGNORER_ATTR = new Set([
  'className', 'key', 'href', 'src', 'id', 'htmlFor', 'type', 'name', 'rel', 'target',
  'method', 'action', 'role', 'viewBox', 'd', 'fill', 'stroke', 'strokeWidth',
  'strokeLinecap', 'preserveAspectRatio', 'stopColor', 'offset', 'x1', 'x2', 'y1', 'y2',
  'autoComplete', 'inputMode', 'lang', 'referrerPolicy', 'loading', 'sizes', 'accept',
  'style', 'dangerouslySetInnerHTML', 'encType', 'pattern', 'mode',
]);
const IGNORER_KALD = new Set([
  'from', 'select', 'eq', 'neq', 'in', 'is', 'order', 'rpc', 'upsert', 'insert', 'update',
  'delete', 'match', 'ilike', 'like', 'or', 'not', 'contains', 'storage', 'channel',
  'on', 'get', 'set', 'has', 'append', 'redirect', 'push', 'replace', 'require',
  'import', 'getElementById', 'querySelector', 'addEventListener', 'removeEventListener',
  'dispatchEvent', 'toLocaleString', 'toLocaleDateString', 'toLocaleTimeString',
  'revalidatePath', 'createElement', 'split', 'startsWith', 'endsWith', 'includes',
  'test', 'matchAll', 'headers', 'cookies', 'error', 'log', 'warn', 'info', 'debug',
]);

const DANSK_BOGSTAV = /[æøåÆØÅ]/;
const BOGSTAV = /[A-Za-zæøåÆØÅäöÄÖ]/;

function lignerKlasser(s) {
  // Tailwind/CSS: kun "tekniske" tokens uden store bogstaver/punktum-sætninger.
  const tokens = s.trim().split(/\s+/);
  return tokens.every((t) => /^[a-z0-9!:\[\]\/\.\-_#%(),&>*=+@'"~]+$/.test(t)) &&
    tokens.some((t) => /-|:/.test(t));
}

function lignerTeknisk(s) {
  const t = s.trim();
  if (!t) return true;
  if (/^(\/|https?:|mailto:|#|\.\/|@\/|data:)/.test(t)) return true;
  if (/^[\w.-]+@[\w.-]+$/.test(t)) return true; // mail
  if (/^[a-z0-9_]+(\.[a-z0-9_]+)+$/i.test(t)) return true; // dot.path
  if (/^[A-Za-z0-9_\-]+$/.test(t) && !DANSK_BOGSTAV.test(t)) return true; // ét teknisk ord/slug
  if (lignerKlasser(t)) return true;
  if (/^[\d\s.,:;%+\-\u2013/()x×]+$/.test(t)) return true;
  return false;
}

function erUiStreng(tekst, jsx) {
  const t = tekst.replace(/\s+/g, ' ').trim();
  if (!t || !BOGSTAV.test(t)) return false;
  if (jsx) return !lignerTeknisk(t) || DANSK_BOGSTAV.test(t) || /\s/.test(t) || /^[A-ZÆØÅ][a-zæøå]+$/.test(t);
  if (lignerTeknisk(t)) return false;
  return /\s/.test(t) || DANSK_BOGSTAV.test(t);
}

function kaldNavn(node) {
  // Finder evt. omsluttende kald hvor strengen er et argument: x.from('...') -> 'from'
  const p = node.parent;
  if (p && ts.isCallExpression(p) && p.arguments.includes(node)) {
    const e = p.expression;
    if (ts.isPropertyAccessExpression(e)) return e.name.text;
    if (ts.isIdentifier(e)) return e.text;
  }
  return null;
}

function skalIgnoreres(node, sf) {
  const p = node.parent;
  if (!p) return false;
  if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isExternalModuleReference(p)) return true;
  if (ts.isExpressionStatement(p)) return true; // 'use client' / 'use server'
  if (ts.isPropertyAssignment(p) && p.name === node) return true; // nøgle
  if (ts.isLiteralTypeNode(p)) return true; // type 'stemt' | ...
  if (ts.isElementAccessExpression(p) && p.argumentExpression === node) return true;
  if (ts.isBinaryExpression(p) && /===|!==|==|!=/.test(ts.tokenToString(p.operatorToken.kind) ?? '')) return true;
  if (ts.isCaseClause(p)) return true;
  if (ts.isJsxAttribute(p) && IGNORER_ATTR.has(p.name.getText(sf))) return true;
  if (ts.isJsxExpression(p) && p.parent && ts.isJsxAttribute(p.parent) && IGNORER_ATTR.has(p.parent.name.getText(sf))) return true;
  const k = kaldNavn(node);
  if (k && IGNORER_KALD.has(k)) return true;
  // className={`... ${x}`} / cn(...)
  let a = node.parent;
  for (let i = 0; i < 4 && a; i++, a = a.parent) {
    if (ts.isJsxAttribute(a)) return IGNORER_ATTR.has(a.name.getText(sf));
    if (ts.isPropertyAssignment(a) && ['className', 'chip', 'badgeKlasse', 'klasse'].includes(a.name.getText(sf))) return true;
  }
  return false;
}

function scanFil(rel) {
  const fuld = path.join(ROD, rel);
  const kilde = fs.readFileSync(fuld, 'utf8');
  const linjer = kilde.split('\n');
  const sf = ts.createSourceFile(rel, kilde, ts.ScriptTarget.Latest, true,
    rel.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const fund = [];
  const noter = (node, tekst, jsx) => {
    if (!erUiStreng(tekst, jsx)) return;
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    if ((linjer[line] ?? '').includes('i18n-ok')) return;
    fund.push({ linje: line + 1, tekst: tekst.replace(/\s+/g, ' ').trim().slice(0, 90) });
  };
  const besoeg = (node) => {
    if (ts.isJsxText(node)) {
      noter(node, node.getText(sf), true);
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!skalIgnoreres(node, sf)) noter(node, node.text, false);
    } else if (ts.isTemplateExpression(node)) {
      if (!skalIgnoreres(node, sf)) {
        const statisk = [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(' ');
        noter(node, statisk, false);
      }
    }
    ts.forEachChild(node, besoeg);
  };
  besoeg(sf);
  return fund;
}

function alleFiler() {
  const ud = [];
  const gaa = (dir) => {
    for (const e of fs.readdirSync(path.join(ROD, dir), { withFileTypes: true })) {
      const rel = path.join(dir, e.name);
      if (e.isDirectory()) gaa(rel);
      else if (/\.(ts|tsx)$/.test(e.name)) ud.push(rel);
    }
  };
  ['app', 'components', 'lib'].forEach(gaa);
  return ud;
}

const args = process.argv.slice(2);
const vis = args.includes('--vis');
const skiveIdx = args.indexOf('--skive');
let filer = args.filter((a, i) => !a.startsWith('--') && !(skiveIdx >= 0 && i === skiveIdx + 1));
const eksplicit = filer.length > 0 || skiveIdx >= 0;
if (skiveIdx >= 0) {
  const navn = args[skiveIdx + 1];
  if (!SKIVER[navn]) {
    console.error(`Ukendt skive: ${navn}`);
    process.exit(2);
  }
  filer = filer.concat(SKIVER[navn]);
}
if (!eksplicit) filer = alleFiler();
// Ordbogsfilerne er selve oversættelserne - de skal være danske/svenske/engelske.
filer = filer.filter((f) => !/^lib\/i18n\/(da|sv|en)\.ts$/.test(f) && !f.startsWith('lib/i18n/vaerksted/'));

let total = 0;
let medFund = 0;
const rapport = [];
for (const f of filer) {
  if (!fs.existsSync(path.join(ROD, f))) {
    rapport.push(`  (mangler) ${f}`);
    continue;
  }
  const fund = scanFil(f);
  total += fund.length;
  if (fund.length) medFund++;
  if (fund.length || eksplicit) rapport.push(`${String(fund.length).padStart(4)}  ${f}`);
  if (vis || eksplicit) for (const x of fund) rapport.push(`        L${x.linje}: ${x.tekst}`);
}
console.log(rapport.join('\n'));
console.log(`\n${total} UI-strenge i ${medFund} af ${filer.length} filer.`);
process.exit(eksplicit && total > 0 ? 1 : 0);
