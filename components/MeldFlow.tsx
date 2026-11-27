'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { IssueRow, Model, GarageBil } from '@/lib/types';
import type { IssueType } from '@/lib/config';
import { PlatformSignal } from '@/components/Tags';
import ConfirmButton from '@/components/ConfirmButton';
import MeldForm from '@/components/MeldForm';
import OversatTitel from '@/components/OversatTitel';
import { useOrdbog } from '@/lib/i18n/klient';
import { kategoriLabelPaa } from '@/lib/config';
import { soegeOrd, soegeTraef } from '@/lib/titel-oversaet-kerne';

type Trin = 'vaelg' | 'soeg' | 'tjek' | 'formular';

export default function MeldFlow({
  issues,
  models,
  userCars,
  myCounts,
  initialType = null,
  initialTitle = '',
  initialBody = '',
  fraForum,
}: {
  issues: IssueRow[];
  models: Model[];
  userCars: GarageBil[];
  myCounts: Record<string, number>;
  initialType?: IssueType | null;
  initialTitle?: string;
  initialBody?: string;
  fraForum?: string;
}) {
  const router = useRouter();
  const t = useOrdbog();
  const m = t.meld;
  const [type, setType] = useState<IssueType | null>(initialType);
  const [trin, setTrin] = useState<Trin>(initialType ? 'soeg' : 'vaelg');
  const [query, setQuery] = useState(initialTitle);
  const [harSoegt, setHarSoegt] = useState(false);

  const erOenske = type === 'oenske';
  const naesteEfterSoeg: Trin = erOenske ? 'formular' : 'tjek';

  const match = useMemo(() => {
    // U3b: dublet-tjekket matcher også titlernes oversættelser (en svensker der
    // søger "bromsar" finder den danske "bremser"-melding) + let stamme-reduktion.
    if (query.trim().length < 3 || !type) return [];
    const ord = soegeOrd(query);
    return issues
      .filter((i) => i.type === type)
      .map((i) => ({
        i,
        traef: soegeTraef(
          i,
          [i.category ?? '', kategoriLabelPaa(i.category, t.config.kategori) ?? ''],
          ord,
        ),
      }))
      .filter((x) => x.traef > 0)
      .sort((a, b) => b.traef - a.traef || b.i.confirmations - a.i.confirmations)
      .slice(0, 6)
      .map((x) => x.i);
  }, [issues, query, type, t]);

  // Trin-indikator (vises når type er valgt).
  const trinListe: { key: Trin; navn: string }[] = erOenske
    ? [
        { key: 'soeg', navn: m.trinSoeg },
        { key: 'formular', navn: m.trinUdfyld(2) },
      ]
    : [
        { key: 'soeg', navn: m.trinSoeg },
        { key: 'tjek', navn: m.trinTjek },
        { key: 'formular', navn: m.trinUdfyld(3) },
      ];

  function vaelgType(t: IssueType) {
    setType(t);
    setTrin('soeg');
  }

  return (
    <div>
      {/* ===== TRIN 0: VÆLG TYPE ===== */}
      {trin === 'vaelg' && (
        <div className="kort mt-6 p-6">
          <h2 className="text-lg font-semibold text-grafit-900">{m.hvadVilDuMelde}</h2>
          <p className="mt-1 text-sm text-grafit-600">
            {m.vaelgFoer}
            <strong>{m.vaelgFejl}</strong>
            {m.vaelgMidt}
            <strong>{m.vaelgOenske}</strong>
            {m.vaelgEfter}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => vaelgType('fejl')}
              className="rounded-xl border border-grafit-200 bg-white p-5 text-left transition-colors hover:border-kobber-500 hover:bg-kobber-50"
            >
              <span className="block text-base font-semibold text-grafit-900">{m.enFejl}</span>
              <span className="mt-0.5 block text-sm text-grafit-500">{m.enFejlTekst}</span>
            </button>
            <button
              onClick={() => vaelgType('oenske')}
              className="rounded-xl border border-grafit-200 bg-white p-5 text-left transition-colors hover:border-kobber-500 hover:bg-kobber-50"
            >
              <span className="block text-base font-semibold text-grafit-900">{m.etOenske}</span>
              <span className="mt-0.5 block text-sm text-grafit-500">{m.etOenskeTekst}</span>
            </button>
          </div>
        </div>
      )}

      {/* Trin-indikator */}
      {trin !== 'vaelg' && (
        <ol className="mb-5 mt-6 flex items-center gap-2 text-xs font-medium">
          {trinListe.map((t, i) => {
            const aktiv = trin === t.key;
            const faerdig = trinListe.findIndex((x) => x.key === trin) > i;
            return (
              <li
                key={t.key}
                className={`rounded-full px-3 py-1 ${
                  aktiv
                    ? 'bg-kobber-500 text-white'
                    : faerdig
                      ? 'bg-grafit-900 text-white'
                      : 'bg-grafit-100 text-grafit-400'
                }`}
              >
                {t.navn}
              </li>
            );
          })}
        </ol>
      )}

      {/* ===== TRIN 1: SØG ===== */}
      {trin === 'soeg' && (
        <div className="kort p-6">
          <h2 className="text-lg font-semibold text-grafit-900">{m.soegTitel(erOenske)}</h2>
          <p className="mt-1 text-sm text-grafit-600">{m.soegTekst(erOenske)}</p>

          <div className="mt-4 flex gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHarSoegt(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && query.trim().length >= 3 && setHarSoegt(true)}
              placeholder={erOenske ? m.phOenske : m.phFejl}
              className="input"
              autoFocus
            />
            <button
              onClick={() => query.trim().length >= 3 && setHarSoegt(true)}
              disabled={query.trim().length < 3}
              className="btn-primary shrink-0"
            >
              {m.soeg}
            </button>
          </div>

          {harSoegt && (
            <div className="mt-5">
              {match.length > 0 ? (
                <div className="rounded-xl border border-kobber-200 bg-kobber-50 p-4">
                  <p className="font-semibold text-kobber-800">{m.findesHerunder}</p>
                  <ul className="mt-3 grid gap-2">
                    {match.map((i) => (
                      <li key={i.id} className="flex gap-3 rounded-lg border border-grafit-200 bg-white p-3">
                        <ConfirmButton
                          issueId={i.id}
                          issueModelIds={i.models.map((m) => m.id)}
                          userCars={userCars}
                          initialCount={i.confirmations}
                          initialMine={myCounts[i.id] ?? 0}
                          isLoggedIn
                        />
                        <div className="min-w-0 flex-1">
                          <OversatTitel
                            tag="p"
                            titel={i.title}
                            sprog={i.sprog}
                            titler={i.titler}
                            className="font-medium text-grafit-900"
                          />
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                            {i.models.map((mo) => (
                              <span key={mo.slug} className="chip bg-grafit-100 text-grafit-700">
                                {mo.name.replace('Zeekr ', '')}
                              </span>
                            ))}
                            <PlatformSignal platforms={i.models.map((m) => m.platform)} />
                            {i.software_version && (
                              <span className="chip bg-grafit-100 font-mono text-grafit-600">
                                {i.software_version}
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-sm text-grafit-600">{m.ingenErDin(erOenske)}</p>
                  <button onClick={() => setTrin(naesteEfterSoeg)} className="btn-secondary mt-2">
                    {m.nejNy(erOenske)}
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-loest/40 bg-loest/5 p-4">
                  <p className="font-semibold text-grafit-800">{m.ingenMatch(erOenske)}</p>
                  <button onClick={() => setTrin(naesteEfterSoeg)} className="btn-primary mt-3">
                    {m.fortsaet}
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => (initialType ? router.push('/feedback') : setTrin('vaelg'))}
            className="mt-4 text-sm text-grafit-400 hover:text-grafit-600"
          >
            {initialType ? m.tilbageBoard : m.vaelgTypeIgen}
          </button>
        </div>
      )}

      {/* ===== TRIN 2: HURTIG-TJEK (kun fejl) ===== */}
      {trin === 'tjek' && (
        <div className="kort p-6 text-center">
          <h2 className="text-lg font-semibold text-grafit-900">{m.tjekTitel}</h2>
          <p className="mx-auto mt-2 max-w-md text-grafit-600">
            {m.tjekFoer}
            <strong>{m.tjekGenstart}</strong>
            {m.tjekMidt}
            <strong>{m.tjekOta}</strong>
            {m.tjekEfter}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button onClick={() => router.push('/')} className="btn-ghost justify-center !py-4">
              {m.jaLoeste}
              <span className="block text-xs font-normal text-grafit-400">{m.jaLoesteSub}</span>
            </button>
            <button onClick={() => setTrin('formular')} className="btn-primary justify-center !py-4">
              {m.nejStadig}
              <span className="block text-xs font-normal text-white/80">{m.nejStadigSub}</span>
            </button>
          </div>
          <button onClick={() => setTrin('soeg')} className="mt-4 text-sm text-grafit-400 hover:text-grafit-600">
            {m.tilbageSoeg}
          </button>
        </div>
      )}

      {/* ===== TRIN 3: FORMULAR ===== */}
      {trin === 'formular' && (
        <MeldForm
          models={models}
          type={type ?? 'fejl'}
          initialTitle={query}
          initialBody={initialBody}
          fraForum={fraForum}
          onBack={() => setTrin(naesteEfterSoeg)}
        />
      )}
    </div>
  );
}
