'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { relativTid } from '@/lib/tid';
import type {
  AdminForumTraad,
  AdminForumIndlaeg,
  ForumModTraadSide,
  ForumModIndlaegSide,
} from '@/lib/queries-admin';
import { saetFastgjort, saetLaast, modFjernTraad, modFjernIndlaeg } from '@/app/forum/actions';
import { hentForumTraade, hentForumIndlaeg } from '@/app/admin/actions';
import GrundVaelger from '@/components/forum/GrundVaelger';

const SIDE = 25;

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
  return { pending, fejl, koer };
}

// Lille maerke pr. raekke der "kraever opmaerksomhed" - synligt ogsaa i
// "Alle"-visningen, saa signalet ikke forsvinder naar filteret er slaaet fra.
function OpmMaerker({
  harRapport,
  forfatterSpaerret,
}: {
  harRapport: boolean;
  forfatterSpaerret: boolean;
}) {
  if (!harRapport && !forfatterSpaerret) return null;
  return (
    <>
      {harRapport && (
        <span
          title="Har en åben rapport"
          className="rounded-full bg-kobber-50 px-1.5 py-0.5 text-[11px] font-medium text-kobber-700"
        >
          ⚑ rapport
        </span>
      )}
      {forfatterSpaerret && (
        <span
          title="Forfatteren er spærret lige nu"
          className="rounded-full bg-kobber-100 px-1.5 py-0.5 text-[11px] font-medium text-kobber-800"
        >
          🚫 spærret
        </span>
      )}
    </>
  );
}

function opmRamme(harRapport: boolean, forfatterSpaerret: boolean): string {
  return harRapport || forfatterSpaerret ? 'border-kobber-200' : 'border-grafit-200';
}

function TraadRaekke({ t, onHandlet }: { t: AdminForumTraad; onHandlet: () => void }) {
  const { pending, fejl, koer } = useKoer();
  const [fjerner, setFjerner] = useState(false);
  const url = `/forum/${t.kategoriSlug}/${t.slug}`;

  return (
    <div
      className={`rounded-xl border bg-white p-4 ${opmRamme(t.harRapport, t.forfatterSpaerret)} ${
        pending ? 'opacity-60' : ''
      }`}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {t.isPinned && <span title="Fastgjort">📌</span>}
            {t.isLocked && <span title="Låst">🔒</span>}
            <Link href={url} className="font-medium text-grafit-900 hover:text-kobber-700">
              {t.title}
            </Link>
            <OpmMaerker harRapport={t.harRapport} forfatterSpaerret={t.forfatterSpaerret} />
          </div>
          <p className="mt-0.5 text-xs text-grafit-500">
            {t.kategoriNavn} · {t.forfatter || 'Ejer'} · {t.replyCount} svar · {t.viewCount} visninger ·{' '}
            {relativTid(t.lastPostAt)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <button
          className="btn-ghost !py-1 text-sm"
          disabled={pending}
          onClick={() => koer(() => saetFastgjort(t.id, t.kategoriSlug, t.slug, !t.isPinned).then(onHandlet))}
        >
          {t.isPinned ? 'Fjern fastgør.' : '📌 Fastgør'}
        </button>
        <button
          className="btn-ghost !py-1 text-sm"
          disabled={pending}
          onClick={() => koer(() => saetLaast(t.id, t.kategoriSlug, t.slug, !t.isLocked).then(onHandlet))}
        >
          {t.isLocked ? 'Lås op' : '🔒 Lås'}
        </button>
        <span className="flex-1" />
        <button
          className="rounded-lg border border-grafit-200 px-2.5 py-1 text-sm font-medium text-grafit-500 hover:border-kobber-500 hover:text-kobber-700"
          onClick={() => setFjerner((v) => !v)}
        >
          🗑 Fjern tråd
        </button>
      </div>

      {fjerner && (
        <GrundVaelger
          pending={pending}
          submitLabel="Fjern tråd + giv besked"
          onCancel={() => setFjerner(false)}
          onSubmit={(grund, fritekst) =>
            koer(async () => {
              await modFjernTraad(t.id, t.kategoriSlug, grund, fritekst);
              setFjerner(false);
              onHandlet();
            })
          }
        />
      )}
      {fejl && <p className="mt-2 text-xs text-kobber-700">{fejl}</p>}
    </div>
  );
}

function IndlaegRaekke({ p, onHandlet }: { p: AdminForumIndlaeg; onHandlet: () => void }) {
  const { pending, fejl, koer } = useKoer();
  const [fjerner, setFjerner] = useState(false);
  const url = `/forum/${p.kategoriSlug}/${p.traadSlug}`;

  return (
    <div
      className={`rounded-xl border bg-white p-4 ${opmRamme(p.harRapport, p.forfatterSpaerret)} ${
        pending ? 'opacity-60' : ''
      }`}
    >
      <p className="text-xs text-grafit-500">
        {p.forfatter || 'Ejer'} i{' '}
        <Link href={url} className="font-medium text-grafit-700 hover:text-kobber-700">
          {p.traadTitel}
        </Link>{' '}
        {p.isOpening && <span className="text-grafit-400">(åbning)</span>} · {relativTid(p.createdAt)}
      </p>
      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
        <OpmMaerker harRapport={p.harRapport} forfatterSpaerret={p.forfatterSpaerret} />
      </div>
      <p className="mt-1 line-clamp-3 text-sm text-grafit-800">{p.body}</p>

      <div className="mt-2 flex items-center gap-2 text-sm">
        <span className="flex-1" />
        {p.isOpening ? (
          <span className="text-xs text-grafit-400">Åbnings-indlæg - brug “Fjern tråd”</span>
        ) : (
          <button
            className="rounded-lg border border-grafit-200 px-2.5 py-1 text-sm font-medium text-grafit-500 hover:border-kobber-500 hover:text-kobber-700"
            onClick={() => setFjerner((v) => !v)}
          >
            🗑 Fjern
          </button>
        )}
      </div>

      {!p.isOpening && fjerner && (
        <GrundVaelger
          pending={pending}
          submitLabel="Fjern indlæg + giv besked"
          onCancel={() => setFjerner(false)}
          onSubmit={(grund, fritekst) =>
            koer(async () => {
              await modFjernIndlaeg(p.id, p.kategoriSlug, p.traadSlug, grund, fritekst);
              setFjerner(false);
              onHandlet();
            })
          }
        />
      )}
      {fejl && <p className="mt-2 text-xs text-kobber-700">{fejl}</p>}
    </div>
  );
}

export default function ForumModerering({
  initialTraade,
  initialIndlaeg,
}: {
  initialTraade: ForumModTraadSide;
  initialIndlaeg: ForumModIndlaegSide;
}) {
  // Delt soege-/filter-tilstand for begge kolonner.
  const [soeg, setSoeg] = useState('');
  const [kunOpm, setKunOpm] = useState(false);

  const [traade, setTraade] = useState<AdminForumTraad[]>(initialTraade.traade);
  const [traadTotal, setTraadTotal] = useState(initialTraade.total);
  const [indlaeg, setIndlaeg] = useState<AdminForumIndlaeg[]>(initialIndlaeg.indlaeg);
  const [indlaegTotal, setIndlaegTotal] = useState(initialIndlaeg.total);

  const [fejl, setFejl] = useState<string | null>(null);
  const [pendingT, startT] = useTransition();
  const [pendingI, startI] = useTransition();

  function filtre(offset: number) {
    return { soeg: soeg.trim(), kunOpm, limit: SIDE, offset };
  }

  // reset=true: ny soegning/filtrering (eller opdatering efter en handling) fra
  // offset 0. reset=false: "vis flere" - hent naeste side og haeng paa.
  function hentTraade(reset: boolean) {
    setFejl(null);
    startT(async () => {
      try {
        const r = await hentForumTraade(filtre(reset ? 0 : traade.length));
        setTraade((cur) => (reset ? r.traade : [...cur, ...r.traade]));
        setTraadTotal(r.total);
      } catch (e: any) {
        setFejl(e?.message ?? 'Kunne ikke hente tråde.');
      }
    });
  }

  function hentIndlaeg(reset: boolean) {
    setFejl(null);
    startI(async () => {
      try {
        const r = await hentForumIndlaeg(filtre(reset ? 0 : indlaeg.length));
        setIndlaeg((cur) => (reset ? r.indlaeg : [...cur, ...r.indlaeg]));
        setIndlaegTotal(r.total);
      } catch (e: any) {
        setFejl(e?.message ?? 'Kunne ikke hente indlæg.');
      }
    });
  }

  function soegBegge() {
    hentTraade(true);
    hentIndlaeg(true);
  }

  function saetFilter(v: boolean) {
    setKunOpm(v);
    // Hent med den nye vaerdi med det samme (state er asynkron, saa send eksplicit).
    setFejl(null);
    startT(async () => {
      try {
        const r = await hentForumTraade({ soeg: soeg.trim(), kunOpm: v, limit: SIDE, offset: 0 });
        setTraade(r.traade);
        setTraadTotal(r.total);
      } catch (e: any) {
        setFejl(e?.message ?? 'Kunne ikke hente tråde.');
      }
    });
    startI(async () => {
      try {
        const r = await hentForumIndlaeg({ soeg: soeg.trim(), kunOpm: v, limit: SIDE, offset: 0 });
        setIndlaeg(r.indlaeg);
        setIndlaegTotal(r.total);
      } catch (e: any) {
        setFejl(e?.message ?? 'Kunne ikke hente indlæg.');
      }
    });
  }

  const filtreret = kunOpm || soeg.trim() !== '';

  return (
    <div>
      {/* Delt soeg + filter */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <form
          className="min-w-[200px] flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            soegBegge();
          }}
        >
          <label className="label">Søg i titel eller forfatter</label>
          <div className="flex gap-2">
            <input
              type="search"
              className="input"
              placeholder="fx dæktryk eller et navn"
              value={soeg}
              onChange={(e) => setSoeg(e.target.value)}
            />
            <button type="submit" className="btn-primary !py-2.5" disabled={pendingT || pendingI}>
              Søg
            </button>
          </div>
        </form>
        <div>
          <label className="label">Vis</label>
          <div className="inline-flex overflow-hidden rounded-lg border border-grafit-300">
            <button
              type="button"
              onClick={() => saetFilter(false)}
              className={`px-3 py-2 text-sm font-medium ${
                kunOpm ? 'bg-white text-grafit-600 hover:bg-grafit-50' : 'bg-kobber-50 text-kobber-800'
              }`}
            >
              Alle
            </button>
            <button
              type="button"
              onClick={() => saetFilter(true)}
              className={`border-l border-grafit-300 px-3 py-2 text-sm font-medium ${
                kunOpm ? 'bg-kobber-50 text-kobber-800' : 'bg-white text-grafit-600 hover:bg-grafit-50'
              }`}
            >
              ⚑ Kræver opmærksomhed
            </button>
          </div>
        </div>
      </div>
      <p className="mb-4 text-xs text-grafit-400">
        "Kræver opmærksomhed" = tråde/indlæg der enten har en åben rapport, eller er skrevet af en
        bruger der lige nu er spærret.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Traade */}
        <div className="min-w-0">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-grafit-400">
            Tråde (viser {traade.length} af {traadTotal})
          </h3>
          {traade.length === 0 ? (
            <p className="text-sm text-grafit-500">
              {filtreret ? 'Ingen tråde matcher.' : 'Ingen tråde endnu.'}
            </p>
          ) : (
            <>
              <div className={`space-y-2.5 ${pendingT ? 'opacity-70' : ''}`}>
                {traade.map((t) => (
                  <TraadRaekke key={t.id} t={t} onHandlet={() => hentTraade(true)} />
                ))}
              </div>
              {traade.length < traadTotal && (
                <button
                  className="btn-ghost mt-3 !py-1.5 text-sm"
                  disabled={pendingT}
                  onClick={() => hentTraade(false)}
                >
                  Vis flere tråde
                </button>
              )}
            </>
          )}
        </div>

        {/* Indlaeg */}
        <div className="min-w-0">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-grafit-400">
            Indlæg (viser {indlaeg.length} af {indlaegTotal})
          </h3>
          {indlaeg.length === 0 ? (
            <p className="text-sm text-grafit-500">
              {filtreret ? 'Ingen indlæg matcher.' : 'Ingen indlæg endnu.'}
            </p>
          ) : (
            <>
              <div className={`space-y-2.5 ${pendingI ? 'opacity-70' : ''}`}>
                {indlaeg.map((p) => (
                  <IndlaegRaekke key={p.id} p={p} onHandlet={() => hentIndlaeg(true)} />
                ))}
              </div>
              {indlaeg.length < indlaegTotal && (
                <button
                  className="btn-ghost mt-3 !py-1.5 text-sm"
                  disabled={pendingI}
                  onClick={() => hentIndlaeg(false)}
                >
                  Vis flere indlæg
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {fejl && <p className="mt-3 text-sm text-kobber-700">{fejl}</p>}
    </div>
  );
}
