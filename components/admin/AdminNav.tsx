'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useVOrdbog } from '@/lib/i18n/vaerksted/klient';
import type { VOrdbog } from '@/lib/i18n/vaerksted';

type Fane = {
  href: string;
  ikon: string;
  label: Exclude<keyof VOrdbog['nav'], 'aabneRapporter'>;
  kunAdmin?: boolean;
  kunSuperadmin?: boolean;
};

// Vaerkstedets faner som en egen raekke. Ikon + kort label, og raekken
// wrapper (flex-wrap), saa den aldrig "sprenger" - nye flader slottes bare
// ind og wrapper til naeste linje. kunAdmin-faner skjules helt for
// moderatorer (de skal ikke se, at der findes et admin-lag).
const FANER: Fane[] = [
  { href: '/admin', ikon: '📊', label: 'overblik' },
  { href: '/admin/feedback', ikon: '🗒️', label: 'feedback' },
  { href: '/admin/rapport', ikon: '📮', label: 'rapport' },
  { href: '/admin/forum', ikon: '💬', label: 'forum' },
  { href: '/admin/links', ikon: '🔗', label: 'links', kunAdmin: true },
  { href: '/admin/ota', ikon: '📦', label: 'ota', kunAdmin: true },
  { href: '/admin/beskeder', ikon: '🚩', label: 'anmeldelser' },
  { href: '/admin/kontakt', ikon: '📨', label: 'kontakt' },
  { href: '/admin/aktivitet', ikon: '📈', label: 'aktivitet' },
  { href: '/admin/adgange', ikon: '👥', label: 'adgange' },
  { href: '/admin/audit', ikon: '🕵️', label: 'audit', kunSuperadmin: true },
  { href: '/admin/manual', ikon: '📖', label: 'manual' },
];

function erAktiv(pathname: string, href: string): boolean {
  // Overblik kun ved praecist match (ellers lyser den paa alle underruter).
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(href + '/');
}

export default function AdminNav({
  aabneRapporter = 0,
  erAdmin = false,
  erSuperadmin = false,
}: {
  aabneRapporter?: number;
  erAdmin?: boolean;
  erSuperadmin?: boolean;
}) {
  const pathname = usePathname();
  const v = useVOrdbog();
  // kunAdmin-faner skjules for moderatorer; kunSuperadmin-faner (Audit) vises kun
  // for superadmin. (superadmin er superset, saa erAdmin er ogsaa sand for den.)
  const faner = FANER.filter(
    (f) => (!f.kunAdmin || erAdmin) && (!f.kunSuperadmin || erSuperadmin),
  );

  return (
    <nav className="flex flex-wrap gap-1.5">
      {faner.map((f) => {
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
            {v.nav[f.label]}
            {badge > 0 && (
              <span
                title={v.nav.aabneRapporter(badge)}
                className="ml-0.5 inline-flex min-w-[1.05rem] items-center justify-center rounded-full bg-kobber-600 px-1 text-[10px] font-bold leading-4 text-white">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
