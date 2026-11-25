'use client';

import { useState } from 'react';
import type { ForumLinkPreview } from '@/lib/types';
import { vaertAf } from '@/lib/forum-links';

// Kompakt link-preview-kort under et forumindlæg (P38). Lille firkantet billede
// i siden + tekst ved siden af = ét lavt kort på én række, i proportion med
// selve indlægget (et banner-øverst-kort råber højere end det folk skriver).
//
// Billedet HOTLINKES (låst med Torben): klientens browser henter selve billedet
// direkte fra kildens og:image-URL. referrerPolicy=no-referrer deler ikke vores
// domæne med kilden; onError skjuler billedet pænt hvis det er væk/ændret
// (forældelse er accepteret). INGEN egen bucket/proxy.
//
// Uden billede: kompakt tekst-kort med en kobber-accent-stribe i venstre kant.
export default function LinkPreviewKort({ preview }: { preview: ForumLinkPreview }) {
  const [billedFejl, setBilledFejl] = useState(false);
  const visBillede = !!preview.image && !billedFejl;

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={`group mt-2 flex max-w-md items-stretch overflow-hidden rounded-xl border border-grafit-200 bg-white transition-all hover:border-kobber-300 hover:shadow-sm ${
        visBillede ? '' : 'border-l-[3px] border-l-kobber-400'
      }`}
    >
      {visBillede && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview.image!}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setBilledFejl(true)}
          className="h-[72px] w-[72px] flex-none border-r border-grafit-200 object-cover sm:h-20 sm:w-20"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2">
        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-kobber-600">
          {vaertAf(preview.url)}
        </p>
        {preview.title && (
          <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug text-grafit-900 group-hover:text-kobber-800">
            {preview.title}
          </p>
        )}
        {preview.description && (
          <p className="mt-0.5 line-clamp-1 text-xs leading-snug text-grafit-500">
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
}
