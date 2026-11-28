'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { relativTid } from '@/lib/i18n/format';
import { useSprog } from '@/lib/i18n/klient';
import { useVOrdbog } from '@/lib/i18n/vaerksted/klient';
import { useVKoer, type HentFejl } from '@/components/admin/useVKoer';
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

// Lille maerke pr. raekke der "kraever opmaerksomhed" - synligt ogsaa i
// "Alle"-visningen, saa signalet ikke forsvinder naar filteret er slaaet fra.
function OpmMaerker({
  harRapport,
  forfatterSpaerret,
}: {
  harRapport: boolean;
  forfatterSpaerret: boolean;
}) {
  const m = useVOrdbog().forumMod;
  if (!harRapport && !forfatterSpaerret) return null;
  return (
    <>
      {harRapport && (
        <span
          title={m.harRapportTitle}
          className="rounded-full bg-kobber-50 px-1.5 py-0.5 text-[11px] font-medium text-kobber-700"
        >
          {m.rapportMaerke}
        </span>
      )}
      {forfatterSpaerret && (
        <span
          title={m.spaerretTitle}
          className="rounded-full bg-kobber-100 px-1.5 py-0.5 text-[11px] font-medium text-kobber-800"
        >
          {m.spaerretMaerke}
        </span>
      )}
    </>
  );
}

function opmRamme(harRapport: boolean, forfatterSpaerret: boolean): string {
  return harRapport || forfatterSpaerret ? 'border-kobber-200' : 'border-grafit-200';
}

function TraadRaekke({ t, onHandlet }: { t: AdminForumTraad; onHandlet: () => void }) {
  const sprog = useSprog();
  const v = useVOrdbog();
  const m = v.forumMod;
  const { pending, fejl, koer } = useVKoer();
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
            {t.isPinned && <span title={m.fastgjort}>📌</span>}
            {t.isLocked && <span title={m.laast}>🔒</span>}
            <Link href={url} className="font-medium text-grafit-900 hover:text-kobber-700">
              {t.title}
            </Link>
            <OpmMaerker harRapport={t.harRapport} forfatterSpaerret={t.forfatterSpaerret} />
          </div>
          <p className="mt-0.5 text-xs text-grafit-500">
            {t.kategoriNavn} · {t.forfatter || v.faelles.ejer} · {m.svar(t.replyCount)} ·{' '}
            {m.visninger(t.viewCount)} · {relativTid(t.lastPostAt, sprog)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <button
          className="btn-ghost !py-1 text-sm"
          disabled={pending}
          onClick={() => koer(() => saetFastgjort(t.id, t.kategoriSlug, t.slug, !t.isPinned), onHandlet)}
        >
          {t.isPinned ? m.fjernFastgoer : m.fastgoer}
        </button>
        <button
          className="btn-ghost !py-1 text-sm"
          disabled={pending}
          onClick={() => koer(() => saetLaast(t.id, t.kategoriSlug, t.slug, !t.isLocked), onHandlet)}
        >
          {t.isLocked ? m.laasOp : m.laas}
        </button>
        <span className="flex-1" />
        <button
          className="rounded-lg border border-grafit-200 px-2.5 py-1 text-sm font-medium text-grafit-500 hover:border-kobber-500 hover:text-kobber-700"
          onClick={() => setFjerner((v) => !v)}
        >
          {m.fjernTraad}
        </button>
      </div>

      {fjerner && (
        <GrundVaelger
          pending={pending}
          submitLabel={m.fjernTraadSubmit}
          onCancel={() => setFjerner(false)}
          onSubmit={(grund, fritekst) =>
            koer(
              () => modFjernTraad(t.id, t.kategoriSlug, grund, fritekst),
              () => {
                setFjerner(false);
                onHandlet();
              },
            )
          }
        />
      )}
      {fejl && <p className="mt-2 text-xs text-kobber-700">{fejl}</p>}
    </div>
  );
}

function IndlaegRaekke({ p, onHandlet }: { p: AdminForumIndlaeg; onHandlet: () => void }) {
  const sprog = useSprog();
  const v = useVOrdbog();
  const m = v.forumMod;
  const { pending, fejl, koer } = useVKoer();
  const [fjerner, setFjerner] = useState(false);
  const url = `/forum/${p.kategoriSlug}/${p.traadSlug}`;

  return (
    <div
      className={`rounded-xl border bg-white p-4 ${opmRamme(p.harRapport, p.forfatterSpaerret)} ${
        pending ? 'opacity-60' : ''
      }`}
    >
      <p className="text-xs text-grafit-500">
        {p.forfatter || v.faelles.ejer} {m.iTraad}{' '}
        <Link href={url} className="font-medium text-grafit-700 hover:text-kobber-700">
          {p.traadTitel}
        </Link>{' '}
        {p.isOpening && <span className="text-grafit-400">{m.aabning}</span>} ·{' '}
        {relativTid(p.createdAt, sprog)}
      </p>
      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
        <OpmMaerker harRapport={p.harRapport} forfatterSpaerret={p.forfatterSpaerret} />
      </div>
      <p className="mt-1 line-clamp-3 text-sm text-grafit-800">{p.body}</p>

      <div className="mt-2 flex items-center gap-2 text-sm">
        <span className="flex-1" />
        {p.isOpening ? (
          <span className="text-xs text-grafit-400">{m.aabningsIndlaeg}</span>
        ) : (
          <button
            className="rounded-lg border border-grafit-200 px-2.5 py-1 text-sm font-medium text-grafit-500 hover:border-kobber-500 hover:text-kobber-700"
            onClick={() => setFjerner((v) => !v)}
          >
            {m.fjern}
          </button>
        )}
      </div>

      {!p.isOpening && fjerner && (
        <GrundVaelger
          pending={pending}
          submitLabel={m.fjernIndlaegSubmit}
          onCancel={() => setFjerner(false)}
          onSubmit={(grund, fritekst) =>
            koer(
              () => modFjernIndlaeg(p.id, p.kategoriSlug, p.traadSlug, grund, fritekst),
              () => {
                setFjerner(false);
                onHandlet();
              },
            )
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
  const v = useVOrdbog();
  const m = v.forumMod;
  // Delt soege-/filter-tilstand for begge kolonner.
  const [soeg, setSoeg] = useState('');
  const [kunOpm, setKunOpm] = useState(false);

  const [traade, setTraade] = useState<AdminForumTraad[]>(initialTraade.traade);
  const [traadTotal, setTraadTotal] = useState(initialTraade.total);
  const [indlaeg, setIndlaeg] = useState<AdminForumIndlaeg[]>(initialIndlaeg.indlaeg);
  const [indlaegTotal, setIndlaegTotal] = useState(initialIndlaeg.total);

  // Fejl som NØGLE (slås op ved render -> skifter med sproget).
  const [traadFejl, setTraadFejl] = useState<HentFejl>(null);
  const [indlaegFejl, setIndlaegFejl] = useState<HentFejl>(null);
  const [pendingT, startT] = useTransition();
  const [pendingI, startI] = useTransition();

  // offset 0 + reset: ny soegning/filtrering (eller opdatering efter en
  // handling). reset=false: "vis flere" - hent naeste side og haeng paa.
  function hentTraadeMed(opm: boolean, reset: boolean) {
    setTraadFejl(null);
    startT(async () => {
      try {
        const r = await hentForumTraade({
          soeg: soeg.trim(),
          kunOpm: opm,
          limit: SIDE,
          offset: reset ? 0 : traade.length,
        });
        if (!r.ok) return setTraadFejl(r.fejl);
        setTraade((cur) => (reset ? r.data.traade : [...cur, ...r.data.traade]));
        setTraadTotal(r.data.total);
      } catch {
        setTraadFejl('kontekst');
      }
    });
  }

  function hentIndlaegMed(opm: boolean, reset: boolean) {
    setIndlaegFejl(null);
    startI(async () => {
      try {
        const r = await hentForumIndlaeg({
          soeg: soeg.trim(),
          kunOpm: opm,
          limit: SIDE,
          offset: reset ? 0 : indlaeg.length,
        });
        if (!r.ok) return setIndlaegFejl(r.fejl);
        setIndlaeg((cur) => (reset ? r.data.indlaeg : [...cur, ...r.data.indlaeg]));
        setIndlaegTotal(r.data.total);
      } catch {
        setIndlaegFejl('kontekst');
      }
    });
  }

  const hentTraade = (reset: boolean) => hentTraadeMed(kunOpm, reset);
  const hentIndlaeg = (reset: boolean) => hentIndlaegMed(kunOpm, reset);

  function soegBegge() {
    hentTraade(true);
    hentIndlaeg(true);
  }

  function saetFilter(ny: boolean) {
    setKunOpm(ny);
    // Hent med den nye vaerdi med det samme (state er asynkron, saa send eksplicit).
    hentTraadeMed(ny, true);
    hentIndlaegMed(ny, true);
  }

  const filtreret = kunOpm || soeg.trim() !== '';
  const fejlTekst = (f: HentFejl, kontekst: string) =>
    f === null ? null : f === 'kontekst' ? kontekst : v.fejl[f];
  const fejl = [
    fejlTekst(traadFejl, m.kunneIkkeHenteTraade),
    fejlTekst(indlaegFejl, m.kunneIkkeHenteIndlaeg),
  ]
    .filter(Boolean)
    .join(' ');

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
          <label className="label">{m.soegLabel}</label>
          <div className="flex gap-2">
            <input
              type="search"
              className="input"
              placeholder={m.soegPh}
              value={soeg}
              onChange={(e) => setSoeg(e.target.value)}
            />
            <button type="submit" className="btn-primary !py-2.5" disabled={pendingT || pendingI}>
              {v.faelles.soeg}
            </button>
          </div>
        </form>
        <div>
          <label className="label">{m.vis}</label>
          <div className="inline-flex overflow-hidden rounded-lg border border-grafit-300">
            <button
              type="button"
              onClick={() => saetFilter(false)}
              className={`px-3 py-2 text-sm font-medium ${
                kunOpm ? 'bg-white text-grafit-600 hover:bg-grafit-50' : 'bg-kobber-50 text-kobber-800'
              }`}
            >
              {v.faelles.alle}
            </button>
            <button
              type="button"
              onClick={() => saetFilter(true)}
              className={`border-l border-grafit-300 px-3 py-2 text-sm font-medium ${
                kunOpm ? 'bg-kobber-50 text-kobber-800' : 'bg-white text-grafit-600 hover:bg-grafit-50'
              }`}
            >
              {m.kraeverOpm}
            </button>
          </div>
        </div>
      </div>
      <p className="mb-4 text-xs text-grafit-400">{m.opmForklaring}</p>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Traade */}
        <div className="min-w-0">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-grafit-400">
            {m.traadeOverskrift(traade.length, traadTotal)}
          </h3>
          {traade.length === 0 ? (
            <p className="text-sm text-grafit-500">
              {filtreret ? m.ingenTraadeMatcher : m.ingenTraade}
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
                  {m.visFlereTraade}
                </button>
              )}
            </>
          )}
        </div>

        {/* Indlaeg */}
        <div className="min-w-0">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-grafit-400">
            {m.indlaegOverskrift(indlaeg.length, indlaegTotal)}
          </h3>
          {indlaeg.length === 0 ? (
            <p className="text-sm text-grafit-500">
              {filtreret ? m.ingenIndlaegMatcher : m.ingenIndlaeg}
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
                  {m.visFlereIndlaeg}
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
