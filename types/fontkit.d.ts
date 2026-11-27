// Minimal typning af fontkit (afhængighed af pdfkit; bruges i lib/pdf-font.ts
// til at slå op om rapport-fonten har en glyf). Kun det vi bruger.
declare module 'fontkit' {
  export interface Font {
    hasGlyphForCodePoint(codePoint: number): boolean;
  }
  export function create(buffer: Buffer, postscriptName?: string): Font;
}
