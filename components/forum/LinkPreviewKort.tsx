'use client';

import { useState } from 'react';
import type { ForumLinkPreview } from '@/lib/types';
import { vaertAf } from '@/lib/forum-links';

// Facebook-stil link-preview-kort under et forumindlæg (P38). Open Graph-
// snapshottet er hentet + cachet server-side (SSRF-sikkert); her vises kun det.
//
// Valgt med Torben 25-11: billede ØVERST i fuldt format (som FB), IKKE en lille
// firkant i siden - et lille firkant-udsnit af et vilkårligt og:image (logo/
// wordmark/bredt banner) bliver grimt. Et sites og:image er lavet til 1.91:1 og
// ser godt ud netop når det får den plads. Prisen er et lidt større kort; vi
// holder bredden kompakt (max-w-sm) uden at beskære billedet.
//
// Billedet HOTLINKES: klientens browser henter det direkte fra kildens og:image-
// URL. referrerPolicy=no-referrer deler ikke vores domæne; onError skjuler
// billedet pænt hvis det er væk/ændret (forældelse er accepteret). Uden billede:
// kompakt tekst-kort med en kobber-accent-stribe i venstre kant.
export default function LinkPreviewKort({ preview }: { preview: ForumLinkPreview }) {
  const [billedFejl, setBilledFejl] = useState(false);
  const visBillede = !!preview.image && !billedFejl;

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={`group mt-2 block max-w-[340px] overflow-hidden rounded-xl border border-grafit-200 bg-white transition-all hover:border-kobber-300 hover:shadow-sm ${
        visBillede ? '' : 'border-l-[3px] border-l-kobber-400'
      }`}
    >
      {visBillede && (
        <div className="aspect-[1.91/1] w-full overflow-hidden bg-grafit-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.image!}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setBilledFejl(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>
      )}
      <div className="min-w-0 px-3.5 py-2.5">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-kobber-600">
          {vaertAf(preview.url)}
        </p>
        {preview.title && (
          <p className="mt-1 line-clamp-2 font-medium leading-snug text-grafit-900 group-hover:text-kobber-800">
            {preview.title}
          </p>
        )}
        {preview.description && (
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-grafit-500">
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
}
