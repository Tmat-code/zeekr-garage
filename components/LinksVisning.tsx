'use client';

import { useState } from 'react';
import type { LinkGruppe } from '@/lib/types';

// Kort model-label til chip/badge: "Zeekr 7GT" -> "7GT".
function kort(navn: string): string {
  return navn.replace(/^Zeekr\s+/i, '');
}

export default function LinksVisning({
  grupper,
  modeller,
}: {
  grupper: LinkGruppe[];
  modeller: { slug: string; name: string }[];
}) {
  // Hvilke modeller optraeder reelt paa et link? Filteret vises kun, naar mindst
  // to modeller er repraesenteret (ellers er der intet at filtrere paa).
  const brugte = new Set<string>();
  for (const g of grupper) for (const l of g.links) if (l.modelSlug) brugte.add(l.modelSlug);
  const chipModeller = modeller.filter((m) => brugte.has(m.slug));
  const visFilter = chipModeller.length >= 2;

  const [valgt, setValgt] = useState<string | null>(null); // null = Alle

  // Et link vises, hvis intet er valgt, eller det matcher den valgte model,
  // eller det er utagget ("gaelder alle").
  const synlig = (modelSlug: string | null) =>
    valgt === null || modelSlug === valgt || modelSlug === null;

  const chipKlasse = (aktiv: boolean) =>
    aktiv
      ? 'rounded-full bg-kobber-600 px-3 py-1 text-sm font-medium text-white'
      : 'rounded-full border border-grafit-200 bg-white px-3 py-1 text-sm text-grafit-600 hover:border-grafit-300';

  return (
    <div>
      {visFilter && (
        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filtrér efter model">
          <button className={chipKlasse(valgt === null)} onClick={() => setValgt(null)}>
            Alle
          </button>
          {chipModeller.map((m) => (
            <button
              key={m.slug}
              className={chipKlasse(valgt === m.slug)}
              onClick={() => setValgt(m.slug)}
            >
              {kort(m.name)}
            </button>
          ))}
        </div>
      )}

      {grupper.map((gruppe) => {
        const links = gruppe.links.filter((l) => synlig(l.modelSlug));
        if (links.length === 0) return null;
        return (
          <section key={gruppe.id} className="mt-8">
            <h2 className="font-display text-sm font-bold tracking-wide text-kobber-700">
              {gruppe.titel}
            </h2>
            <div className="mt-3 divide-y divide-grafit-100 overflow-hidden rounded-xl border border-grafit-200 bg-white">
              {links.map((l) => (
                <a
                  key={l.id}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-grafit-50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-grafit-900">{l.navn}</span>
                      {l.modelNavn && (
                        <span className="shrink-0 rounded-full bg-kobber-100 px-2 py-0.5 text-xs font-medium text-kobber-800">
                          {kort(l.modelNavn)}
                        </span>
                      )}
                    </div>
                    {l.kilde && <div className="text-xs text-grafit-400">{l.kilde}</div>}
                  </div>
                  <span className="text-grafit-300" aria-hidden="true">
                    ↗
                  </span>
                </a>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
