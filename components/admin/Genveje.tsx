import Link from 'next/link';

type Genvej = {
  href: string;
  ikon: string;
  titel: string;
  tekst: string;
  fremhaev?: boolean;
};

// Genveje til Vaerkstedets flader. Feedback er den mest brugte -> fremhaevet
// foerst. Rummet vokser naturligt, saa P20/P21's nye flader (rapport-ko, Log)
// kan slottes ind uden omlaegning.
const GENVEJE: Genvej[] = [
  { href: '/admin/feedback', ikon: '🗒️', titel: 'Feedback', tekst: 'Moderér meldinger + oprydning', fremhaev: true },
  { href: '/admin/forum', ikon: '💬', titel: 'Forum', tekst: 'Tråde, kategorier og regler' },
  { href: '/admin/beskeder', ikon: '🚩', titel: 'Anmeldelser', tekst: 'Anmeldte private beskeder' },
  { href: '/admin/rapport', ikon: '📮', titel: 'Rapport', tekst: 'Saml Zeekr-rapport (PDF/CSV)' },
  { href: '/admin/aktivitet', ikon: '📈', titel: 'Aktivitet', tekst: 'Mønstre over tid' },
  { href: '/admin/adgange', ikon: '👥', titel: 'Adgange', tekst: 'Brugere og roller' },
  { href: '/admin/links', ikon: '🔗', titel: 'Links', tekst: 'Nyttige links på /links' },
];

export default function Genveje() {
  return (
    <section className="rounded-2xl border border-grafit-200 bg-grafit-50 p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold text-grafit-900">Genveje</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GENVEJE.map((g) => (
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
              <div className="font-semibold text-grafit-900">{g.titel}</div>
              <div className="text-sm text-grafit-500">{g.tekst}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
