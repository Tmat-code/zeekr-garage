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
import { TYPE_META, kategoriLabel } from '@/lib/config';
import { StatusTag, SeverityTag, PlatformSignal } from '@/components/Tags';
import ConfirmButton from '@/components/ConfirmButton';
import Kommentarer from '@/components/Kommentarer';
import BilledeGalleri from '@/components/BilledeGalleri';

export const dynamic = 'force-dynamic';

function daDato(iso: string): string {
  return new Date(iso).toLocaleDateString('da-DK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function MeldingSide({ params }: { params: { id: string } }) {
  const [issue, kommentarer, myCounts, ctx, userCars, fordeling] = await Promise.all([
    getIssueDetalje(params.id),
    getComments(params.id),
    getMyConfirmedCounts(),
    adminKontekst(),
    getMyCars(),
    getVariantFordeling(params.id),
  ]);

  if (!issue) notFound();

  const erModerator = rolleErModerator(ctx.rolle);
  const isLoggedIn = !!ctx.user;
  const naeste = `/melding/${issue.id}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="text-sm text-grafit-500 hover:text-kobber-700">
        ← Tilbage til listen
      </Link>

      {/* Badges */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        <span className={`chip ${TYPE_META[issue.type].chip}`}>{TYPE_META[issue.type].badge}</span>
        {kategoriLabel(issue.category) && (
          <span className="chip border border-kobber-200 bg-kobber-50 text-kobber-700">
            {kategoriLabel(issue.category)}
          </span>
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

      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-grafit-900">{issue.title}</h1>
      <p className="mt-1 text-sm text-grafit-500">
        Meldt {daDato(issue.created_at)} · 🚗 {issue.confirmations}{' '}
        {issue.confirmations === 1 ? 'bil bekræftet' : 'biler bekræftet'}
      </p>

      {/* Beskrivelse */}
      <div className="mt-5 rounded-2xl border border-grafit-200 bg-white p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-grafit-400">
          {issue.type === 'fejl' ? 'Sådan opleves fejlen' : 'Ønsket'}
        </h2>
        <p className="mt-2 whitespace-pre-line text-grafit-800">{issue.description}</p>

        {issue.billeder.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-grafit-400">
              {issue.type === 'fejl' ? 'Foto-bevis' : 'Billeder'}
            </h3>
            <BilledeGalleri
              billeder={issue.billeder}
              alt={issue.type === 'fejl' ? 'Foto-bevis' : 'Billede'}
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
          <p className="font-semibold text-grafit-900">Oplever du også dette?</p>
          <p className="text-sm text-grafit-500">
            Bekræft med din variant - jo flere ejere, jo tungere vejer fejlen over for Zeekr.
          </p>
        </div>
      </div>

      {fordeling.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {fordeling.map((f) => (
            <span key={f.navn} className="chip bg-grafit-100 text-grafit-700">
              {f.navn}: <span className="tabular-nums font-semibold">{f.antal}</span>
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
