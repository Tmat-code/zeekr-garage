import type { ReactNode } from 'react';

// Highlightet soege-uddrag. ts_headline markerer match med kontroltegn
// \u0001 (start) og \u0002 (stop) - de staar aldrig i rigtig tekst. Her
// splittes der paa dem, og match wrappes i <mark> (kobber). Ingen HTML fra
// databasen renders raa -> ingen injection.
const START = '\u0001';
const STOP = '\u0002';

export default function Uddrag({ tekst }: { tekst: string | null }) {
  if (!tekst) return null;

  const noder: ReactNode[] = [];
  const regex = /\u0001([\s\S]*?)\u0002/g;
  let sidst = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(tekst)) !== null) {
    if (m.index > sidst) noder.push(tekst.slice(sidst, m.index));
    noder.push(
      <mark key={i++} className="rounded bg-kobber-100 px-0.5 font-medium text-kobber-800">
        {m[1]}
      </mark>,
    );
    sidst = m.index + m[0].length;
  }
  if (sidst < tekst.length) noder.push(tekst.slice(sidst));

  // Faldt der ingen markoerer (kan ske hvis ts_headline ikke fandt et vindue),
  // ryd evt. loese kontroltegn og vis teksten som den er.
  if (noder.length === 0) noder.push(tekst.replace(/[\u0001\u0002]/g, ''));

  return <p className="mt-1 line-clamp-2 text-sm text-grafit-500">{noder}</p>;
}
