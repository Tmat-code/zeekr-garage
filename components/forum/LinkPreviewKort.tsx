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
export default function LinkPreviewKort({ preview }: { preview: ForumLinkPreview }) {
  const [billedFejl, setBilledFejl] = useState(false);
  const visBillede = !!preview.image && !billedFejl;

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="mt-2 flex max-w-xl overflow-hidden rounded-xl border border-grafit-200 bg-grafit-50 transition-colors hover:border-kobber-300 hover:bg-kobber-50"
    >
      {visBillede && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview.image!}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setBilledFejl(true)}
          className="h-[88px] w-[88px] flex-none border-r border-grafit-200 object-cover sm:h-28 sm:w-28"
        />
      )}
      <div className="min-w-0 flex-1 px-3 py-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-kobber-700">
          {vaertAf(preview.url)}
        </p>
        {preview.title && (
          <p className="mt-0.5 line-clamp-2 font-medium leading-snug text-grafit-900">
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
