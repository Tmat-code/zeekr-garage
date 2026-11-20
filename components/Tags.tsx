import { STATUS_STYLE, SEVERITY_STYLE, type Status, type Severity } from '@/lib/config';

export function StatusTag({ status }: { status: Status }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.ny;
  return (
    <span className={`chip ${s.chip}`}>
      <span aria-hidden>{s.ikon}</span>
      {s.label}
    </span>
  );
}

export function SeverityTag({ severity }: { severity: Severity }) {
  const s = SEVERITY_STYLE[severity] ?? SEVERITY_STYLE.middel;
  return <span className={`chip ${s.chip}`}>{s.label}</span>;
}

// "Rammer hele <platform>" naar en fejl er tagget til >1 model paa samme platform.
export function PlatformSignal({ platforms }: { platforms: string[] }) {
  const tael = platforms.reduce<Record<string, number>>((acc, p) => {
    acc[p] = (acc[p] ?? 0) + 1;
    return acc;
  }, {});
  const ramt = Object.entries(tael).find(([, n]) => n > 1);
  if (!ramt) return null;
  return (
    <span className="chip bg-kobber-100 text-kobber-800">
      rammer hele {ramt[0]}
    </span>
  );
}
