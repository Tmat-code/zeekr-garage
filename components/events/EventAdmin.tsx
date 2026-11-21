'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { aflysEvent, sletEvent, sendOpdatering } from '@/app/events/actions';

export default function EventAdmin({
  eventId,
  slug,
  title,
  isCancelled,
}: {
  eventId: string;
  slug: string;
  title: string;
  isCancelled: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [fejl, setFejl] = useState<string | null>(null);
  const [bekraeftSlet, setBekraeftSlet] = useState(false);
  const [besked, setBesked] = useState('');
  const [kvittering, setKvittering] = useState<string | null>(null);

  function koer(fn: () => Promise<void>) {
    setFejl(null);
    start(async () => {
      try {
        await fn();
      } catch (e: any) {
        setFejl(e?.message ?? 'Noget gik galt.');
      }
    });
  }

  function send() {
    setFejl(null);
    setKvittering(null);
    start(async () => {
      try {
        const { sent, info } = await sendOpdatering(eventId, slug, title, besked);
        setBesked('');
        setKvittering(
          sent > 0
            ? `Opdateringen er slået op og mailet til ${sent} tilmeldt(e).`
            : `Opdateringen er slået op. Ingen mails sendt${info ? ` (${info})` : ''}.`,
        );
      } catch (e: any) {
        setFejl(e?.message ?? 'Kunne ikke sende.');
      }
    });
  }

  return (
    <section className="mt-6 rounded-2xl border border-dashed border-grafit-300 bg-grafit-50 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-grafit-400">
        🔧 Event-styring
      </h2>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <Link href={`/events/${slug}/rediger`} className="btn-ghost !py-1.5 text-sm">
          ✏️ Rediger
        </Link>
        <button
          className="btn-ghost !py-1.5 text-sm"
          disabled={pending}
          onClick={() => koer(() => aflysEvent(eventId, slug, !isCancelled))}
        >
          {isCancelled ? 'Genåbn event' : 'Aflys event'}
        </button>
        {bekraeftSlet ? (
          <span className="flex items-center gap-1">
            <button
              className="rounded-lg bg-kobber-600 px-2.5 py-1 text-sm font-semibold text-white hover:bg-kobber-700"
              disabled={pending}
              onClick={() =>
                koer(async () => {
                  await sletEvent(eventId);
                  router.push('/events');
                })
              }
            >
              Bekræft slet
            </button>
            <button className="btn-ghost !px-2 !py-1 text-sm" onClick={() => setBekraeftSlet(false)}>
              Fortryd
            </button>
          </span>
        ) : (
          <button
            className="rounded-lg border border-grafit-200 px-2.5 py-1 text-sm font-medium text-grafit-500 hover:border-kobber-500 hover:text-kobber-700"
            onClick={() => setBekraeftSlet(true)}
          >
            🗑 Slet
          </button>
        )}
      </div>

      {/* Send opdatering til tilmeldte */}
      <div className="mt-4">
        <label className="label" htmlFor="opd">Send opdatering til de tilmeldte</label>
        <textarea
          id="opd"
          className="input min-h-[80px]"
          value={besked}
          onChange={(e) => setBesked(e.target.value)}
          placeholder="Fx: Vi mødes 15 min før - husk ladebrik. Vejret ser fint ud!"
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            className="btn-primary !py-2 text-sm"
            disabled={pending || !besked.trim()}
            onClick={send}
          >
            Send til tilmeldte
          </button>
          {kvittering && <span className="text-sm text-grafit-600">{kvittering}</span>}
          {fejl && <span className="text-sm text-kobber-700">{fejl}</span>}
        </div>
      </div>
    </section>
  );
}
