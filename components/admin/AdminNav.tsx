'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Fane = { href: string; ikon: string; label: string };

// Vaerkstedets faner som en egen raekke. Ikon + kort label, og raekken
// wrapper (flex-wrap), saa den aldrig "sprenger" - nye flader (P20/P21's
// rapport-ko, en Log-flade) slottes bare ind og wrapper til naeste linje.
const FANER: Fane[] = [
  { href: '/admin', ikon: '📊', label: 'Overblik' },
  { href: '/admin/feedback', ikon: '🗒️', label: 'Feedback' },
  { href: '/admin/forum', ikon: '💬', label: 'Forum' },
  { href: '/admin/links', ikon: '🔗', label: 'Links' },
  { href: '/admin/ota', ikon: '📦', label: 'OTA' },
  { href: '/admin/beskeder', ikon: '🚩', label: 'Anmeldelser' },
  { href: '/admin/rapport', ikon: '📮', label: 'Rapport' },
  { href: '/admin/aktivitet', ikon: '📈', label: 'Aktivitet' },
  { href: '/admin/adgange', ikon: '👥', label: 'Adgange' },
  { href: '/admin/manual', ikon: '📖', label: 'Manual' },
];

function erAktiv(pathname: string, href: string): boolean {
  // Overblik kun ved praecist match (ellers lyser den paa alle underruter).
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(href + '/');
}

export default function AdminNav({ aabneRapporter = 0 }: { aabneRapporter?: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1.5">
      {FANER.map((f) => {
        const aktiv = erAktiv(pathname, f.href);
        // Åbne forum-rapporter -> kobber-badge på Forum-fanen.
        const badge = f.href === '/admin/forum' && aabneRapporter > 0 ? aabneRapporter : 0;
        return (
          <Link
            key={f.href}
            href={f.href}
            aria-current={aktiv ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              aktiv
                ? 'border-kobber-500 bg-kobber-50 text-kobber-800'
                : 'border-grafit-200 bg-white text-grafit-700 hover:border-kobber-500 hover:text-kobber-700'
            }`}
          >
            <span aria-hidden>{f.ikon}</span>
            {f.label}
            {badge > 0 && (
              <span className="ml-0.5 inline-flex min-w-[1.05rem] items-center justify-center rounded-full bg-kobber-600 px-1 text-[10px] font-bold leading-4 text-white">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
