'use client';

import { useState, useTransition } from 'react';
import ModelBadge from '@/components/forum/ModelBadge';
import { saetModelArkiv, sletModel } from '@/app/admin/forum-actions';
import type { ModelOversigt } from '@/lib/queries-admin';

// Modeller-panel (P18): modstykket til "Tilføj model". Viser hver model med
// brugs-tal og giver slet (kun tomme) / arkivér (i brug) / genaktivér. Arkiverede
// modeller vises i egen dæmpet underdeling, så de kan genaktiveres. Admin-only
// (siden gater sektionen; RPC'erne er den egentlige grænse). Grafit/kobber.

function erTom(m: ModelOversigt): boolean {
  return m.antalBiler === 0 && m.antalBekraeftelser === 0 && m.antalTraade === 0;
}

function brugsTal(m: ModelOversigt): string {
  return `${m.antalBiler} biler · ${m.antalBekraeftelser} bekræftelser · ${m.antalTraade} tråde`;
}

function ModelRaekke({ m }: { m: ModelOversigt }) {
  const [pending, start] = useTransition();
  const [fejl, setFejl] = useState<string | null>(null);
  const [bekraeftSlet, setBekraeftSlet] = useState(false);
  const tom = erTom(m);

  function kør(fn: () => Promise<void>) {
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
    <li
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border p-3 ${
        m.archived
          ? 'border-grafit-200 bg-grafit-50 opacity-70'
          : 'border-grafit-200 bg-white'
      }`}
    >
      <ModelBadge slug={m.slug} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-grafit-900">{m.name}</span>
          <span className="shrink-0 rounded bg-grafit-100 px-1.5 py-0.5 text-[11px] font-medium text-grafit-500">
            {m.platform}
          </span>
          {m.archived && (
            <span className="shrink-0 rounded bg-grafit-200 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-grafit-600">
              Arkiveret
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-grafit-400">{brugsTal(m)}</p>
        {fejl && <p className="mt-1 text-xs text-kobber-700">{fejl}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {m.forumSlug && (
          <a
            href={`/forum/${m.forumSlug}`}
            target="_blank"
            className="text-xs text-grafit-400 hover:text-kobber-700 hover:underline"
          >
            Forum →
          </a>
        )}

        {m.archived ? (
          <button
            className="btn-ghost !py-1 text-sm"
            disabled={pending}
            onClick={() => kør(() => saetModelArkiv(m.slug, false))}
          >
            {pending ? 'Arbejder …' : 'Genaktivér'}
          </button>
        ) : tom ? null : (
          <button
            className="btn-ghost !py-1 text-sm"
            disabled={pending}
            onClick={() => kør(() => saetModelArkiv(m.slug, true))}
            title="Tag modellen ud af omløb - bevarer data og rapport, låser forummet (stadig læsbart)"
          >
            {pending ? 'Arbejder …' : 'Arkivér'}
          </button>
        )}

        {/* Slet: kun når modellen er tom (0 tråde, 0 biler, 0 bekræftelser). */}
        {tom &&
          (bekraeftSlet ? (
            <span className="flex items-center gap-2 text-sm">
              <span className="text-grafit-500">Slet helt?</span>
              <button
                className="font-medium text-kobber-700 hover:underline disabled:opacity-50"
                disabled={pending}
                onClick={() =>
                  kør(async () => {
                    await sletModel(m.slug);
                  })
                }
              >
                {pending ? 'Sletter …' : 'Ja, slet'}
              </button>
              <button
                className="text-grafit-400 hover:underline"
                disabled={pending}
                onClick={() => setBekraeftSlet(false)}
              >
                Fortryd
              </button>
            </span>
          ) : (
            <button
              className="rounded-lg border border-grafit-200 px-2.5 py-1 text-sm text-grafit-500 hover:border-kobber-300 hover:text-kobber-700 disabled:opacity-50"
              disabled={pending}
              onClick={() => setBekraeftSlet(true)}
              title="Modellen er tom og kan fjernes helt"
            >
              Slet
            </button>
          ))}
      </div>
    </li>
  );
}

export default function ModellerPanel({ modeller }: { modeller: ModelOversigt[] }) {
  const aktive = modeller.filter((m) => !m.archived);
  const arkiverede = modeller.filter((m) => m.archived);

  if (modeller.length === 0) {
    return <p className="text-sm text-grafit-400">Ingen modeller endnu.</p>;
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {aktive.map((m) => (
          <ModelRaekke key={m.id} m={m} />
        ))}
      </ul>

      {arkiverede.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-grafit-400">
            Arkiveret ({arkiverede.length})
          </p>
          <ul className="space-y-2">
            {arkiverede.map((m) => (
              <ModelRaekke key={m.id} m={m} />
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-grafit-400">
        En model kan kun slettes helt, når den er tom (0 tråde, 0 biler, 0 bekræftelser) - fx en
        fejloprettet testmodel. Er modellen i brug, så arkivér den i stedet: data og rapport bevares,
        og forummet låses men forbliver læsbart. Arkiverede modeller kan ikke længere vælges i Min
        garage, meld-flowet eller board-filteret.
      </p>
    </div>
  );
}
