'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { opretEvent, retEvent } from '@/app/events/actions';

// ISO (UTC) -> value til <input type="datetime-local"> (lokal tid).
function isoTilLokal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}
// datetime-local (lokal) -> ISO (UTC), eller null.
function lokalTilIso(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

type Initial = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

export default function EventForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const redigerer = !!initial;
  const [titel, setTitel] = useState(initial?.title ?? '');
  const [beskrivelse, setBeskrivelse] = useState(initial?.description ?? '');
  const [sted, setSted] = useState(initial?.location ?? '');
  const [start, setStart] = useState(isoTilLokal(initial?.startsAt ?? null));
  const [slut, setSlut] = useState(isoTilLokal(initial?.endsAt ?? null));
  const [fejl, setFejl] = useState<string | null>(null);
  const [pending, startT] = useTransition();

  function gem() {
    setFejl(null);
    startT(async () => {
      try {
        const input = {
          title: titel,
          description: beskrivelse,
          location: sted,
          startsAt: lokalTilIso(start),
          endsAt: lokalTilIso(slut),
        };
        if (redigerer) {
          await retEvent(initial!.id, initial!.slug, input);
          router.push(`/events/${initial!.slug}`);
        } else {
          const url = await opretEvent(input);
          router.push(url);
        }
      } catch (e: any) {
        setFejl(e?.message ?? 'Kunne ikke gemme.');
      }
    });
  }

  return (
    <div className="mt-6 space-y-4">
      <div>
        <label className="label" htmlFor="t">Titel</label>
        <input
          id="t"
          className="input"
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="Fx: Køretur til Møns Klint"
          maxLength={160}
        />
      </div>
      <div>
        <label className="label" htmlFor="b">Beskrivelse</label>
        <textarea
          id="b"
          className="input min-h-[140px]"
          value={beskrivelse}
          onChange={(e) => setBeskrivelse(e.target.value)}
          placeholder="Hvad sker der, program, hvad skal man vide?"
        />
      </div>
      <div>
        <label className="label" htmlFor="s">Sted</label>
        <input
          id="s"
          className="input"
          value={sted}
          onChange={(e) => setSted(e.target.value)}
          placeholder="Fx: P-plads ved Netto, Roskilde"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="st">Start</label>
          <input
            id="st"
            type="datetime-local"
            className="input"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="sl">
            Slut <span className="font-normal text-grafit-400">(valgfri)</span>
          </label>
          <input
            id="sl"
            type="datetime-local"
            className="input"
            value={slut}
            onChange={(e) => setSlut(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending || titel.trim().length < 3} onClick={gem}>
          {pending ? 'Gemmer…' : redigerer ? 'Gem ændringer' : 'Opret event'}
        </button>
        {fejl && <span className="text-sm text-kobber-700">{fejl}</span>}
      </div>
    </div>
  );
}
