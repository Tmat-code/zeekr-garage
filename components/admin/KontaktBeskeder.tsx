'use client';

import { useState, useTransition } from 'react';
import { relativTid } from '@/lib/i18n/format';
import { useSprog } from '@/lib/i18n/klient';
import { useVOrdbog } from '@/lib/i18n/vaerksted/klient';
import { useVKoer, type HentFejl } from '@/components/admin/useVKoer';
import type { KontaktBesked, KontaktSide } from '@/lib/queries-admin';
import { saetKontaktBehandlet, hentKontaktBeskeder } from '@/app/admin/kontakt-actions';

const SIDE = 20;

function BeskedKort({
  b,
  onToggle,
}: {
  b: KontaktBesked;
  onToggle: (id: string, behandlet: boolean) => void;
}) {
  const sprog = useSprog();
  const v = useVOrdbog();
  const k = v.kontakt;
  const { pending, koer, fejl } = useVKoer();

  function toggle() {
    const ny = !b.behandlet;
    koer(
      () => saetKontaktBehandlet(b.id, ny),
      () => onToggle(b.id, ny),
    );
  }

  return (
    <div
      className={`rounded-xl border bg-white p-4 ${
        b.behandlet ? 'border-grafit-200 opacity-75' : 'border-kobber-200'
      } ${pending ? 'opacity-60' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-grafit-500">
        {b.behandlet ? (
          <span className="rounded-full bg-grafit-100 px-2 py-0.5 font-medium text-grafit-600">
            {k.behandlet}
          </span>
        ) : (
          <span className="rounded-full bg-kobber-50 px-2 py-0.5 font-medium text-kobber-700">
            {v.faelles.ny}
          </span>
        )}
        <span className="font-medium text-grafit-700">{b.navn}</span>
        <span>· {relativTid(b.createdAt, sprog)}</span>
        {b.svarMail && (
          <span>
            ·{' '}
            <a href={`mailto:${b.svarMail}`} className="text-kobber-700 hover:underline">
              {b.svarMail}
            </a>
          </span>
        )}
      </div>

      <p className="mt-1.5 font-semibold text-grafit-900">{b.emne}</p>
      <p className="mt-1 whitespace-pre-line text-sm text-grafit-700">{b.besked}</p>

      <div className="mt-3 flex items-center gap-2">
        <button
          className="rounded-lg border border-grafit-200 px-2.5 py-1 text-sm font-medium text-grafit-500 hover:border-kobber-500 hover:text-kobber-700"
          disabled={pending}
          onClick={toggle}
        >
          {b.behandlet ? k.markerUbehandlet : k.markerBehandlet}
        </button>
        {fejl && <span className="text-xs text-kobber-700">{fejl}</span>}
      </div>
    </div>
  );
}

export default function KontaktBeskeder({ initial }: { initial: KontaktSide }) {
  const v = useVOrdbog();
  const [beskeder, setBeskeder] = useState<KontaktBesked[]>(initial.beskeder);
  const [total, setTotal] = useState(initial.total);
  const [fejl, setFejl] = useState<HentFejl>(null);
  const [pending, start] = useTransition();

  function visFlere() {
    setFejl(null);
    start(async () => {
      try {
        const r = await hentKontaktBeskeder({ limit: SIDE, offset: beskeder.length });
        if (!r.ok) return setFejl(r.fejl);
        setBeskeder((cur) => [...cur, ...r.data.beskeder]);
        setTotal(r.data.total);
      } catch {
        setFejl('kontekst');
      }
    });
  }

  // Markér behandlet opdateres i stedet for at fjerne raekken - listen er ALLE
  // henvendelser (behandlede bliver staaende, nedtonet), ikke kun en aaben koe.
  function opdaterBehandlet(id: string, behandlet: boolean) {
    setBeskeder((cur) => cur.map((b) => (b.id === id ? { ...b, behandlet } : b)));
  }

  if (beskeder.length === 0) {
    return <p className="text-sm text-grafit-500">{v.kontakt.ingen}</p>;
  }

  return (
    <div>
      <div className={`space-y-2.5 ${pending ? 'opacity-70' : ''}`}>
        {beskeder.map((b) => (
          <BeskedKort key={b.id} b={b} onToggle={opdaterBehandlet} />
        ))}
      </div>
      {beskeder.length < total && (
        <button className="btn-ghost mt-3 !py-1.5 text-sm" disabled={pending} onClick={visFlere}>
          {v.kontakt.visFlere}
        </button>
      )}
      <p className="mt-2 text-xs text-grafit-400">{v.faelles.viser(beskeder.length, total)}</p>
      {fejl && (
        <p className="mt-2 text-sm text-kobber-700">
          {fejl === 'kontekst' ? v.kontakt.kunneIkkeHente : v.fejl[fejl]}
        </p>
      )}
    </div>
  );
}
