'use client';

// U3: labels på læserens sprog (t.config.*). Klient-komponent, så både
// server-sider (meldings-detaljen) og klient-komponenter (boardet) kan bruge den.

import { STATUS_STYLE, SEVERITY_STYLE, type Status, type Severity } from '@/lib/config';
import { useOrdbog } from '@/lib/i18n/klient';

export function StatusTag({ status }: { status: Status }) {
  const t = useOrdbog();
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.ny;
  return (
    <span className={`chip ${s.chip}`}>
      <span aria-hidden>{s.ikon}</span>
      {t.config.status[status] ?? s.label}
    </span>
  );
}

export function SeverityTag({ severity }: { severity: Severity }) {
  const t = useOrdbog();
  const s = SEVERITY_STYLE[severity] ?? SEVERITY_STYLE.middel;
  return <span className={`chip ${s.chip}`}>{t.config.alvor[severity] ?? s.label}</span>;
}

// "Rammer hele <platform>" naar en fejl er tagget til >1 model paa samme platform.
export function PlatformSignal({ platforms }: { platforms: string[] }) {
  const t = useOrdbog();
  const tael = platforms.reduce<Record<string, number>>((acc, p) => {
    acc[p] = (acc[p] ?? 0) + 1;
    return acc;
  }, {});
  const ramt = Object.entries(tael).find(([, n]) => n > 1);
  if (!ramt) return null;
  return <span className="chip bg-kobber-100 text-kobber-800">{t.feedback.rammerHele(ramt[0])}</span>;
}
