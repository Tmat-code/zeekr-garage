'use client';

import { useState } from 'react';
import type { ForumLinkPreview } from '@/lib/types';
import { vaertAf } from '@/lib/forum-links';

// Facebook-stil link-preview-kort under et forumindlæg (P38). Open Graph-
// snapshottet er hentet + cachet server-side (SSRF-sikkert); her vises kun det.
//
// Billedet HOTLINKES (låst med Torben): klientens browser henter selve billedet
// direkte fra kildens og:image-URL. referrerPolicy=no-referrer deler ikke vores
// domæne med kilden; onError skjuler billedet pænt hvis det er væk/ændret
// (forældelse er accepteret - vi bekæmper den ikke). INGEN egen bucket/proxy.
//
// Layout: billede ØVERST (bredt banner, som FB), så footer med vært/titel/
// beskrivelse. Uden billede falder det tilbage til en kompakt variant med en
// kobber-accent-stribe i venstre kant, så det ikke bliver en flad grå kasse.
export default function LinkPreviewKort({ preview }: { preview: ForumLinkPreview }) {
  const [billedFejl, setBilledFejl] = useState(false);
  const visBillede = !!preview.image && !billedFejl;

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={`group mt-2 block max-w-[18rem] overflow-hidden rounded-xl border border-grafit-200 bg-white transition-all hover:border-kobber-300 hover:shadow-sm ${
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
