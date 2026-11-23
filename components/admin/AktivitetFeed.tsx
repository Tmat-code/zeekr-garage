import Link from 'next/link';
import { relativTid } from '@/lib/tid';
import type { AktivitetPost } from '@/lib/queries-admin';

const IKON: Record<AktivitetPost['kind'], string> = {
  melding: '🔧',
  bekraeftelse: '👍',
  forum_traad: '💬',
  forum_indlaeg: '↩️',
};

function tekst(a: AktivitetPost): JSX.Element {
  switch (a.kind) {
    case 'melding':
      return (
        <>
          Ny melding: <span className="font-medium">{a.titel}</span>
          {a.detalje && <span className="text-grafit-400"> · {a.detalje}</span>}
        </>
      );
    case 'bekraeftelse':
      return (
        <>
          Bekræftelse på <span className="font-medium">{a.titel}</span>
          {a.detalje && <span className="text-grafit-400"> · {a.detalje}</span>}
        </>
      );
    case 'forum_traad':
      return (
        <>
          Ny tråd: <span className="font-medium">{a.titel}</span>
          {a.detalje && <span className="text-grafit-400"> · {a.detalje}</span>}
        </>
      );
    case 'forum_indlaeg':
      return (
        <>
          Nyt svar i <span className="font-medium">{a.titel}</span>
        </>
      );
  }
}

export default function AktivitetFeed({
  poster,
  tom = 'Ingen aktivitet endnu.',
}: {
  poster: AktivitetPost[];
  tom?: string;
}) {
  if (poster.length === 0) {
    return <p className="text-sm text-grafit-500">{tom}</p>;
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
              <p className="text-sm text-grafit-800">{tekst(a)}</p>
              <p className="text-xs text-grafit-400">{relativTid(a.created_at)}</p>
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
