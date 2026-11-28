import Link from 'next/link';
import { relativTid } from '@/lib/i18n/format';
import { ordbog, type UiSprog } from '@/lib/i18n';
import { vordbog } from '@/lib/i18n/vaerksted';
import type { AktivitetPost } from '@/lib/queries-admin';

const IKON: Record<AktivitetPost['kind'], string> = {
  melding: '🔧',
  bekraeftelse: '👍',
  forum_traad: '💬',
  forum_indlaeg: '↩️',
};

function tekst(a: AktivitetPost, sprog: UiSprog): JSX.Element {
  const t = vordbog(sprog).aktivitetFeed;
  // Typen af en ny melding (Fejl/Ønske) oversættes; øvrige detaljer er
  // DB-navne (kategori/model) og står som de er.
  const detalje = a.type ? ordbog(sprog).config.type[a.type].badge : a.detalje;
  const meta = detalje && <span className="text-grafit-400"> · {detalje}</span>;
  switch (a.kind) {
    case 'melding':
      return (
        <>
          {t.nyMelding} <span className="font-medium">{a.titel ?? t.enMelding}</span>
          {meta}
        </>
      );
    case 'bekraeftelse':
      return (
        <>
          {t.bekraeftelsePaa} <span className="font-medium">{a.titel ?? t.enMelding}</span>
          {meta}
        </>
      );
    case 'forum_traad':
      return (
        <>
          {t.nyTraad} <span className="font-medium">{a.titel ?? t.enTraad}</span>
          {meta}
        </>
      );
    case 'forum_indlaeg':
      return (
        <>
          {t.nytSvarI} <span className="font-medium">{a.titel ?? t.enTraad}</span>
        </>
      );
  }
}

export default function AktivitetFeed({
  poster,
  sprog,
  tom,
}: {
  poster: AktivitetPost[];
  sprog: UiSprog;
  tom?: string;
}) {
  if (poster.length === 0) {
    return <p className="text-sm text-grafit-500">{tom ?? vordbog(sprog).aktivitetFeed.ingen}</p>;
  }

  return (
    <ul className="divide-y divide-grafit-100">
      {poster.map((a, i) => {
        const indhold = (
          <>
            <span className="mt-0.5 text-base" aria-hidden>
              {IKON[a.kind]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-grafit-800">{tekst(a, sprog)}</p>
              <p className="text-xs text-grafit-400">{relativTid(a.created_at, sprog)}</p>
            </div>
          </>
        );
        return (
          <li key={i}>
            {a.href ? (
              <Link href={a.href} className="flex items-start gap-3 py-2.5 hover:bg-grafit-50">
                {indhold}
              </Link>
            ) : (
              <div className="flex items-start gap-3 py-2.5">{indhold}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
