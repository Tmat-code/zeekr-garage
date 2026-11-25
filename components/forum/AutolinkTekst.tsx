import { Fragment } from 'react';
import { autolinkSegmenter } from '@/lib/forum-links';

// Render body-tekst med klikbare URL'er (P38). Løser den oprindelige klage:
// links var ren tekst (whitespace-pre-line), ikke engang klikbare. URL'erne
// bliver <a target=_blank rel="noopener noreferrer nofollow">; resten af teksten
// er uændret, og parentens whitespace-pre-line bevarer linjeskift/indrykning.
export default function AutolinkTekst({ text }: { text: string }) {
  const segmenter = autolinkSegmenter(text);
  return (
    <>
      {segmenter.map((seg, i) =>
        seg.t === 'url' ? (
          <a
            key={i}
            href={seg.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="break-words font-medium text-kobber-700 underline decoration-kobber-300 underline-offset-2 hover:text-kobber-800"
          >
            {seg.s}
          </a>
        ) : (
          <Fragment key={i}>{seg.s}</Fragment>
        ),
      )}
    </>
  );
}
