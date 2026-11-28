'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { relativTid } from '@/lib/i18n/format';
import { grundLabel } from '@/lib/moderering';
import { useSprog } from '@/lib/i18n/klient';
import { useVOrdbog } from '@/lib/i18n/vaerksted/klient';
import { useVKoer, type HentFejl } from '@/components/admin/useVKoer';
import type { ForumRapport, ForumRapportSide } from '@/lib/queries-admin';
import GrundVaelger from '@/components/forum/GrundVaelger';
import { modFjernTraad, modFjernIndlaeg, modAdvarBruger, afvisRapport } from '@/app/forum/actions';
import { hentForumRapporter } from '@/app/admin/actions';

const SIDE = 20;

type Handling = 'fjern' | 'advar' | null;

function RapportKort({ r, onHandlet }: { r: ForumRapport; onHandlet: () => void }) {
  const sprog = useSprog();
  const v = useVOrdbog();
  const t = v.rapporter;
  const [handling, setHandling] = useState<Handling>(null);
  const { pending, koer, fejl } = useVKoer();
  const enEjer = v.faelles.enEjer;

  const erPost = !!r.postId;
  const url =
    r.kategoriSlug && r.traadSlug ? `/forum/${r.kategoriSlug}/${r.traadSlug}` : null;

  return (
    <div className={`rounded-xl border border-grafit-200 bg-white p-4 ${pending ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-grafit-500">
        <span className="rounded-full bg-kobber-50 px-2 py-0.5 font-medium text-kobber-700">
          {erPost ? t.indlaeg : t.traad}
        </span>
        <span>{t.grund(grundLabel(r.reason, sprog))}</span>
        {r.kilde === 'ai' && (
          <span className="rounded-full bg-grafit-100 px-2 py-0.5 text-grafit-600">{t.aiFlag}</span>
        )}
        <span>{t.rapporteretAf(r.reporterNavn ?? enEjer)}</span>
        <span>· {relativTid(r.createdAt, sprog)}</span>
        {r.erFjernet && (
          <span className="rounded-full bg-grafit-100 px-2 py-0.5 text-grafit-500">
            {t.alleredeFjernet}
          </span>
        )}
      </div>

      <p className="mt-1.5 text-sm text-grafit-500">
        {url ? (
          <Link href={url} className="font-medium text-grafit-800 hover:text-kobber-700">
            {r.traadTitel || t.traad}
          </Link>
        ) : (
          <span className="font-medium text-grafit-800">{r.traadTitel || t.traad}</span>
        )}{' '}
        {t.forfatter(r.forfatterNavn ?? enEjer)}
      </p>

      {r.indhold && (
        <p className="mt-1 line-clamp-4 whitespace-pre-line rounded-lg bg-grafit-50 p-2 text-sm text-grafit-700">
          {r.indhold}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <button
          className="rounded-lg border border-grafit-200 px-2.5 py-1 font-medium text-grafit-500 hover:border-kobber-500 hover:text-kobber-700"
          disabled={pending}
          onClick={() => setHandling((h) => (h === 'fjern' ? null : 'fjern'))}
        >
          {erPost ? t.fjernIndlaeg : t.fjernTraad}
        </button>
        {r.forfatterId && (
          <button
            className="rounded-lg border border-grafit-200 px-2.5 py-1 font-medium text-grafit-500 hover:border-kobber-500 hover:text-kobber-700"
            disabled={pending}
            onClick={() => setHandling((h) => (h === 'advar' ? null : 'advar'))}
          >
            {t.advarForfatter}
          </button>
        )}
        <span className="flex-1" />
        <button
          className="btn-ghost !py-1 text-sm"
          disabled={pending}
          onClick={() => koer(() => afvisRapport(r.reportId), onHandlet)}
        >
          {t.afvis}
        </button>
      </div>

      {/* Fjern med grund (forvalgt = rapportens grund) + kobler rapporten handled. */}
      {handling === 'fjern' && (
        <GrundVaelger
          pending={pending}
          startGrund={r.reason ?? 'tone'}
          submitLabel={erPost ? t.fjernIndlaegSubmit : t.fjernTraadSubmit}
          onCancel={() => setHandling(null)}
          onSubmit={(grund, fritekst) =>
            koer(
              () =>
                erPost
                  ? modFjernIndlaeg(
                      r.postId!,
                      r.kategoriSlug ?? '',
                      r.traadSlug ?? '',
                      grund,
                      fritekst,
                      r.reportId,
                    )
                  : modFjernTraad(r.threadId!, r.kategoriSlug ?? '', grund, fritekst, r.reportId),
              () => {
                setHandling(null);
                onHandlet();
              },
            )
          }
        />
      )}

      {/* Advar forfatteren (uafhængigt af indholds-handlingen) + markér rapport. */}
      {handling === 'advar' && r.forfatterId && (
        <GrundVaelger
          pending={pending}
          startGrund={r.reason ?? 'tone'}
          submitLabel={t.sendAdvarsel}
          onCancel={() => setHandling(null)}
          onSubmit={(grund, fritekst) =>
            koer(
              () => modAdvarBruger(r.forfatterId!, grund, fritekst, r.reportId),
              () => {
                setHandling(null);
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

export default function ForumRapporter({ initial }: { initial: ForumRapportSide }) {
  const v = useVOrdbog();
  const [rapporter, setRapporter] = useState<ForumRapport[]>(initial.rapporter);
  const [total, setTotal] = useState(initial.total);
  const [fejl, setFejl] = useState<HentFejl>(null);
  const [pending, start] = useTransition();

  // reset=true: hent fra side 1 (efter en handling - et håndteret punkt falder
  // ud af køen). reset=false: "vis flere" - hent næste side og hæng på.
  function hent(reset: boolean) {
    setFejl(null);
    start(async () => {
      try {
        const r = await hentForumRapporter({ limit: SIDE, offset: reset ? 0 : rapporter.length });
        if (!r.ok) return setFejl(r.fejl);
        setRapporter((cur) => (reset ? r.data.rapporter : [...cur, ...r.data.rapporter]));
        setTotal(r.data.total);
      } catch {
        setFejl('kontekst');
      }
    });
  }

  if (rapporter.length === 0) {
    return <p className="text-sm text-grafit-500">{v.rapporter.ingenAabne}</p>;
  }

  return (
    <div>
      <div className={`space-y-2.5 ${pending ? 'opacity-70' : ''}`}>
        {rapporter.map((r) => (
          <RapportKort key={r.reportId} r={r} onHandlet={() => hent(true)} />
        ))}
      </div>
      {rapporter.length < total && (
        <button className="btn-ghost mt-3 !py-1.5 text-sm" disabled={pending} onClick={() => hent(false)}>
          {v.rapporter.visFlere}
        </button>
      )}
      <p className="mt-2 text-xs text-grafit-400">{v.faelles.viser(rapporter.length, total)}</p>
      {fejl && (
        <p className="mt-2 text-sm text-kobber-700">
          {fejl === 'kontekst' ? v.rapporter.kunneIkkeHente : v.fejl[fejl]}
        </p>
      )}
    </div>
  );
}
