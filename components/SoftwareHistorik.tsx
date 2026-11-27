'use client';

import { useState } from 'react';
import type { OtaModelHistorik, SoftwareUpdate } from '@/lib/types';
import { useOrdbog, useSprog } from '@/lib/i18n/klient';
import { datoKort } from '@/lib/i18n/format';

// Record<->snak: OTA-historikken her er record'en; selve diskussionen bor i det
// relevante MODEL-forum (beslutning 27-11: den tvaergaaende Software & OTA-kategori
// fjernet - en OTA-snak er alligevel model-specifik, og /software daekker "hvad
// aendrede sig"). Hver version-blok linker derfor til dens models eget forum
// (/forum/<slug>; en models forum-kategori-slug == model-slug, jf. forum-seed/P17).

// Kort model-label til chip: "Zeekr 7GT" -> "7GT".
function kort(navn: string): string {
  return navn.replace(/^Zeekr\s+/i, '');
}

function VersionBlok({
  u,
  aaben,
  toggle,
  forumHref,
  modelLabel,
}: {
  u: SoftwareUpdate;
  aaben: boolean;
  toggle: () => void;
  forumHref: string;
  modelLabel: string;
}) {
  const t = useOrdbog();
  const sprog = useSprog();
  // U1b: maskinoversat udgave (kun sat på sv/en når den lykkedes). Dansk læser og
  // en fejlet oversættelse viser originalen uden knap.
  const [visOriginal, setVisOriginal] = useState(false);
  const oversat = u.oversat ?? null;
  const brugOversat = !!oversat && !visOriginal;
  const punkter = brugOversat ? oversat.punkter : u.punkter;
  const note = brugOversat ? oversat.note : u.note;
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
            <span className="text-xs text-grafit-400">{datoKort(u.releasedAt, sprog)}</span>
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
              {t.software.aendringer(u.punkter.length)}
            </div>
          )}
        </div>
        <span className="shrink-0 text-grafit-300" aria-hidden="true">
          {aaben ? '▾' : '▸'}
        </span>
      </button>
      {aaben && (
        <div className="px-5 pb-4">
          {punkter.length > 0 ? (
            <ul
              className="list-disc space-y-1 pl-5 text-sm text-grafit-700"
              lang={brugOversat ? sprog : 'da'}
            >
              {punkter.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-grafit-400">{t.software.ingenPunkter}</p>
          )}
          {note && (
            <p className="mt-3 text-sm italic text-grafit-500" lang={brugOversat ? sprog : 'da'}>
              {note}
            </p>
          )}
          {oversat && (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-grafit-400">
              {brugOversat && <span>{t.software.oversatFraDansk}</span>}
              <button
                type="button"
                onClick={() => setVisOriginal(!visOriginal)}
                className="font-medium text-kobber-700 hover:text-kobber-800 hover:underline"
              >
                {visOriginal ? t.software.visOversaettelse : t.software.visOriginal}
              </button>
            </div>
          )}
          <a
            href={forumHref}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-kobber-700 hover:text-kobber-800 hover:underline"
          >
            {t.software.diskuter(modelLabel)} <span aria-hidden="true">→</span>
          </a>
        </div>
      )}
    </div>
  );
}

export default function SoftwareHistorik({ modeller }: { modeller: OtaModelHistorik[] }) {
  const t = useOrdbog();
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
        <p className="text-grafit-600">{t.software.tomTitel}</p>
        <p className="mt-1 text-sm text-grafit-400">{t.software.tomTekst}</p>
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
        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label={t.faelles.filtrerModel}>
          <button className={chipKlasse(valgt === null)} onClick={() => setValgt(null)}>
            {t.faelles.alle}
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
                {t.software.nyeste} <span className="font-medium text-kobber-700">{m.nyesteVersion}</span>
              </span>
            )}
          </div>
          <div className="mt-3 divide-y divide-grafit-100 overflow-hidden rounded-xl border border-grafit-200 bg-white">
            {m.opdateringer.map((u) => (
              <VersionBlok
                key={`${m.slug}-${u.id}`}
                u={u}
                aaben={aabne.has(u.id)}
                toggle={() => toggle(u.id)}
                forumHref={`/forum/${m.slug}`}
                modelLabel={kort(m.name)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
