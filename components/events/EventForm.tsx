'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { opretEvent, retEvent } from '@/app/events/actions';
import { useOrdbog } from '@/lib/i18n/klient';
import { EVENT_TITEL_MIN, validerEvent, type EventFejl } from '@/lib/events-fejl';

// ISO (UTC) -> value til <input type="datetime-local"> (lokal tid).
function isoTilLokal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  // i18n-ok (datetime-local-format)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad( // i18n-ok
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
  const o = useOrdbog();
  const t = o.events;
  const redigerer = !!initial;
  const [titel, setTitel] = useState(initial?.title ?? '');
  const [beskrivelse, setBeskrivelse] = useState(initial?.description ?? '');
  const [sted, setSted] = useState(initial?.location ?? '');
  const [start, setStart] = useState(isoTilLokal(initial?.startsAt ?? null));
  const [slut, setSlut] = useState(isoTilLokal(initial?.endsAt ?? null));
  // Nøgle, ikke tekst: fejlen skifter med sproget (U5).
  const [fejl, setFejl] = useState<EventFejl | null>(null);
  const [pending, startT] = useTransition();

  function gem() {
    setFejl(null);
    const input = {
      title: titel,
      description: beskrivelse,
      location: sted,
      startsAt: lokalTilIso(start),
      endsAt: lokalTilIso(slut),
    };
    // Samme validering som serveren - fanges her uden et kald.
    const ugyldig = validerEvent(input);
    if (ugyldig) return setFejl(ugyldig);
    startT(async () => {
      try {
        if (redigerer) {
          const r = await retEvent(initial!.id, initial!.slug, input);
          if (!r.ok) return setFejl(r.fejl);
          router.push(`/events/${initial!.slug}`);
        } else {
          const r = await opretEvent(input);
          if (!r.ok) return setFejl(r.fejl);
          router.push(r.data);
        }
      } catch (e) {
        console.error(e);
        setFejl(redigerer ? 'kunneIkkeGemme' : 'kunneIkkeOprette');
      }
    });
  }

  return (
    <div className="mt-6 space-y-4">
      <div>
        <label className="label" htmlFor="t">{t.form.titel}</label>
        <input
          id="t"
          className="input"
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder={t.form.titelEks}
          maxLength={160}
        />
      </div>
      <div>
        <label className="label" htmlFor="b">{t.form.beskrivelse}</label>
        <textarea
          id="b"
          className="input min-h-[140px]"
          value={beskrivelse}
          onChange={(e) => setBeskrivelse(e.target.value)}
          placeholder={t.form.beskrivelseEks}
        />
      </div>
      <div>
        <label className="label" htmlFor="s">{t.form.sted}</label>
        <input
          id="s"
          className="input"
          value={sted}
          onChange={(e) => setSted(e.target.value)}
          placeholder={t.form.stedEks}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="st">{t.form.start}</label>
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
            {t.form.slut} <span className="font-normal text-grafit-400">{o.faellesFejl.valgfri}</span>
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
        <button className="btn-primary" disabled={pending || titel.trim().length < EVENT_TITEL_MIN} onClick={gem}>
          {pending ? t.form.gemmer : redigerer ? t.form.gemAendringer : t.form.opret}
        </button>
        {fejl && <span className="text-sm text-kobber-700">{t.fejl[fejl]}</span>}
      </div>
    </div>
  );
}
