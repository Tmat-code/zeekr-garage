// P40: saniter tekst til PDF-rapporten, så tegn den indlejrede font ikke kan
// tegne aldrig bliver til skrald ("Ø=Ü~" for 👾).
//
// Ren funktion, nul app-imports: fonten gives som et glyf-opslag (harGlyf), så
// logikken kan testes uden pdfkit/fontkit. Wiringen bor i lib/pdf-font.ts.
//
// Regler, pr. kodepunkt:
//  1. Fonten har glyffen -> uændret (æøå, ×, citationstegn, €, … osv.).
//  2. Ellers en lille erstatningstabel for symboler med en tydelig betydning
//     (✓ -> √, ✗ -> ×, ★ -> *, ⚠ -> !) - kun hvis fonten har erstatningen.
//  3. Ellers fjernes tegnet (emoji, variant-selektorer, ZWJ, hudtoner ...).
// Fjernede tegn efterlader ikke dobbelte mellemrum, mellemrum sidst på linjen
// eller en tom linje, hvor tegnet stod alene (fx en linje kun med 👾).

export type HarGlyf = (kodepunkt: number) => boolean;

// Symbol -> erstatning. Bevidst lille: kun tegn hvor meningen er entydig.
export const ERSTATNING: Record<string, string> = {
  '✓': '√', // ✓ -> √
  '✔': '√', // ✔ -> √
  '☑': '√', // ☑ -> √
  '✅': '√', // ✅ -> √
  '✗': '×', // ✗ -> ×
  '✘': '×', // ✘ -> ×
  '☒': '×', // ☒ -> ×
  '❌': '×', // ❌ -> ×
  '★': '*', // ★
  '☆': '*', // ☆
  '⚠': '!', // ⚠
};

// Intern markør for et fjernet tegn (NUL forekommer ikke i rapport-tekst).
const FJERNET = '\u0000';

// Emoji-"lim" fjernes ALTID, også hvis fonten tilfældigvis har en glyf for det:
// ZWJ (👨‍👩‍👧), variant-selektorer (❤️), keycap (1️⃣) og tag-tegn (flag-varianter).
// Ellers står de tilbage mellem de fjernede emoji og giver dobbelte mellemrum.
function erEmojiLim(cp: number): boolean {
  return (
    cp === 0x200d ||
    (cp >= 0xfe00 && cp <= 0xfe0f) ||
    cp === 0x20e3 ||
    (cp >= 0xe0020 && cp <= 0xe007f)
  );
}

export function saniterTilFont(tekst: string, harGlyf: HarGlyf): string {
  if (!tekst) return tekst;

  let ud = '';
  let fjernede = false;
  for (const tegn of tekst) {
    const cp = tegn.codePointAt(0)!;
    // Linjeskift/tab er layout, ikke glyffer - pdfkit håndterer dem selv.
    if (tegn === '\n' || tegn === '\r' || tegn === '\t' || (!erEmojiLim(cp) && harGlyf(cp))) {
      ud += tegn;
      continue;
    }
    const erst = ERSTATNING[tegn];
    if (erst !== undefined && [...erst].every((e) => harGlyf(e.codePointAt(0)!))) {
      ud += erst;
      continue;
    }
    ud += FJERNET;
    fjernede = true;
  }
  if (!fjernede) return ud;

  const linjer: string[] = [];
  for (const linje of ud.split('\n')) {
    if (!linje.includes(FJERNET)) {
      linjer.push(linje);
      continue;
    }
    // En linje der KUN bestod af fjernede tegn (+ mellemrum) forsvinder helt,
    // inkl. sit linjeskift (fx beskrivelsen "...3.0.3\n👾").
    if (linje.replace(/[\u0000 \t\r]/g, '') === '') continue;
    // Ellers: højst ét mellemrum tilbage hvor tegnet stod, intet ved linje-start/-slut.
    linjer.push(
      linje.replace(/([ \t]*)\u0000+([ \t]*)/g, (m: string, foer: string, efter: string, offset: number, hel: string) => {
        const vedStart = offset === 0;
        const vedSlut = offset + m.length === hel.length || hel[offset + m.length] === '\r';
        if (vedStart || vedSlut) return '';
        // "Ole 👾: hej" -> "Ole: hej" (intet mellemrum foran tegnsætning).
        if (!efter && /[.,:;!?)\]»”’]/.test(hel[offset + m.length])) return '';
        return foer || efter ? ' ' : '';
      }),
    );
  }
  return linjer.join('\n');
}
