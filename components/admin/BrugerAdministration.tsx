'use client';

import { useState, useTransition } from 'react';
import { relativTid, DATO_LOCALE } from '@/lib/i18n/format';
import { useSprog } from '@/lib/i18n/klient';
import type { UiSprog } from '@/lib/i18n/sprog';
import { useVOrdbog } from '@/lib/i18n/vaerksted/klient';
import type { VOrdbog } from '@/lib/i18n/vaerksted';
import { useVKoer, type HentFejl } from '@/components/admin/useVKoer';
import type { BrugerOverblik, BrugerSide, BrugerStatus } from '@/lib/queries-admin';
import GrundVaelger from '@/components/forum/GrundVaelger';
import {
  hentBrugere,
  suspenderBruger,
  banBruger,
  ophaevBruger,
  anonymiserBruger,
} from '@/app/admin/actions';
import { modAdvarBruger } from '@/app/forum/actions';

const SIDE = 25;

type Handling = 'advar' | 'suspender' | 'ban' | 'anonymiser' | null;

// Suspensions-længder (dage) som hurtige valg.
const DAGE_VALG = [1, 3, 7, 14, 30, 90];

function kortDato(iso: string, sprog: UiSprog): string {
  return new Date(iso).toLocaleDateString(DATO_LOCALE[sprog], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Copenhagen',
  });
}

function StatusBadge({ b, t, sprog }: { b: BrugerOverblik; t: VOrdbog['brugere']; sprog: UiSprog }) {
  const anonymiseret = b.status === 'bannet' && !b.displayName;
  const tekst: Record<BrugerStatus, string> = {
    aktiv: t.aktiv,
    suspenderet: b.spaerretTil ? t.suspenderetTil(kortDato(b.spaerretTil, sprog)) : t.suspenderet,
    bannet: anonymiseret ? t.anonymiseret : t.bannet,
  };
  const klasse: Record<BrugerStatus, string> = {
    aktiv: 'bg-grafit-100 text-grafit-500',
    suspenderet: 'bg-kobber-100 text-kobber-800',
    bannet: 'bg-kobber-600 text-white',
  };
  return <span className={`chip ${klasse[b.status]}`}>{tekst[b.status]}</span>;
}

function RolleBadge({ rolle, v }: { rolle: string | null; v: VOrdbog }) {
  if (!rolle) return <span className="chip bg-grafit-100 text-grafit-400">{v.brugere.ingenRolle}</span>;
  return (
    <span
      className={`chip ${
        rolle === 'superadmin'
          ? 'bg-grafit-900 text-white'
          : rolle === 'admin'
            ? 'bg-kobber-500 text-white'
            : 'bg-grafit-200 text-grafit-700'
      }`}
    >
      {(v.roller as Record<string, string>)[rolle] ?? rolle}
    </span>
  );
}

function BrugerRaekke({
  b,
  erMig,
  erAdmin,
  onHandlet,
}: {
  b: BrugerOverblik;
  erMig: boolean;
  erAdmin: boolean;
  onHandlet: () => void;
}) {
  const sprog = useSprog();
  const v = useVOrdbog();
  const t = v.brugere;
  const [handling, setHandling] = useState<Handling>(null);
  const [dage, setDage] = useState(7);
  const { pending, koer: koerHandling, fejl, nulstilFejl } = useVKoer();

  const erMaalAdmin = b.rolle === 'admin' || b.rolle === 'superadmin';
  const spaerret = b.status !== 'aktiv';
  const anonymiseret = b.status === 'bannet' && !b.displayName;
  // Sanktioner er meningsloese paa egen konto, paa en admin, og paa en allerede
  // anonymiseret konto (RPC'erne afviser ogsaa self + admin).
  const kanHandle = !erMig && !erMaalAdmin && !anonymiseret;

  // Lykkes handlingen: luk panelet + genhent listen. Fejler den: panelet
  // bliver stående (med grund/fritekst) og fejlen vises på moderatorens sprog.
  function koer(fn: () => Promise<unknown>) {
    koerHandling(fn as () => Promise<void>, () => {
      setHandling(null);
      onHandlet();
    });
  }

  function toggle(h: Exclude<Handling, null>) {
    nulstilFejl();
    setHandling((cur) => (cur === h ? null : h));
  }

  return (
    <div className={`rounded-xl border border-grafit-100 px-3 py-2.5 ${pending ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-grafit-900">
              {b.displayName || (anonymiseret ? t.anonymiseretNavn : b.email)}
            </span>
            <RolleBadge rolle={b.rolle} v={v} />
            <StatusBadge b={b} t={t} sprog={sprog} />
            {erMig && <span className="text-xs text-grafit-400">{t.dig}</span>}
          </div>
          <p className="truncate text-xs text-grafit-400">
            {b.email}
            {' · '}
            {t.oprettet(relativTid(b.oprettet, sprog))}
            {' · '}
            {b.sidstLogget ? t.sidstLogget(relativTid(b.sidstLogget, sprog)) : t.aldrigLogget}
          </p>
        </div>
      </div>

      {/* Handlinger */}
      {kanHandle ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <button
            className="rounded-lg border border-grafit-200 px-2.5 py-1 font-medium text-grafit-500 hover:border-kobber-500 hover:text-kobber-700"
            disabled={pending}
            onClick={() => toggle('advar')}
          >
            {t.advar}
          </button>
          {!spaerret && (
            <button
              className="rounded-lg border border-grafit-200 px-2.5 py-1 font-medium text-grafit-500 hover:border-kobber-500 hover:text-kobber-700"
              disabled={pending}
              onClick={() => toggle('suspender')}
            >
              {t.suspender}
            </button>
          )}
          {erAdmin && !spaerret && (
            <button
              className="rounded-lg border border-grafit-200 px-2.5 py-1 font-medium text-grafit-500 hover:border-kobber-500 hover:text-kobber-700"
              disabled={pending}
              onClick={() => toggle('ban')}
            >
              {t.ban}
            </button>
          )}
          {erAdmin && spaerret && (
            <button
              className="rounded-lg border border-grafit-200 px-2.5 py-1 font-medium text-grafit-500 hover:border-loest hover:text-loest"
              disabled={pending}
              onClick={() => koer(() => ophaevBruger(b.id))}
            >
              {t.ophaev}
            </button>
          )}
          {erAdmin && (
            <button
              className="rounded-lg border border-grafit-200 px-2.5 py-1 font-medium text-grafit-500 hover:border-kobber-500 hover:text-kobber-700"
              disabled={pending}
              onClick={() => toggle('anonymiser')}
            >
              {t.anonymiser}
            </button>
          )}
        </div>
      ) : (
        <p className="mt-2 text-xs text-grafit-400">
          {erMig ? t.egenKonto : erMaalAdmin ? t.maalErAdmin : t.kontoAnonymiseret}
        </p>
      )}

      {/* Advar - genbruger mod_advar_bruger (officiel notifikation, ingen rapport). */}
      {handling === 'advar' && (
        <GrundVaelger
          pending={pending}
          submitLabel={t.sendAdvarsel}
          onCancel={() => setHandling(null)}
          onSubmit={(grund, fritekst) => koer(() => modAdvarBruger(b.id, grund, fritekst))}
        />
      )}

      {/* Suspendér - dage-vælger + grund. */}
      {handling === 'suspender' && (
        <div className="mt-2 space-y-2 rounded-xl border border-grafit-200 bg-grafit-50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-grafit-600">{t.varighed}</span>
            <select
              className="rounded-lg border border-grafit-300 bg-white px-2 py-1 text-sm"
              value={dage}
              disabled={pending}
              onChange={(e) => setDage(Number(e.target.value))}
            >
              {DAGE_VALG.map((d) => (
                <option key={d} value={d}>
                  {t.dage(d)}
                </option>
              ))}
            </select>
          </div>
          <GrundVaelger
            pending={pending}
            submitLabel={t.suspenderSubmit}
            onCancel={() => setHandling(null)}
            onSubmit={(grund, fritekst) => koer(() => suspenderBruger(b.id, dage, grund, fritekst))}
          />
        </div>
      )}

      {/* Ban - permanent skrive-spærre. */}
      {handling === 'ban' && (
        <div className="mt-2 rounded-xl border border-kobber-200 bg-kobber-50/50 p-3">
          <p className="mb-1 text-sm text-grafit-700">{t.banForklaring}</p>
          <GrundVaelger
            pending={pending}
            submitLabel={t.banSubmit}
            onCancel={() => setHandling(null)}
            onSubmit={(grund, fritekst) => koer(() => banBruger(b.id, grund, fritekst))}
          />
        </div>
      )}

      {/* Anonymisér - destruktiv PII-rydning (men beholder biler/bekræftelser). */}
      {handling === 'anonymiser' && (
        <div className="mt-2 rounded-xl border border-kobber-300 bg-kobber-50 p-3">
          <p className="mb-1 text-sm font-medium text-kobber-900">{t.anonymForklaring}</p>
          <p className="mb-1 text-xs text-grafit-600">{t.anonymForklaring2}</p>
          <GrundVaelger
            pending={pending}
            startGrund="andet"
            submitLabel={t.anonymSubmit}
            onCancel={() => setHandling(null)}
            onSubmit={(grund, fritekst) => koer(() => anonymiserBruger(b.id, grund, fritekst))}
          />
        </div>
      )}

      {fejl && <p className="mt-2 text-xs text-kobber-700">{fejl}</p>}
    </div>
  );
}

export default function BrugerAdministration({
  initial,
  megId,
  erAdmin,
}: {
  initial: BrugerSide;
  megId: string;
  erAdmin: boolean;
}) {
  const [soeg, setSoeg] = useState('');
  const [rolle, setRolle] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('nyeste');

  const v = useVOrdbog();
  const t = v.brugere;
  const [brugere, setBrugere] = useState<BrugerOverblik[]>(initial.brugere);
  const [total, setTotal] = useState(initial.total);
  const [fejl, setFejl] = useState<HentFejl>(null);
  const [pending, start] = useTransition();

  function filtre(offset: number) {
    return {
      soeg: soeg.trim(),
      rolle: rolle || null,
      status: status || null,
      sort,
      limit: SIDE,
      offset,
    };
  }

  // Hent fra offset 0 (ny søgning/filtrering eller opdatering efter en handling).
  function hent() {
    setFejl(null);
    start(async () => {
      try {
        const r = await hentBrugere(filtre(0));
        if (!r.ok) return setFejl(r.fejl);
        setBrugere(r.data.brugere);
        setTotal(r.data.total);
      } catch {
        setFejl('kontekst');
      }
    });
  }

  function visFlere() {
    setFejl(null);
    start(async () => {
      try {
        const r = await hentBrugere(filtre(brugere.length));
        if (!r.ok) return setFejl(r.fejl);
        setBrugere((cur) => [...cur, ...r.data.brugere]);
        setTotal(r.data.total);
      } catch {
        setFejl('kontekst');
      }
    });
  }

  return (
    <section className="rounded-2xl border border-grafit-200 bg-white p-5 sm:p-6">
      <div className="mb-1 flex items-center gap-2">
        <span aria-hidden>🧑‍🔧</span>
        <h3 className="text-lg font-semibold text-grafit-900">{t.titel}</h3>
      </div>
      <p className="mb-3 text-sm text-grafit-500">{t.intro(erAdmin)}</p>

      {/* Søg + filtre */}
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          hent();
        }}
      >
        <div className="min-w-[180px] flex-1">
          <label className="label">{t.navnEllerEmail}</label>
          <input
            type="search"
            className="input"
            placeholder={t.soegPh}
            value={soeg}
            onChange={(e) => setSoeg(e.target.value)}
          />
        </div>
        <div>
          <label className="label">{t.rolle}</label>
          <select
            className="rounded-lg border border-grafit-300 bg-white px-2 py-2.5 text-sm"
            value={rolle}
            onChange={(e) => setRolle(e.target.value)}
          >
            <option value="">{v.faelles.alle}</option>
            <option value="ingen">{t.udenRolle}</option>
            <option value="moderator">{t.rolleModerator}</option>
            <option value="admin">{t.rolleAdmin}</option>
          </select>
        </div>
        <div>
          <label className="label">{t.status}</label>
          <select
            className="rounded-lg border border-grafit-300 bg-white px-2 py-2.5 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">{v.faelles.alle}</option>
            <option value="aktiv">{t.aktiv}</option>
            <option value="suspenderet">{t.suspenderet}</option>
            <option value="bannet">{t.bannet}</option>
          </select>
        </div>
        <div>
          <label className="label">{t.sorter}</label>
          <select
            className="rounded-lg border border-grafit-300 bg-white px-2 py-2.5 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="nyeste">{t.nyeste}</option>
            <option value="aktiv">{t.sidstAktive}</option>
            <option value="navn">{t.navn}</option>
          </select>
        </div>
        <button type="submit" className="btn-primary !py-2.5" disabled={pending}>
          {v.faelles.soeg}
        </button>
      </form>

      <div className="mt-4">
        {brugere.length === 0 ? (
          <p className="text-sm text-grafit-500">{t.ingenMatcher}</p>
        ) : (
          <>
            <div className="space-y-2">
              {brugere.map((b) => (
                <BrugerRaekke
                  key={b.id}
                  b={b}
                  erMig={b.id === megId}
                  erAdmin={erAdmin}
                  onHandlet={hent}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-grafit-400">{v.faelles.viser(brugere.length, total)}</p>
              {brugere.length < total && (
                <button className="btn-ghost !py-1.5 text-sm" disabled={pending} onClick={visFlere}>
                  {v.faelles.visFlere}
                </button>
              )}
            </div>
          </>
        )}
        {fejl && (
          <p className="mt-2 text-sm text-kobber-700">
            {fejl === 'kontekst' ? t.kunneIkkeHente : v.fejl[fejl]}
          </p>
        )}
      </div>
    </section>
  );
}
