import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getIssueDetalje,
  getComments,
  getMyConfirmedCounts,
  getMyCars,
  getVariantFordeling,
} from '@/lib/queries';
import { adminKontekst, rolleErModerator } from '@/lib/admin';
import { TYPE_META, kategoriLabelPaa } from '@/lib/config';
import { hentOrdbog, hentSprog } from '@/lib/i18n/server';
import { DATO_LOCALE } from '@/lib/i18n/format';
import type { UiSprog } from '@/lib/i18n/sprog';
import { medTitelOversaettelser } from '@/lib/titel-oversaet';
import OversatTitel from '@/components/OversatTitel';
import { StatusTag, SeverityTag, PlatformSignal } from '@/components/Tags';
import ConfirmButton from '@/components/ConfirmButton';
import Kommentarer from '@/components/Kommentarer';
import BilledeGalleri from '@/components/BilledeGalleri';

export const dynamic = 'force-dynamic';

function dato(iso: string, sprog: UiSprog): string {
  return new Date(iso).toLocaleDateString(DATO_LOCALE[sprog], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Copenhagen',
  });
}

export default async function MeldingSide({ params }: { params: { id: string } }) {
  const [raaIssue, kommentarer, myCounts, ctx, userCars, fordeling, t, sprog] = await Promise.all([
    getIssueDetalje(params.id),
    getComments(params.id),
    getMyConfirmedCounts(),
    adminKontekst(),
    getMyCars(),
    getVariantFordeling(params.id),
    hentOrdbog(),
    hentSprog(),
  ]);

  if (!raaIssue) notFound();
  const [issue] = await medTitelOversaettelser([raaIssue]);
  const md = t.melding;
  const kat = kategoriLabelPaa(issue.category, t.config.kategori);

  const erModerator = rolleErModerator(ctx.rolle);
  const isLoggedIn = !!ctx.user;
  const naeste = `/melding/${issue.id}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="text-sm text-grafit-500 hover:text-kobber-700">
        {md.tilbage}
      </Link>

      {/* Badges */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        <span className={`chip ${TYPE_META[issue.type].chip}`}>{t.config.type[issue.type].badge}</span>
        {kat && (
          <span className="chip border border-kobber-200 bg-kobber-50 text-kobber-700">{kat}</span>
        )}
        {(issue.status === 'sendt_til_zeekr' ||
          issue.status === 'loest_i_ota' ||
          issue.status === 'afklaret' ||
          issue.status === 'bekraeftet') && <StatusTag status={issue.status} />}
        {issue.models.map((m) => (
          <span key={m.slug} className="chip bg-grafit-100 text-grafit-700">
            {m.name.replace('Zeekr ', '')}
          </span>
        ))}
        <PlatformSignal platforms={issue.models.map((m) => m.platform)} />
        {issue.software_version && (
          <span className="chip bg-grafit-100 font-mono text-grafit-600">
            {issue.software_version}
          </span>
        )}
        {issue.type === 'fejl' && <SeverityTag severity={issue.severity} />}
      </div>

      <div className="mt-3">
        <OversatTitel
          tag="h1"
          titel={issue.title}
          sprog={issue.sprog}
          titler={issue.titler}
          className="text-2xl font-semibold tracking-tight text-grafit-900"
        />
      </div>
      <p className="mt-1 text-sm text-grafit-500">{md.meldt(dato(issue.created_at, sprog), issue.confirmations)}</p>

      {/* Beskrivelse */}
      <div className="mt-5 rounded-2xl border border-grafit-200 bg-white p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-grafit-400">
          {issue.type === 'fejl' ? md.saadanOpleves : md.oensket}
        </h2>
        <p className="mt-2 whitespace-pre-line text-grafit-800" lang={issue.sprog}>
          {issue.description}
        </p>

        {issue.billeder.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-grafit-400">
              {issue.type === 'fejl' ? md.fotoBevis : md.billeder}
            </h3>
            <BilledeGalleri
              billeder={issue.billeder}
              alt={issue.type === 'fejl' ? md.fotoBevis : md.billede}
            />
          </div>
        )}
      </div>

      {/* Stem */}
      <div className="mt-4 flex items-center gap-4 rounded-2xl border border-grafit-200 bg-white p-5">
        <ConfirmButton
          issueId={issue.id}
          issueModelIds={issue.models.map((m) => m.id)}
          userCars={userCars}
          initialCount={issue.confirmations}
          initialMine={myCounts[issue.id] ?? 0}
          isLoggedIn={isLoggedIn}
          naeste={naeste}
        />
        <div>
          <p className="font-semibold text-grafit-900">{md.oplever}</p>
          <p className="text-sm text-grafit-500">{md.oplevTekst}</p>
        </div>
      </div>

      {fordeling.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {fordeling.map((f) => (
            <span key={f.navn ?? ''} className="chip bg-grafit-100 text-grafit-700">
              {f.navn ?? md.udenVariant}: <span className="tabular-nums font-semibold">{f.antal}</span>
            </span>
          ))}
        </div>
      )}

      {/* Byggemøde */}
      <Kommentarer
        issueId={issue.id}
        kommentarer={kommentarer}
        megId={ctx.user?.id ?? null}
        erModerator={erModerator}
        isLoggedIn={isLoggedIn}
        naeste={naeste}
      />
    </div>
  );
}
