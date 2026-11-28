'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { aflysEvent, sletEvent, sendOpdatering, type EventSvar } from '@/app/events/actions';
import { useOrdbog } from '@/lib/i18n/klient';
import type { EventFejl, OpdateringGrund } from '@/lib/events-fejl';

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
  const t = useOrdbog().events;
  const [pending, start] = useTransition();
  // Nøgler, ikke tekst: fejl + kvittering skifter med sproget (U5).
  const [fejl, setFejl] = useState<EventFejl | null>(null);
  const [bekraeftSlet, setBekraeftSlet] = useState(false);
  const [besked, setBesked] = useState('');
  const [kvittering, setKvittering] = useState<{ sent: number; grund: OpdateringGrund } | null>(
    null,
  );

  function koer(fn: () => Promise<EventSvar>, fallback: EventFejl, efter?: () => void) {
    setFejl(null);
    start(async () => {
      try {
        const r = await fn();
        if (!r.ok) return setFejl(r.fejl);
        efter?.();
      } catch (e) {
        console.error(e);
        setFejl(fallback);
      }
    });
  }

  function send() {
    setFejl(null);
    setKvittering(null);
    start(async () => {
      try {
        const r = await sendOpdatering(eventId, slug, title, besked);
        if (!r.ok) return setFejl(r.fejl);
        setBesked('');
        setKvittering(r.data);
      } catch (e) {
        console.error(e);
        setFejl('kunneIkkeSende');
      }
    });
  }

  const kvitTekst = !kvittering
    ? null
    : kvittering.grund === 'ok'
      ? t.admin.mailet(kvittering.sent)
      : kvittering.grund === 'ingenTilmeldte'
        ? t.admin.ingenTilmeldte
        : t.admin.mailFejl;

  return (
    <section className="mt-6 rounded-2xl border border-dashed border-grafit-300 bg-grafit-50 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-grafit-400">
        {t.admin.overskrift}
      </h2>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <Link href={`/events/${slug}/rediger`} className="btn-ghost !py-1.5 text-sm">
          {t.admin.rediger}
        </Link>
        <button
          className="btn-ghost !py-1.5 text-sm"
          disabled={pending}
          onClick={() => koer(() => aflysEvent(eventId, slug, !isCancelled), 'kunneIkkeAflyse')}
        >
          {isCancelled ? t.admin.genaabn : t.admin.aflys}
        </button>
        {bekraeftSlet ? (
          <span className="flex items-center gap-1">
            <button
              className="rounded-lg bg-kobber-600 px-2.5 py-1 text-sm font-semibold text-white hover:bg-kobber-700"
              disabled={pending}
              onClick={() =>
                koer(
                  () => sletEvent(eventId),
                  'kunneIkkeSlette',
                  () => router.push('/events'),
                )
              }
            >
              {t.admin.bekraeftSlet}
            </button>
            <button className="btn-ghost !px-2 !py-1 text-sm" onClick={() => setBekraeftSlet(false)}>
              {t.admin.fortryd}
            </button>
          </span>
        ) : (
          <button
            className="rounded-lg border border-grafit-200 px-2.5 py-1 text-sm font-medium text-grafit-500 hover:border-kobber-500 hover:text-kobber-700"
            onClick={() => setBekraeftSlet(true)}
          >
            {t.admin.slet}
          </button>
        )}
      </div>

      {/* Send opdatering til tilmeldte */}
      <div className="mt-4">
        <label className="label" htmlFor="opd">
          {t.admin.sendLabel}
        </label>
        <textarea
          id="opd"
          className="input min-h-[80px]"
          value={besked}
          onChange={(e) => setBesked(e.target.value)}
          placeholder={t.admin.sendPladsholder}
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            className="btn-primary !py-2 text-sm"
            disabled={pending || !besked.trim()}
            onClick={send}
          >
            {t.admin.sendKnap}
          </button>
          {kvitTekst && <span className="text-sm text-grafit-600">{kvitTekst}</span>}
          {fejl && <span className="text-sm text-kobber-700">{t.fejl[fejl]}</span>}
        </div>
      </div>
    </section>
  );
}
