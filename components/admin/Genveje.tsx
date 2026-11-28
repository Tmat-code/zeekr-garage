import Link from 'next/link';
import type { VOrdbog } from '@/lib/i18n/vaerksted';

type Noegle = keyof VOrdbog['genveje'] & keyof VOrdbog['nav'];

type Genvej = {
  href: string;
  ikon: string;
  noegle: Noegle;
  fremhaev?: boolean;
  kunAdmin?: boolean;
};

// Genveje til Vaerkstedets flader. Feedback er den mest brugte -> fremhaevet
// foerst. Rummet vokser naturligt, saa P20/P21's nye flader (rapport-ko, Log)
// kan slottes ind uden omlaegning.
const GENVEJE: Genvej[] = [
  { href: '/admin/feedback', ikon: '🗒️', noegle: 'feedback', fremhaev: true },
  { href: '/admin/forum', ikon: '💬', noegle: 'forum' },
  { href: '/admin/beskeder', ikon: '🚩', noegle: 'anmeldelser' },
  { href: '/admin/kontakt', ikon: '📨', noegle: 'kontakt' },
  { href: '/admin/rapport', ikon: '📮', noegle: 'rapport' },
  { href: '/admin/aktivitet', ikon: '📈', noegle: 'aktivitet' },
  { href: '/admin/adgange', ikon: '👥', noegle: 'adgange' },
  { href: '/admin/links', ikon: '🔗', noegle: 'links', kunAdmin: true },
];

export default function Genveje({ v, erAdmin = false }: { v: VOrdbog; erAdmin?: boolean }) {
  const genveje = erAdmin ? GENVEJE : GENVEJE.filter((g) => !g.kunAdmin);
  return (
    <section className="rounded-2xl border border-grafit-200 bg-grafit-50 p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold text-grafit-900">{v.genveje.titel}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {genveje.map((g) => (
          <Link
            key={g.href}
            href={g.href}
            className={`flex items-start gap-3 rounded-xl border bg-white p-4 transition-colors hover:border-kobber-500 ${
              g.fremhaev ? 'border-kobber-300' : 'border-grafit-200'
            }`}
          >
            <span className="text-xl" aria-hidden>
              {g.ikon}
            </span>
            <div className="min-w-0">
              <div className="font-semibold text-grafit-900">{v.nav[g.noegle]}</div>
              <div className="text-sm text-grafit-500">{v.genveje[g.noegle]}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
