'use client';

import { useState } from 'react';
import type { OtaModelHistorik, SoftwareUpdate } from '@/lib/types';

// Kort model-label til chip: "Zeekr 7GT" -> "7GT".
function kort(navn: string): string {
  return navn.replace(/^Zeekr\s+/i, '');
}

// 'YYYY-MM-DD' -> dansk dato uden tid. Middag for at undgaa tz-dagskift.
function datoKort(iso: string): string {
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Europe/Copenhagen',
    });
  } catch {
    return iso;
  }
}

function VersionBlok({ u, aaben, toggle }: { u: SoftwareUpdate; aaben: boolean; toggle: () => void }) {
  return (
    <div className="overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={aaben}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-grafit-50"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-grafit-900">{u.version}</span>
            <span className="text-xs text-grafit-400">{datoKort(u.releasedAt)}</span>
            {u.modeller.length > 1 && (
              <span className="flex flex-wrap gap-1">
                {u.modeller.map((m) => (
                  <span
                    key={m.slug}
                    className="shrink-0 rounded-full bg-kobber-100 px-2 py-0.5 text-xs font-medium text-kobber-800"
                  >
                    {kort(m.name)}
                  </span>
                ))}
              </span>
            )}
          </div>
          {!aaben && (
            <div className="mt-0.5 text-xs text-grafit-400">
              {u.punkter.length} {u.punkter.length === 1 ? 'ændring' : 'ændringer'}
            </div>
          )}
        </div>
        <span className="shrink-0 text-grafit-300" aria-hidden="true">
          {aaben ? '▾' : '▸'}
        </span>
      </button>
      {aaben && (
        <div className="px-5 pb-4">
          {u.punkter.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-grafit-700">
              {u.punkter.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-grafit-400">Ingen punkter angivet.</p>
          )}
          {u.note && <p className="mt-3 text-sm italic text-grafit-500">{u.note}</p>}
        </div>
      )}
    </div>
  );
}

export default function SoftwareHistorik({ modeller }: { modeller: OtaModelHistorik[] }) {
  const [valgt, setValgt] = useState<string | null>(null); // null = Alle
  // Aabne versioner (id'er). Nyeste pr. model er aaben som udgangspunkt.
  const [aabne, setAabne] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const m of modeller) if (m.opdateringer[0]) s.add(m.opdateringer[0].id);
    return s;
  });
  const toggle = (id: string) =>
    setAabne((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  if (modeller.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-grafit-200 bg-grafit-50 p-6 text-center">
        <p className="text-grafit-600">Der er endnu ikke logget nogen OTA-opdateringer.</p>
        <p className="mt-1 text-sm text-grafit-400">
          Historikken fyldes efterhånden som der kommer opdateringer til modellerne.
        </p>
      </div>
    );
  }

  const visFilter = modeller.length >= 2;
  const synlige = valgt === null ? modeller : modeller.filter((m) => m.slug === valgt);

  const chipKlasse = (aktiv: boolean) =>
    aktiv
      ? 'rounded-full bg-kobber-600 px-3 py-1 text-sm font-medium text-white'
      : 'rounded-full border border-grafit-200 bg-white px-3 py-1 text-sm text-grafit-600 hover:border-grafit-300';

  return (
    <div>
      {visFilter && (
        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filtrér efter model">
          <button className={chipKlasse(valgt === null)} onClick={() => setValgt(null)}>
            Alle
          </button>
          {modeller.map((m) => (
            <button
              key={m.slug}
              className={chipKlasse(valgt === m.slug)}
              onClick={() => setValgt(m.slug)}
            >
              {kort(m.name)}
            </button>
          ))}
        </div>
      )}

      {synlige.map((m) => (
        <section key={m.slug} className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-grafit-900">{m.name}</h2>
            {m.nyesteVersion && (
              <span className="text-sm text-grafit-500">
                Nyeste: <span className="font-medium text-kobber-700">{m.nyesteVersion}</span>
              </span>
            )}
          </div>
          <div className="mt-3 divide-y divide-grafit-100 overflow-hidden rounded-xl border border-grafit-200 bg-white">
            {m.opdateringer.map((u) => (
              <VersionBlok key={`${m.slug}-${u.id}`} u={u} aaben={aabne.has(u.id)} toggle={() => toggle(u.id)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
