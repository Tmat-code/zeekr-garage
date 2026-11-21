'use client';

import { useState, useTransition } from 'react';
import type { ForsideBesked } from '@/lib/queries';
import { gemForsideBesked } from '@/app/admin/actions';

export default function ForsideBeskedEditor({ initial }: { initial: ForsideBesked }) {
  const [message, setMessage] = useState(initial.message);
  const [active, setActive] = useState(initial.active);
  const [pending, start] = useTransition();
  const [fejl, setFejl] = useState<string | null>(null);
  const [gemt, setGemt] = useState(false);

  function gem(nyAktiv: boolean) {
    setFejl(null);
    setGemt(false);
    start(async () => {
      try {
        await gemForsideBesked(message, nyAktiv);
        setActive(nyAktiv);
        setGemt(true);
      } catch (e: any) {
        setFejl(e?.message ?? 'Kunne ikke gemme.');
      }
    });
  }

  return (
    <section className="rounded-2xl border-2 border-kobber-200 bg-white p-5 sm:p-6">
      <div className="mb-1 flex items-center gap-2">
        <span aria-hidden>📣</span>
        <h2 className="text-lg font-semibold text-grafit-900">Forside-besked</h2>
      </div>
      <p className="mb-3 text-sm text-grafit-500">
        En besked øverst på forsiden - fx når du har sendt en rapport til Zeekr, eller ved
        flytning fra det gamle site. Tænd med ét klik, og sluk igen når den ikke er aktuel.
      </p>

      <textarea
        className="input min-h-[90px]"
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          setGemt(false);
        }}
        placeholder="Fx: Vi er flyttet til zeekr-garage.dk - tak for alle meldinger!"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span
          className={`chip ${
            active ? 'bg-loest text-white' : 'bg-grafit-100 text-grafit-500'
          }`}
        >
          {active ? '● Vises på forsiden nu' : '○ Slukket'}
        </span>

        <span className="flex-1" />

        <button
          className="btn-secondary !py-2 text-sm"
          disabled={pending}
          onClick={() => gem(active)}
        >
          Gem ændringer
        </button>

        {active ? (
          <button
            className="btn-ghost !py-2 text-sm"
            disabled={pending}
            onClick={() => gem(false)}
          >
            Sluk
          </button>
        ) : (
          <button
            className="btn-primary !py-2 text-sm"
            disabled={pending || !message.trim()}
            onClick={() => gem(true)}
          >
            Tænd
          </button>
        )}
      </div>

      {gemt && !fejl && <p className="mt-2 text-xs text-loest">Gemt.</p>}
      {fejl && <p className="mt-2 text-xs text-kobber-700">{fejl}</p>}
    </section>
  );
}
