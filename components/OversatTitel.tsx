'use client';

// U3b (c): en meldings titel på LÆSERENS sprog. Er meldingen skrevet på et
// andet sprog, og findes der en (cachet) maskinoversættelse, vises den - med en
// lille linje "Oversat fra svensk · maskinoversat · Vis original". Originalen er
// altid ét klik væk og er record. Ingen oversættelse endnu -> originalen, uden linje.

import { useState } from 'react';
import Link from 'next/link';
import { useOrdbog, useSprog } from '@/lib/i18n/klient';
import type { Kildesprog } from '@/lib/kildesprog';
import { titelPaaSprog } from '@/lib/titel-oversaet-kerne';

export default function OversatTitel({
  titel,
  sprog,
  titler,
  href,
  tag: Tag = 'span',
  className = '',
  linkClassName = '',
}: {
  titel: string;
  sprog: Kildesprog;
  titler: Partial<Record<Kildesprog, string>>;
  href?: string;
  tag?: 'h1' | 'h3' | 'span' | 'p';
  className?: string;
  linkClassName?: string;
}) {
  const t = useOrdbog();
  const laeser = useSprog();
  const oversat = titelPaaSprog({ title: titel, sprog, titler }, laeser);
  const [visOriginal, setVisOriginal] = useState(false);
  const tekst = oversat && !visOriginal ? oversat : titel;

  return (
    <>
      <Tag className={className} lang={oversat && !visOriginal ? laeser : sprog}>
        {href ? (
          <Link href={href} className={linkClassName}>
            {tekst}
          </Link>
        ) : (
          tekst
        )}
      </Tag>
      {oversat && (
        <span className="mt-0.5 block text-xs text-grafit-400">
          {visOriginal ? null : <>{t.oversatTitel.oversatFra(t.oversatTitel.sprogNavn[sprog])} · </>}
          <button
            type="button"
            onClick={() => setVisOriginal((v) => !v)}
            className="font-medium text-kobber-700 hover:underline"
          >
            {visOriginal ? t.oversatTitel.visOversaettelse : t.oversatTitel.visOriginal}
          </button>
        </span>
      )}
    </>
  );
}
