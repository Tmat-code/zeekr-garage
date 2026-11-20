'use client';

import { useState, useTransition } from 'react';
import {
  STATUSES,
  SEVERITIES,
  STATUS_STYLE,
  SEVERITY_STYLE,
  TYPE_META,
  type Status,
  type Severity,
} from '@/lib/config';
import type { IssueRow } from '@/lib/types';
import {
  saetStatus,
  saetSeverity,
  markerLoest,
  sletMelding,
  gemRedigering,
} from '@/app/admin/actions';

function Raekke({ issue }: { issue: IssueRow }) {
  const [pending, start] = useTransition();
  const [fejl, setFejl] = useState<string | null>(null);
  const [redigerer, setRedigerer] = useState(false);
  const [bekraeftSlet, setBekraeftSlet] = useState(false);
  const [titel, setTitel] = useState(issue.title);
  const [beskrivelse, setBeskrivelse] = useState(issue.description);

  const type = TYPE_META[issue.type];
  const modelTekst = issue.models.map((m) => m.name).join(', ') || '—';

  function koer(fn: () => Promise<void>) {
    setFejl(null);
    start(async () => {
      try {
        await fn();
      } catch (e: any) {
        setFejl(e?.message ?? 'Noget gik galt.');
      }
    });
  }

  return (
    <div
      className={`rounded-xl border border-grafit-200 bg-white p-4 ${
        pending ? 'opacity-60' : ''
      }`}
    >
      <div className="flex flex-wrap items-start gap-3">
        {/* Stemmer */}
        <div className="flex min-w-[48px] flex-col items-center rounded-lg bg-grafit-50 px-2 py-1">
          <span className="text-xs text-grafit-400">▲</span>
          <span className="text-lg font-semibold tabular-nums text-grafit-900">
            {issue.confirmations}
          </span>
        </div>

        {/* Titel + meta */}
        <div className="min-w-0 flex-1">
          {redigerer ? (
            <div className="space-y-2">
              <input
                className="input"
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
                placeholder="Titel"
              />
              <textarea
                className="input min-h-[80px]"
                value={beskrivelse}
                onChange={(e) => setBeskrivelse(e.target.value)}
                placeholder="Beskrivelse"
              />
              <div className="flex gap-2">
                <button
                  className="btn-primary !py-1.5 text-sm"
                  disabled={pending}
                  onClick={() =>
                    koer(async () => {
                      await gemRedigering(issue.id, {
                        title: titel,
                        description: beskrivelse,
                      });
                      setRedigerer(false);
                    })
                  }
                >
                  Gem
                </button>
                <button
                  className="btn-ghost !py-1.5 text-sm"
                  onClick={() => {
                    setTitel(issue.title);
                    setBeskrivelse(issue.description);
                    setRedigerer(false);
                  }}
                >
                  Annullér
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-grafit-900">{issue.title}</span>
                <span className={`chip ${type.chip}`}>{type.badge}</span>
              </div>
              <p className="mt-0.5 text-xs text-grafit-500">
                {modelTekst}
                {issue.software_version && (
                  <span className="font-mono text-grafit-400">
                    {' '}
                    · {issue.software_version}
                  </span>
                )}
              </p>
            </>
          )}
        </div>
      </div>

      {!redigerer && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {/* Status */}
          <label className="flex items-center gap-1.5 text-xs text-grafit-500">
            Status
            <select
              className="rounded-lg border border-grafit-300 bg-white px-2 py-1 text-sm text-grafit-900"
              value={issue.status}
              disabled={pending}
              onChange={(e) => koer(() => saetStatus(issue.id, e.target.value as Status))}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_STYLE[s].label}
                </option>
              ))}
            </select>
          </label>

          {/* Alvorlighed */}
          <label className="flex items-center gap-1.5 text-xs text-grafit-500">
            Alvor
            <select
              className="rounded-lg border border-grafit-300 bg-white px-2 py-1 text-sm text-grafit-900"
              value={issue.severity}
              disabled={pending}
              onChange={(e) => koer(() => saetSeverity(issue.id, e.target.value as Severity))}
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {SEVERITY_STYLE[s].label}
                </option>
              ))}
            </select>
          </label>

          <span className="flex-1" />

          {issue.status !== 'loest_i_ota' && (
            <button
              className="rounded-lg border px-2.5 py-1 text-sm font-medium hover:bg-grafit-50"
              style={{ borderColor: '#4f6f4a', color: '#4f6f4a' }}
              disabled={pending}
              onClick={() => koer(() => markerLoest(issue.id))}
            >
              ✅ Markér løst
            </button>
          )}

          <button
            className="btn-ghost !px-2.5 !py-1 text-sm"
            onClick={() => setRedigerer(true)}
          >
            ✏️ Redigér
          </button>

          {bekraeftSlet ? (
            <span className="flex items-center gap-1">
              <button
                className="rounded-lg bg-kobber-600 px-2.5 py-1 text-sm font-semibold text-white hover:bg-kobber-700"
                disabled={pending}
                onClick={() => koer(() => sletMelding(issue.id))}
              >
                Bekræft slet
              </button>
              <button
                className="btn-ghost !px-2 !py-1 text-sm"
                onClick={() => setBekraeftSlet(false)}
              >
                Fortryd
              </button>
            </span>
          ) : (
            <button
              className="rounded-lg border border-grafit-200 px-2.5 py-1 text-sm font-medium text-grafit-500 hover:border-kobber-500 hover:text-kobber-700"
              onClick={() => setBekraeftSlet(true)}
            >
              🗑 Slet
            </button>
          )}
        </div>
      )}

      {fejl && <p className="mt-2 text-xs text-kobber-700">{fejl}</p>}
    </div>
  );
}

export default function ModereringsTabel({ issues }: { issues: IssueRow[] }) {
  // Sorteret som bugherrer: flest stemmer oeverst.
  const sorteret = [...issues].sort((a, b) => b.confirmations - a.confirmations);

  if (sorteret.length === 0) {
    return <p className="text-sm text-grafit-500">Ingen meldinger endnu.</p>;
  }

  return (
    <div className="space-y-2.5">
      {sorteret.map((i) => (
        <Raekke key={i.id} issue={i} />
      ))}
    </div>
  );
}
