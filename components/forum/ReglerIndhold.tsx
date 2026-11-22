// Renderer forum-reglernes tekst sikkert (ingen rå HTML). Simpelt format:
//   "## Tekst"  -> underoverskrift
//   "- Tekst"   -> punkt (sammenhængende linjer bliver én liste)
//   tom linje   -> nyt afsnit
//   øvrige      -> afsnit (sammenhængende linjer slås sammen til ét)
type Blok =
  | { slags: 'h2'; tekst: string }
  | { slags: 'p'; tekst: string }
  | { slags: 'ul'; punkter: string[] };

function parse(content: string): Blok[] {
  const linjer = content.replace(/\r\n/g, '\n').split('\n');
  const blokke: Blok[] = [];
  let afsnit: string[] = [];
  let punkter: string[] = [];

  const flushAfsnit = () => {
    if (afsnit.length) {
      blokke.push({ slags: 'p', tekst: afsnit.join(' ') });
      afsnit = [];
    }
  };
  const flushListe = () => {
    if (punkter.length) {
      blokke.push({ slags: 'ul', punkter });
      punkter = [];
    }
  };

  for (const raa of linjer) {
    const linje = raa.trimEnd();
    if (linje.startsWith('## ')) {
      flushAfsnit();
      flushListe();
      blokke.push({ slags: 'h2', tekst: linje.slice(3).trim() });
    } else if (linje.startsWith('- ')) {
      flushAfsnit();
      punkter.push(linje.slice(2).trim());
    } else if (linje.trim() === '') {
      flushAfsnit();
      flushListe();
    } else {
      flushListe();
      afsnit.push(linje.trim());
    }
  }
  flushAfsnit();
  flushListe();
  return blokke;
}

export default function ReglerIndhold({ content }: { content: string }) {
  const blokke = parse(content);

  return (
    <div className="space-y-4">
      {blokke.map((b, i) => {
        if (b.slags === 'h2') {
          return (
            <h2
              key={i}
              className="pt-2 font-display text-lg font-semibold text-grafit-900"
            >
              {b.tekst}
            </h2>
          );
        }
        if (b.slags === 'ul') {
          return (
            <ul key={i} className="ml-1 space-y-1.5">
              {b.punkter.map((p, j) => (
                <li key={j} className="flex gap-2 text-grafit-700">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-kobber-500" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-grafit-700">
            {b.tekst}
          </p>
        );
      })}
    </div>
  );
}
