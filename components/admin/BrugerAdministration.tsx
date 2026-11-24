'use client';

import { useState, useTransition } from 'react';
import { relativTid } from '@/lib/tid';
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
const DAGE_VALG = [
  { v: 1, label: '1 dag' },
  { v: 3, label: '3 dage' },
  { v: 7, label: '7 dage' },
  { v: 14, label: '14 dage' },
  { v: 30, label: '30 dage' },
  { v: 90, label: '90 dage' },
];

function kortDato(iso: string): string {
  return new Date(iso).toLocaleDateString('da-DK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function StatusBadge({ b }: { b: BrugerOverblik }) {
  const anonymiseret = b.status === 'bannet' && !b.displayName;
  const tekst: Record<BrugerStatus, string> = {
    aktiv: 'Aktiv',
    suspenderet: b.spaerretTil ? `Suspenderet til ${kortDato(b.spaerretTil)}` : 'Suspenderet',
    bannet: anonymiseret ? 'Anonymiseret' : 'Bannet',
  };
  const klasse: Record<BrugerStatus, string> = {
    aktiv: 'bg-grafit-100 text-grafit-500',
    suspenderet: 'bg-kobber-100 text-kobber-800',
    bannet: 'bg-kobber-600 text-white',
  };
  return <span className={`chip ${klasse[b.status]}`}>{tekst[b.status]}</span>;
}

function RolleBadge({ rolle }: { rolle: string | null }) {
  if (!rolle) return <span className="chip bg-grafit-100 text-grafit-400">ingen rolle</span>;
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
      {rolle}
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
  const [handling, setHandling] = useState<Handling>(null);
  const [dage, setDage] = useState(7);
  const [fejl, setFejl] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const erMaalAdmin = b.rolle === 'admin' || b.rolle === 'superadmin';
  const spaerret = b.status !== 'aktiv';
  const anonymiseret = b.status === 'bannet' && !b.displayName;
  // Sanktioner er meningsloese paa egen konto, paa en admin, og paa en allerede
  // anonymiseret konto (RPC'erne afviser ogsaa self + admin).
  const kanHandle = !erMig && !erMaalAdmin && !anonymiseret;

  function koer(fn: () => Promise<void>) {
    setFejl(null);
    start(async () => {
      try {
        await fn();
        setHandling(null);
        onHandlet();
      } catch (e: any) {
        setFejl(e?.message ?? 'Noget gik galt.');
      }
    });
  }

  function toggle(h: Exclude<Handling, null>) {
    setFejl(null);
    setHandling((cur) => (cur === h ? null : h));
  }

  return (
    <div className={`rounded-xl border border-grafit-100 px-3 py-2.5 ${pending ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-grafit-900">
              {b.displayName || (anonymiseret ? '(anonymiseret)' : b.email)}
            </span>
            <RolleBadge rolle={b.rolle} />
            <StatusBadge b={b} />
            {erMig && <span className="text-xs text-grafit-400">(dig)</span>}
          </div>
          <p className="truncate text-xs text-grafit-400">
            {b.email}
            {' · '}
            oprettet {relativTid(b.oprettet)}
            {' · '}
            {b.sidstLogget ? `sidst logget ind ${relativTid(b.sidstLogget)}` : 'aldrig logget ind'}
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
            🛡 Advar
          </button>
          {!spaerret && (
            <button
              className="rounded-lg border border-grafit-200 px-2.5 py-1 font-medium text-grafit-500 hover:border-kobber-500 hover:text-kobber-700"
              disabled={pending}
              onClick={() => toggle('suspender')}
            >
              ⏸ Suspendér
            </button>
          )}
          {erAdmin && !spaerret && (
            <button
              className="rounded-lg border border-grafit-200 px-2.5 py-1 font-medium text-grafit-500 hover:border-kobber-500 hover:text-kobber-700"
              disabled={pending}
              onClick={() => toggle('ban')}
            >
              ⛔ Ban
            </button>
          )}
          {erAdmin && spaerret && (
            <button
              className="rounded-lg border border-grafit-200 px-2.5 py-1 font-medium text-grafit-500 hover:border-loest hover:text-loest"
              disabled={pending}
              onClick={() => koer(() => ophaevBruger(b.id))}
            >
              ✅ Ophæv spærring
            </button>
          )}
          {erAdmin && (
            <button
              className="rounded-lg border border-grafit-200 px-2.5 py-1 font-medium text-grafit-500 hover:border-kobber-500 hover:text-kobber-700"
              disabled={pending}
              onClick={() => toggle('anonymiser')}
            >
              👤 Anonymisér
            </button>
          )}
        </div>
      ) : (
        <p className="mt-2 text-xs text-grafit-400">
          {erMig
            ? 'Du kan ikke sanktionere din egen konto.'
            : erMaalAdmin
              ? 'En admin kan ikke sanktioneres - fjern admin-rollen først.'
              : 'Kontoen er anonymiseret.'}
        </p>
      )}

      {/* Advar - genbruger mod_advar_bruger (officiel notifikation, ingen rapport). */}
      {handling === 'advar' && (
        <GrundVaelger
          pending={pending}
          submitLabel="Send advarsel"
          onCancel={() => setHandling(null)}
          onSubmit={(grund, fritekst) => koer(() => modAdvarBruger(b.id, grund, fritekst))}
        />
      )}

      {/* Suspendér - dage-vælger + grund. */}
      {handling === 'suspender' && (
        <div className="mt-2 space-y-2 rounded-xl border border-grafit-200 bg-grafit-50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-grafit-600">Varighed:</span>
            <select
              className="rounded-lg border border-grafit-300 bg-white px-2 py-1 text-sm"
              value={dage}
              disabled={pending}
              onChange={(e) => setDage(Number(e.target.value))}
            >
              {DAGE_VALG.map((d) => (
                <option key={d.v} value={d.v}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <GrundVaelger
            pending={pending}
            submitLabel="Suspendér + giv besked"
            onCancel={() => setHandling(null)}
            onSubmit={(grund, fritekst) => koer(() => suspenderBruger(b.id, dage, grund, fritekst))}
          />
        </div>
      )}

      {/* Ban - permanent skrive-spærre. */}
      {handling === 'ban' && (
        <div className="mt-2 rounded-xl border border-kobber-200 bg-kobber-50/50 p-3">
          <p className="mb-1 text-sm text-grafit-700">
            Permanent skrive-spærre. Brugeren kan stadig læse, men ikke bidrage. Kan ophæves igen.
          </p>
          <GrundVaelger
            pending={pending}
            submitLabel="Ban + giv besked"
            onCancel={() => setHandling(null)}
            onSubmit={(grund, fritekst) => koer(() => banBruger(b.id, grund, fritekst))}
          />
        </div>
      )}

      {/* Anonymisér - destruktiv PII-rydning (men beholder biler/bekræftelser). */}
      {handling === 'anonymiser' && (
        <div className="mt-2 rounded-xl border border-kobber-300 bg-kobber-50 p-3">
          <p className="mb-1 text-sm font-medium text-kobber-900">
            Rydder persondata (navn, e-mail, VIN/noter) og spærrer permanent.
          </p>
          <p className="mb-1 text-xs text-grafit-600">
            Biler, bekræftelser og forum-indlæg bevares (de er QA-signalet) - men bliver
            forfatterløse i visningen. Handlingen kan ikke fortrydes.
          </p>
          <GrundVaelger
            pending={pending}
            startGrund="andet"
            submitLabel="Anonymisér personen"
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

  const [brugere, setBrugere] = useState<BrugerOverblik[]>(initial.brugere);
  const [total, setTotal] = useState(initial.total);
  const [fejl, setFejl] = useState<string | null>(null);
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
        setBrugere(r.brugere);
        setTotal(r.total);
      } catch (e: any) {
        setFejl(e?.message ?? 'Kunne ikke hente brugere.');
      }
    });
  }

  function visFlere() {
    setFejl(null);
    start(async () => {
      try {
        const r = await hentBrugere(filtre(brugere.length));
        setBrugere((cur) => [...cur, ...r.brugere]);
        setTotal(r.total);
      } catch (e: any) {
        setFejl(e?.message ?? 'Kunne ikke hente flere.');
      }
    });
  }

  return (
    <section className="rounded-2xl border border-grafit-200 bg-white p-5 sm:p-6">
      <div className="mb-1 flex items-center gap-2">
        <span aria-hidden>🧑‍🔧</span>
        <h3 className="text-lg font-semibold text-grafit-900">Brugere</h3>
      </div>
      <p className="mb-3 text-sm text-grafit-500">
        Overblik over alle oprettede brugere. Søg og filtrér, og handl på en bruger:{' '}
        advar eller suspendér{erAdmin ? ', ban, ophæv eller anonymisér' : ''}. Hver handling giver
        brugeren en officiel besked med grunden og lander i moderations-loggen.
      </p>

      {/* Søg + filtre */}
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          hent();
        }}
      >
        <div className="min-w-[180px] flex-1">
          <label className="label">Navn eller email</label>
          <input
            type="search"
            className="input"
            placeholder="fx Mette eller mette@..."
            value={soeg}
            onChange={(e) => setSoeg(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Rolle</label>
          <select
            className="rounded-lg border border-grafit-300 bg-white px-2 py-2.5 text-sm"
            value={rolle}
            onChange={(e) => setRolle(e.target.value)}
          >
            <option value="">Alle</option>
            <option value="ingen">Uden rolle</option>
            <option value="moderator">Moderator</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select
            className="rounded-lg border border-grafit-300 bg-white px-2 py-2.5 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Alle</option>
            <option value="aktiv">Aktiv</option>
            <option value="suspenderet">Suspenderet</option>
            <option value="bannet">Bannet</option>
          </select>
        </div>
        <div>
          <label className="label">Sortér</label>
          <select
            className="rounded-lg border border-grafit-300 bg-white px-2 py-2.5 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="nyeste">Nyeste</option>
            <option value="aktiv">Sidst aktive</option>
            <option value="navn">Navn</option>
          </select>
        </div>
        <button type="submit" className="btn-primary !py-2.5" disabled={pending}>
          Søg
        </button>
      </form>

      <div className="mt-4">
        {brugere.length === 0 ? (
          <p className="text-sm text-grafit-500">Ingen brugere matcher.</p>
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
              <p className="text-xs text-grafit-400">
                Viser {brugere.length} af {total}
              </p>
              {brugere.length < total && (
                <button className="btn-ghost !py-1.5 text-sm" disabled={pending} onClick={visFlere}>
                  Vis flere
                </button>
              )}
            </div>
          </>
        )}
        {fejl && <p className="mt-2 text-sm text-kobber-700">{fejl}</p>}
      </div>
    </section>
  );
}
