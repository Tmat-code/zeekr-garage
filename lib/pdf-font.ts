// P40: Unicode-font til PDF-rapporten.
//
// pdfkits indbyggede Helvetica kan kun WinAnsi, så alt uden for (emoji, ✓ ...)
// blev til skrald ("Ø=Ü~"). Vi indlejrer i stedet Liberation Sans (SIL OFL 1.1,
// assets/fonts/), som er METRISK IDENTISK med Helvetica/Arial: samme tegnbredder,
// så ombrydning og layout i rapporten er uændret. Fonten dækker æøå + bred
// latin/græsk/kyrillisk; hvad den ikke kan tegne, saniteres væk (lib/pdf-tekst.ts).
//
// Server-only (fs + fontkit). Fonte læses én gang pr. proces.

import fs from 'node:fs';
import path from 'node:path';
import * as fontkit from 'fontkit';
import { saniterTilFont } from './pdf-tekst';

export const PDF_FONT = 'LiberationSans';
export const PDF_FONT_FED = 'LiberationSans-Bold';
export const PDF_FONT_KURSIV = 'LiberationSans-Italic';

const FIL: Record<string, string> = {
  [PDF_FONT]: 'LiberationSans-Regular.ttf',
  [PDF_FONT_FED]: 'LiberationSans-Bold.ttf',
  [PDF_FONT_KURSIV]: 'LiberationSans-Italic.ttf',
};

// process.cwd() er projekt-roden i dev og /app i standalone-Dockeren; filerne
// kommer med i standalone via outputFileTracingIncludes i next.config.mjs.
const FONT_MAPPE = path.join(process.cwd(), 'assets', 'fonts');

type Fonte = { buffere: Record<string, Buffer>; harGlyf: (cp: number) => boolean };
let cache: Fonte | null = null;

function hentFonte(): Fonte {
  if (cache) return cache;
  const buffere: Record<string, Buffer> = {};
  const fk: fontkit.Font[] = [];
  for (const [navn, fil] of Object.entries(FIL)) {
    const buf = fs.readFileSync(path.join(FONT_MAPPE, fil));
    buffere[navn] = buf;
    fk.push(fontkit.create(buf));
  }
  // Et tegn er kun "tegnbart" hvis ALLE tre snit har det, så det samme tegn
  // aldrig opfører sig forskelligt i titel (fed) og brødtekst.
  const glyfCache = new Map<number, boolean>();
  const harGlyf = (cp: number) => {
    let svar = glyfCache.get(cp);
    if (svar === undefined) {
      svar = fk.every((f) => f.hasGlyphForCodePoint(cp));
      glyfCache.set(cp, svar);
    }
    return svar;
  };
  cache = { buffere, harGlyf };
  return cache;
}

/** Saniter en streng mod rapport-fonten (eksporteret til tests/genbrug). */
export function saniterPdfTekst(tekst: string): string {
  return saniterTilFont(tekst, hentFonte().harGlyf);
}

/**
 * Registrér de tre snit på dokumentet, sæt regular som standard, og læg
 * saniteringen ind som ét choke-point i doc.text - så ALT tekst (data, i18n,
 * kommentarer, footer) går gennem den, uden at hver kalde-sted skal huske det.
 */
export function forberedPdfFont(doc: PDFKit.PDFDocument): void {
  const { buffere, harGlyf } = hentFonte();
  for (const [navn, buf] of Object.entries(buffere)) doc.registerFont(navn, buf);
  doc.font(PDF_FONT);

  type TekstFn = (...args: unknown[]) => PDFKit.PDFDocument;
  const raa = (doc.text as unknown as TekstFn).bind(doc);
  (doc as unknown as { text: TekstFn }).text = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0] !== '') {
      const ren = saniterTilFont(args[0], harGlyf);
      // En tekst der KUN var emoji (fx kommentaren "🚗🚗🚗") må ikke blive tom:
      // pdfkit afslutter ikke en continued-linje på en tom streng, så næste
      // element ville tegnes oven i den. Ét mellemrum bevarer linjeflowet.
      args[0] = ren === '' ? ' ' : ren;
    }
    return raa(...args);
  };
}
