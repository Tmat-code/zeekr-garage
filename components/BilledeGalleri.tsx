'use client';

import { useCallback, useEffect, useState } from 'react';

// Billed-galleri med lightbox. Thumbnails åbner billedet i et overlay i selve
// siden (ikke en ny fane), med kryds, luk på Esc og klik uden for billedet.
export default function BilledeGalleri({
  billeder,
  alt = 'Billede',
}: {
  billeder: string[];
  alt?: string;
}) {
  const [aaben, setAaben] = useState<number | null>(null);

  const luk = useCallback(() => setAaben(null), []);

  useEffect(() => {
    if (aaben === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') luk();
    };
    window.addEventListener('keydown', onKey);
    // Lås baggrunds-scroll mens overlayet er åbent.
    const forrige = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = forrige;
    };
  }, [aaben, luk]);

  if (billeder.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {billeder.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setAaben(i)}
            className="overflow-hidden rounded-lg border border-grafit-200 transition hover:border-kobber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-kobber-400"
            aria-label={`Åbn ${alt.toLowerCase()} ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${alt} ${i + 1}`}
              loading="lazy"
              className="max-h-64 object-cover"
            />
          </button>
        ))}
      </div>

      {aaben !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${alt} ${aaben + 1}`}
          onClick={luk}
          className="fixed inset-0 z-50 flex items-center justify-center bg-grafit-900/80 p-4"
        >
          <button
            type="button"
            onClick={luk}
            aria-label="Luk billede"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl font-semibold text-grafit-700 shadow-lg transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-kobber-400"
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={billeder[aaben]}
            alt={`${alt} ${aaben + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
