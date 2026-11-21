'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { IssueRow, Model, MinBil } from '@/lib/types';
import type { IssueType } from '@/lib/config';
import { PlatformSignal } from '@/components/Tags';
import ConfirmButton from '@/components/ConfirmButton';
import MeldForm from '@/components/MeldForm';

type Trin = 'vaelg' | 'soeg' | 'tjek' | 'formular';

export default function MeldFlow({
  issues,
  models,
  userCar,
  myConfirmedIds,
  initialType = null,
  initialTitle = '',
  initialBody = '',
  fraForum,
}: {
  issues: IssueRow[];
  models: Model[];
  userCar: MinBil | null;
  myConfirmedIds: string[];
  initialType?: IssueType | null;
  initialTitle?: string;
  initialBody?: string;
  fraForum?: string;
}) {
  const router = useRouter();
  const [type, setType] = useState<IssueType | null>(initialType);
  const [trin, setTrin] = useState<Trin>(initialType ? 'soeg' : 'vaelg');
  const [query, setQuery] = useState(initialTitle);
  const [harSoegt, setHarSoegt] = useState(false);
  const mine = useMemo(() => new Set(myConfirmedIds), [myConfirmedIds]);

  const erOenske = type === 'oenske';
  const naesteEfterSoeg: Trin = erOenske ? 'formular' : 'tjek';

  const match = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 3 || !type) return [];
    const ord = q.split(/\s+/).filter(Boolean);
    return issues
      .filter((i) => i.type === type)
      .map((i) => {
        const hay = `${i.title} ${i.description} ${i.category ?? ''}`.toLowerCase();
        return { i, traef: ord.filter((o) => hay.includes(o)).length };
      })
      .filter((x) => x.traef > 0)
      .sort((a, b) => b.traef - a.traef || b.i.confirmations - a.i.confirmations)
      .slice(0, 6)
      .map((x) => x.i);
  }, [issues, query, type]);

  // Trin-indikator (vises når type er valgt).
  const trinListe: { key: Trin; navn: string }[] = erOenske
    ? [
        { key: 'soeg', navn: '1. Søg' },
        { key: 'formular', navn: '2. Udfyld' },
      ]
    : [
        { key: 'soeg', navn: '1. Søg' },
        { key: 'tjek', navn: '2. Tjek' },
        { key: 'formular', navn: '3. Udfyld' },
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
          <h2 className="text-lg font-semibold text-grafit-900">Hvad vil du melde?</h2>
          <p className="mt-1 text-sm text-grafit-600">
            Vælg om det er en <strong>fejl</strong> (noget der ikke virker) eller et{' '}
            <strong>ønske</strong> til ny funktionalitet.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => vaelgType('fejl')}
              className="rounded-xl border border-grafit-200 bg-white p-5 text-left transition-colors hover:border-kobber-500 hover:bg-kobber-50"
            >
              <span className="block text-base font-semibold text-grafit-900">En fejl</span>
              <span className="mt-0.5 block text-sm text-grafit-500">
                Noget i bilen virker ikke, som det skal.
              </span>
            </button>
            <button
              onClick={() => vaelgType('oenske')}
              className="rounded-xl border border-grafit-200 bg-white p-5 text-left transition-colors hover:border-kobber-500 hover:bg-kobber-50"
            >
              <span className="block text-base font-semibold text-grafit-900">Et ønske</span>
              <span className="mt-0.5 block text-sm text-grafit-500">
                En funktion eller forbedring, du ønsker Zeekr tilføjer.
              </span>
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
          <h2 className="text-lg font-semibold text-grafit-900">
            Først: er {erOenske ? 'ønsket' : 'fejlen'} allerede meldt?
          </h2>
          <p className="mt-1 text-sm text-grafit-600">
            Søg efter {erOenske ? 'dit ønske' : 'fejlen'}. Findes der noget, der ligner, så giv det
            et &quot;mig med&quot; i stedet - det vejer tungere end en ny dublet.
          </p>

          <div className="mt-4 flex gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHarSoegt(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && query.trim().length >= 3 && setHarSoegt(true)}
              placeholder={erOenske ? "Fx 'trådløst CarPlay'…" : "Fx 'opladning stopper'…"}
              className="input"
              autoFocus
            />
            <button
              onClick={() => query.trim().length >= 3 && setHarSoegt(true)}
              disabled={query.trim().length < 3}
              className="btn-primary shrink-0"
            >
              Søg
            </button>
          </div>

          {harSoegt && (
            <div className="mt-5">
              {match.length > 0 ? (
                <div className="rounded-xl border border-kobber-200 bg-kobber-50 p-4">
                  <p className="font-semibold text-kobber-800">
                    Findes den herunder? Så giv den et &quot;mig med&quot; i stedet.
                  </p>
                  <ul className="mt-3 grid gap-2">
                    {match.map((i) => (
                      <li key={i.id} className="flex gap-3 rounded-lg border border-grafit-200 bg-white p-3">
                        <ConfirmButton
                          issueId={i.id}
                          issueModelIds={i.models.map((m) => m.id)}
                          userCar={userCar}
                          initialCount={i.confirmations}
                          initialConfirmed={mine.has(i.id)}
                          isLoggedIn
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-grafit-900">{i.title}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                            {i.models.map((m) => (
                              <span key={m.slug} className="chip bg-grafit-100 text-grafit-700">
                                {m.name.replace('Zeekr ', '')}
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
                  <p className="mt-4 text-sm text-grafit-600">Er ingen af dem {erOenske ? 'dit ønske' : 'din fejl'}?</p>
                  <button onClick={() => setTrin(naesteEfterSoeg)} className="btn-secondary mt-2">
                    Nej, {erOenske ? 'mit ønske' : 'min fejl'} er ny → fortsæt
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-loest/40 bg-loest/5 p-4">
                  <p className="font-semibold text-grafit-800">
                    Ingen match - {erOenske ? 'dit ønske' : 'din fejl'} ser ud til at være ny.
                  </p>
                  <button onClick={() => setTrin(naesteEfterSoeg)} className="btn-primary mt-3">
                    Fortsæt →
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => (initialType ? router.push('/') : setTrin('vaelg'))}
            className="mt-4 text-sm text-grafit-400 hover:text-grafit-600"
          >
            {initialType ? '← Tilbage til boardet' : '← Vælg type igen'}
          </button>
        </div>
      )}

      {/* ===== TRIN 2: HURTIG-TJEK (kun fejl) ===== */}
      {trin === 'tjek' && (
        <div className="kort p-6 text-center">
          <h2 className="text-lg font-semibold text-grafit-900">Hurtig-tjek først</h2>
          <p className="mx-auto mt-2 max-w-md text-grafit-600">
            Har du prøvet en <strong>genstart af skærmen</strong> og tjekket at du er på{' '}
            <strong>nyeste OTA</strong>? En del software-bøvl forsvinder efter en genstart eller en
            opdatering - så slipper vi for dubletter.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button onClick={() => router.push('/')} className="btn-ghost justify-center !py-4">
              Ja - og det løste det
              <span className="block text-xs font-normal text-grafit-400">Så behøver vi ikke melde den. Tak!</span>
            </button>
            <button onClick={() => setTrin('formular')} className="btn-primary justify-center !py-4">
              Nej - fejlen er der stadig
              <span className="block text-xs font-normal text-white/80">Så melder vi den rigtigt →</span>
            </button>
          </div>
          <button onClick={() => setTrin('soeg')} className="mt-4 text-sm text-grafit-400 hover:text-grafit-600">
            ← Tilbage til søgning
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
