import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getKategori, getTraade, getModelEjerTal } from '@/lib/forum';
import { getSoftwareHistorikPerModel } from '@/lib/ota';
import type { ModelEjerTal, OtaModelHistorik } from '@/lib/types';
import { adminKontekst, rolleErModerator } from '@/lib/admin';
import { relativTid } from '@/lib/i18n/format';
import ModelBadge from '@/components/forum/ModelBadge';
import GarageBadge from '@/components/forum/GarageBadge';
import Avatar from '@/components/forum/Avatar';
import TraadSoegeForm from '@/components/forum/TraadSoegeForm';
import { hentOrdbog, hentSprog } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { kategori: string } }) {
  const kat = await getKategori(params.kategori, await hentSprog());
  return { title: kat ? kat.name : (await hentOrdbog()).forum.metaTitel };
}

export default async function KategoriSide({ params }: { params: { kategori: string } }) {
  const sprog = await hentSprog();
  const kat = await getKategori(params.kategori, sprog);
  if (!kat) notFound();

  const [traade, ctx, ejerTal, otaHistorik, t] = await Promise.all([
    getTraade(kat.id),
    adminKontekst(),
    kat.modelId ? getModelEjerTal() : Promise.resolve({} as Record<string, ModelEjerTal>),
    kat.modelId ? getSoftwareHistorikPerModel() : Promise.resolve([] as OtaModelHistorik[]),
    hentOrdbog(),
  ]);
  const f = t.forum;
  // Ejer-graf (P6) - kun model-fora. Social proof selv med 0 traade.
  const et = kat.modelId ? ejerTal[kat.modelId] : undefined;
  // "Nyeste OS"-note (P27 follow-up) - kun model-fora. Model-fora deler slug med
  // deres model (admin_opret_model indsaetter begge med samme slug), saa OTA-
  // gruppen matches paa slug. Vises kun naar modellen har mindst eet OTA-opslag.
  const nyesteOs = kat.modelId
    ? otaHistorik.find((m) => m.slug === kat.slug)?.nyesteVersion ?? null
    : null;
  const erModerator = rolleErModerator(ctx.rolle);
  const isLoggedIn = !!ctx.user;
  const kanOprette = isLoggedIn && (!kat.isLocked || erModerator);
  const nyUrl = `/forum/${kat.slug}/ny`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/forum" className="text-sm text-grafit-500 hover:text-kobber-700">
        {f.tilbageForum}
      </Link>

      {/* Kategori-header */}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {kat.modelId ? (
            <ModelBadge slug={kat.slug} size="lg" />
          ) : (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-grafit-100 text-2xl" aria-hidden="true">
              {kat.icon ?? '💬'}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-tight text-grafit-900">
              {kat.name}
            </h1>
            {kat.description && <p className="mt-0.5 text-sm text-grafit-500">{kat.description}</p>}
          </div>
        </div>

        {kanOprette ? (
          <Link href={nyUrl} className="btn-primary shrink-0">
            {f.nyTraad}
          </Link>
        ) : kat.isLocked ? (
          <span className="shrink-0 self-center text-sm text-grafit-400">{f.kunModeratorer}</span>
        ) : (
          <Link
            href={`/login?naeste=${encodeURIComponent(nyUrl)}`}
            className="btn-ghost shrink-0"
          >
            {f.logIndForAtSkrive}
          </Link>
        )}
      </div>

      {/* Ejer-graf (P6): social proof fra Min garage - vises kun på model-fora
          og kun når der faktisk er ejere/biler/bekræftelser bag modellen. */}
      {et && (et.ejere > 0 || et.biler > 0 || et.bekraeftelser > 0) && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {et.ejere > 0 && (
            <span className="chip bg-kobber-100 text-kobber-800">
              {f.ejereIGaragen(et.ejere)}
            </span>
          )}
          {et.biler > 0 && (
            <span className="chip bg-grafit-100 text-grafit-700">
              {f.biler(et.biler)}
            </span>
          )}
          {et.bekraeftelser > 0 && (
            <span className="chip bg-grafit-100 text-grafit-700">
              {f.bekraeftelser(et.bekraeftelser)}
            </span>
          )}
        </div>
      )}

      {/* Nyeste OS (P27 follow-up): additivt indgangspunkt til OTA-historikken,
          dér hvor ejeren allerede står. Vises kun når modellen har mindst ét
          OTA-opslag; linker til hele /software (ingen filter, afklaret 24-11). */}
      {nyesteOs && (
        <Link
          href="/software"
          className="mt-4 flex items-center gap-2 rounded-xl border border-kobber-200 bg-kobber-50 px-4 py-2.5 text-sm text-kobber-900 transition-colors hover:border-kobber-300 hover:bg-kobber-100"
        >
          <span aria-hidden="true">📦</span>
          <span>
            {f.nyesteOs} <span className="font-semibold">{nyesteOs}</span>
          </span>
          <span className="ml-auto shrink-0 font-medium text-kobber-700">{f.seHistorik}</span>
        </Link>
      )}

      {/* Søg i dette forum (scopet til rummet; udvid til alle fora på resultatsiden) */}
      <div className="mt-5">
        <TraadSoegeForm scopeSlug={kat.slug} scopeNavn={kat.name} sprog={sprog} />
      </div>

      {/* Trådliste */}
      <div className="mt-6">
        {traade.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-grafit-300 bg-white px-6 py-12 text-center">
            <p className="text-grafit-500">{f.ingenTraade}</p>
            {kanOprette && (
              <Link href={nyUrl} className="mt-3 inline-block font-medium text-kobber-700 hover:underline">
                {f.vaerFoersteTraad}
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-grafit-100 overflow-hidden rounded-2xl border border-grafit-200 bg-white">
            {traade.map((tr) => (
              <Link
                key={tr.id}
                href={`/forum/${kat.slug}/${tr.slug}`}
                className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-grafit-50"
              >
                <Avatar url={tr.avatar} navn={tr.forfatter} px={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {tr.isPinned && <span className="shrink-0 text-xs" title={f.fastgjort}>📌</span>}
                    {tr.isLocked && <span className="shrink-0 text-xs" title={f.laast}>🔒</span>}
                    <span className="truncate font-semibold text-grafit-900">{tr.title}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-grafit-400">
                    <span>{tr.forfatter || f.ejer}</span>
                    <GarageBadge bil={tr.bil} />
                    <span>· {relativTid(tr.lastPostAt, sprog)}</span>
                  </div>
                </div>
                <div className="hidden shrink-0 items-center gap-6 text-right text-sm sm:flex">
                  <div className="w-12">
                    <div className="font-semibold tabular-nums text-grafit-800">{tr.replyCount}</div>
                    <div className="text-xs text-grafit-400">{f.svarLabel(tr.replyCount)}</div>
                  </div>
                  <div className="w-14">
                    <div className="font-semibold tabular-nums text-grafit-800">{tr.viewCount}</div>
                    <div className="text-xs text-grafit-400">{f.visningerLabel}</div>
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs text-grafit-400 sm:hidden">
                  💬 {tr.replyCount}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
