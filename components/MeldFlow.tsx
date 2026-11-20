'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { IssueRow, Model } from '@/lib/types';
import { TYPE_META, type IssueType } from '@/lib/config';
import { PlatformSignal } from '@/components/Tags';
import ConfirmButton from '@/components/ConfirmButton';
import MeldForm from '@/components/MeldForm';

type Trin = 'soeg' | 'formular';

export default function MeldFlow({
  issues,
  models,
  myConfirmedIds,
  initialType = 'fejl',
}: {
  issues: IssueRow[];
  models: Model[];
  myConfirmedIds: string[];
  initialType?: IssueType;
}) {
  const router = useRouter();
  const [type, setType] = useState<IssueType>(initialType);
  const [trin, setTrin] = useState<Trin>('soeg');
  const [query, setQuery] = useState('');
  const [harSoegt, setHarSoegt] = useState(false);
  const mine = useMemo(() => new Set(myConfirmedIds), [myConfirmedIds]);

  const erOenske = type === 'oenske';
  const ting = erOenske ? 'ønske' : 'fejl';

  const match = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 3) return [];
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

  function soeg() {
    if (query.trim().length >= 3) setHarSoegt(true);
  }

  if (trin === 'formular') {
    return <MeldForm models={models} type={type} initialTitle={query} onBack={() => setTrin('soeg')} />;
  }

  return (
    <div className="kort mt-6 p-6">
      {/* Type-skifter */}
      <div className="mb-5 flex gap-1 rounded-lg bg-grafit-100 p-1">
        {(['fejl', 'oenske'] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setType(t);
              setHarSoegt(false);
            }}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              type === t ? 'bg-white text-grafit-900 shadow-sm' : 'text-grafit-500'
            }`}
          >
            {t === 'fejl' ? 'Meld en fejl' : 'Foreslå et ønske'}
          </button>
        ))}
      </div>

      <h2 className="text-lg font-semibold text-grafit-900">
        Først: er {erOenske ? 'ønsket' : 'fejlen'} allerede meldt?
      </h2>
      <p className="mt-1 text-sm text-grafit-600">
        Søg efter {erOenske ? 'dit ønske' : 'fejlen'}. Findes der noget, der ligner, så giv det et
        &quot;mig med&quot; i stedet — det vejer tungere end en ny dublet.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHarSoegt(false);
          }}
          onKeyDown={(e) => e.key === 'Enter' && soeg()}
          placeholder={erOenske ? "Fx 'trådløst CarPlay' eller 'mørkt tema'…" : "Fx 'opladning stopper' eller 'kort fryser'…"}
          className="input"
          autoFocus
        />
        <button onClick={soeg} disabled={query.trim().length < 3} className="btn-primary shrink-0">
          Søg
        </button>
      </div>

      {harSoegt && (
        <div className="mt-5">
          {match.length > 0 ? (
            <div className="rounded-xl border border-kobber-200 bg-kobber-50 p-4">
              <p className="font-semibold text-kobber-800">
                Findes {ting}en herunder? Så giv den et &quot;mig med&quot; i stedet.
              </p>
              <ul className="mt-3 grid gap-2">
                {match.map((i) => (
                  <li key={i.id} className="flex gap-3 rounded-lg border border-grafit-200 bg-white p-3">
                    <ConfirmButton
                      issueId={i.id}
                      models={i.models.map((m) => ({ id: m.id, name: m.name }))}
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
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-grafit-600">Er ingen af dem {erOenske ? 'dit ønske' : 'din fejl'}?</p>
              <button onClick={() => setTrin('formular')} className="btn-secondary mt-2">
                Nej, {erOenske ? 'mit ønske' : 'min fejl'} er ny → fortsæt
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-loest/40 bg-loest/5 p-4">
              <p className="font-semibold text-grafit-800">
                Ingen match — {erOenske ? 'dit ønske' : 'din fejl'} ser ud til at være ny.
              </p>
              <button onClick={() => setTrin('formular')} className="btn-primary mt-3">
                Fortsæt →
              </button>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => router.push('/')}
        className="mt-4 text-sm text-grafit-400 hover:text-grafit-600"
      >
        ← Tilbage til boardet
      </button>
    </div>
  );
}
