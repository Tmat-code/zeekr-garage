'use client';

import { useState, useTransition } from 'react';
import type { ForumGruppe, ForumKategoriStat } from '@/lib/types';
import {
  opretKategori,
  retKategori,
  saetKategoriLaast,
  flytKategori,
  sletKategori,
} from '@/app/admin/forum-actions';

function useKoer() {
  const [pending, start] = useTransition();
  const [fejl, setFejl] = useState<string | null>(null);
  const koer = (fn: () => Promise<void>) => {
    setFejl(null);
    start(async () => {
      try {
        await fn();
      } catch (e: any) {
        setFejl(e?.message ?? 'Noget gik galt.');
      }
    });
  };
  return { pending, fejl, koer, setFejl };
}

function KategoriRaekke({ k, erForst, erSidst }: { k: ForumKategoriStat; erForst: boolean; erSidst: boolean }) {
  const { pending, fejl, koer } = useKoer();
  const [redigerer, setRedigerer] = useState(false);
  const [bekraeftSlet, setBekraeftSlet] = useState(false);
  const [navn, setNavn] = useState(k.name);
  const [ikon, setIkon] = useState(k.icon ?? '💬');
  const [beskrivelse, setBeskrivelse] = useState(k.description ?? '');

  return (
    <div className={`rounded-xl border border-grafit-200 bg-white p-3 ${pending ? 'opacity-60' : ''}`}>
      {redigerer ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              className="input w-16 text-center"
              value={ikon}
              onChange={(e) => setIkon(e.target.value)}
              aria-label="Ikon"
              maxLength={4}
            />
            <input
              className="input flex-1"
              value={navn}
              onChange={(e) => setNavn(e.target.value)}
              placeholder="Navn"
            />
          </div>
          <textarea
            className="input min-h-[60px]"
            value={beskrivelse}
            onChange={(e) => setBeskrivelse(e.target.value)}
            placeholder="Beskrivelse"
          />
          <div className="flex gap-2">
            <button
              className="btn-primary !py-1.5 text-sm"
              disabled={pending || !navn.trim()}
              onClick={() =>
                koer(async () => {
                  await retKategori(k.id, { name: navn, icon: ikon, description: beskrivelse });
                  setRedigerer(false);
                })
              }
            >
              Gem
            </button>
            <button
              className="btn-ghost !py-1.5 text-sm"
              onClick={() => {
                setNavn(k.name);
                setIkon(k.icon ?? '💬');
                setBeskrivelse(k.description ?? '');
                setRedigerer(false);
              }}
            >
              Annullér
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-lg" aria-hidden="true">{k.icon ?? '💬'}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-grafit-900">{k.name}</span>
              {k.isLocked && <span className="text-xs text-grafit-400" title="Låst">🔒</span>}
              <span className="shrink-0 text-xs text-grafit-400">{k.traade} tråde</span>
            </div>
            {k.description && <p className="truncate text-xs text-grafit-500">{k.description}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              className="rounded px-1.5 py-1 text-grafit-400 hover:bg-grafit-100 hover:text-grafit-700 disabled:opacity-30"
              disabled={pending || erForst}
              title="Flyt op"
              onClick={() => koer(() => flytKategori(k.id, 'op'))}
            >
              ↑
            </button>
            <button
              className="rounded px-1.5 py-1 text-grafit-400 hover:bg-grafit-100 hover:text-grafit-700 disabled:opacity-30"
              disabled={pending || erSidst}
              title="Flyt ned"
              onClick={() => koer(() => flytKategori(k.id, 'ned'))}
            >
              ↓
            </button>
            <button
              className="rounded px-2 py-1 text-xs text-grafit-500 hover:text-kobber-700"
              disabled={pending}
              onClick={() => koer(() => saetKategoriLaast(k.id, !k.isLocked))}
            >
              {k.isLocked ? 'Lås op' : 'Lås'}
            </button>
            <button
              className="rounded px-2 py-1 text-xs text-grafit-500 hover:text-kobber-700"
              onClick={() => setRedigerer(true)}
            >
              ✏️
            </button>
            {bekraeftSlet ? (
              <>
                <button
                  className="rounded bg-kobber-600 px-2 py-1 text-xs font-semibold text-white"
                  disabled={pending}
                  onClick={() => koer(() => sletKategori(k.id))}
                >
                  Slet?
                </button>
                <button className="px-1 text-xs text-grafit-400" onClick={() => setBekraeftSlet(false)}>
                  ✕
                </button>
              </>
            ) : (
              <button
                className="rounded px-2 py-1 text-xs text-grafit-400 hover:text-kobber-700"
                onClick={() => setBekraeftSlet(true)}
              >
                🗑
              </button>
            )}
          </div>
        </div>
      )}
      {fejl && <p className="mt-2 text-xs text-kobber-700">{fejl}</p>}
    </div>
  );
}

function NyKategori({ grupper }: { grupper: ForumGruppe[] }) {
  const { pending, fejl, koer } = useKoer();
  const [aaben, setAaben] = useState(false);
  const [navn, setNavn] = useState('');
  const [gruppe, setGruppe] = useState(grupper[0]?.label ?? '');
  const [ikon, setIkon] = useState('💬');
  const [beskrivelse, setBeskrivelse] = useState('');

  if (!aaben) {
    return (
      <button className="btn-ghost text-sm" onClick={() => setAaben(true)}>
        + Ny kategori
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-grafit-300 bg-grafit-50 p-4">
      <div className="grid gap-2 sm:grid-cols-[4rem_1fr]">
        <input
          className="input text-center"
          value={ikon}
          onChange={(e) => setIkon(e.target.value)}
          aria-label="Ikon"
          maxLength={4}
        />
        <input
          className="input"
          value={navn}
          onChange={(e) => setNavn(e.target.value)}
          placeholder="Kategoriens navn"
        />
      </div>
      <div className="mt-2">
        <input
          className="input"
          value={gruppe}
          onChange={(e) => setGruppe(e.target.value)}
          placeholder="Gruppe (fx Teknik)"
          list="forum-grupper"
        />
        <datalist id="forum-grupper">
          {grupper.map((g) => (
            <option key={g.label} value={g.label} />
          ))}
        </datalist>
      </div>
      <textarea
        className="input mt-2 min-h-[60px]"
        value={beskrivelse}
        onChange={(e) => setBeskrivelse(e.target.value)}
        placeholder="Kort beskrivelse (valgfri)"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          className="btn-primary !py-1.5 text-sm"
          disabled={pending || !navn.trim() || !gruppe.trim()}
          onClick={() =>
            koer(async () => {
              await opretKategori({ name: navn, groupLabel: gruppe, icon: ikon, description: beskrivelse });
              setNavn('');
              setBeskrivelse('');
              setAaben(false);
            })
          }
        >
          Opret
        </button>
        <button className="btn-ghost !py-1.5 text-sm" onClick={() => setAaben(false)}>
          Annullér
        </button>
        {fejl && <span className="text-sm text-kobber-700">{fejl}</span>}
      </div>
    </div>
  );
}

export default function KategoriStyring({ grupper }: { grupper: ForumGruppe[] }) {
  return (
    <div className="space-y-6">
      {grupper.map((g) => (
        <div key={g.label}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-grafit-400">
            {g.label}
          </h3>
          <div className="space-y-2">
            {g.kategorier.map((k, i) => (
              <KategoriRaekke
                key={k.id}
                k={k}
                erForst={i === 0}
                erSidst={i === g.kategorier.length - 1}
              />
            ))}
          </div>
        </div>
      ))}
      <NyKategori grupper={grupper} />
    </div>
  );
}
