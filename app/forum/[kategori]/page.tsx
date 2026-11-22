import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getKategori, getTraade } from '@/lib/forum';
import { adminKontekst } from '@/lib/admin';
import { relativTid } from '@/lib/tid';
import { modelBadge } from '@/lib/model-badge';
import GarageBadge from '@/components/forum/GarageBadge';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { kategori: string } }) {
  const kat = await getKategori(params.kategori);
  return { title: kat ? kat.name : 'Forum' };
}

export default async function KategoriSide({ params }: { params: { kategori: string } }) {
  const kat = await getKategori(params.kategori);
  if (!kat) notFound();

  const [traade, ctx] = await Promise.all([getTraade(kat.id), adminKontekst()]);
  const erModerator = ctx.rolle === 'admin' || ctx.rolle === 'moderator';
  const isLoggedIn = !!ctx.user;
  const kanOprette = isLoggedIn && (!kat.isLocked || erModerator);
  const nyUrl = `/forum/${kat.slug}/ny`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/forum" className="text-sm text-grafit-500 hover:text-kobber-700">
        ← Forum
      </Link>

      {/* Kategori-header */}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {kat.modelId ? (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-grafit-100 font-display text-base font-semibold tabular-nums tracking-tight text-kobber-700" aria-hidden="true">
              {modelBadge(kat.slug)}
            </span>
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
            Ny tråd
          </Link>
        ) : kat.isLocked ? (
          <span className="shrink-0 self-center text-sm text-grafit-400">🔒 Kun moderatorer</span>
        ) : (
          <Link
            href={`/login?naeste=${encodeURIComponent(nyUrl)}`}
            className="btn-ghost shrink-0"
          >
            Log ind for at skrive
          </Link>
        )}
      </div>

      {/* Trådliste */}
      <div className="mt-6">
        {traade.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-grafit-300 bg-white px-6 py-12 text-center">
            <p className="text-grafit-500">Ingen tråde endnu.</p>
            {kanOprette && (
              <Link href={nyUrl} className="mt-3 inline-block font-medium text-kobber-700 hover:underline">
                Vær den første til at starte en →
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-grafit-100 overflow-hidden rounded-2xl border border-grafit-200 bg-white">
            {traade.map((t) => (
              <Link
                key={t.id}
                href={`/forum/${kat.slug}/${t.slug}`}
                className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-grafit-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {t.isPinned && <span className="shrink-0 text-xs" title="Fastgjort">📌</span>}
                    {t.isLocked && <span className="shrink-0 text-xs" title="Låst">🔒</span>}
                    <span className="truncate font-semibold text-grafit-900">{t.title}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-grafit-400">
                    <span>{t.forfatter || 'Ejer'}</span>
                    <GarageBadge bil={t.bil} />
                    <span>· {relativTid(t.lastPostAt)}</span>
                  </div>
                </div>
                <div className="hidden shrink-0 items-center gap-6 text-right text-sm sm:flex">
                  <div className="w-12">
                    <div className="font-semibold tabular-nums text-grafit-800">{t.replyCount}</div>
                    <div className="text-xs text-grafit-400">svar</div>
                  </div>
                  <div className="w-14">
                    <div className="font-semibold tabular-nums text-grafit-800">{t.viewCount}</div>
                    <div className="text-xs text-grafit-400">visninger</div>
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs text-grafit-400 sm:hidden">
                  💬 {t.replyCount}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
