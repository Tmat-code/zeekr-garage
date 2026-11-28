import Link from 'next/link';
import { getForumSoeg, getKategoriListe } from '@/lib/forum';
import { relativTid } from '@/lib/i18n/format';
import { modelBadge } from '@/lib/model-badge';
import GarageBadge from '@/components/forum/GarageBadge';
import TraadSoegeForm from '@/components/forum/TraadSoegeForm';
import Uddrag from '@/components/forum/Uddrag';
import { hentOrdbog, hentSprog } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? '').trim();
  const f = (await hentOrdbog()).forum;
  return {
    title: q ? f.soegMeta(q) : f.soegTitel,
    // Soegeresultat-sider skal ikke indekseres (tyndt/dubleret indhold).
    robots: { index: false, follow: true },
  };
}

export default async function ForumSoegSide({
  searchParams,
}: {
  searchParams: { q?: string; kat?: string };
}) {
  const q = (searchParams.q ?? '').trim();
  const kat = (searchParams.kat ?? '').trim();

  const sprog = await hentSprog();
  const [kategorier, t] = await Promise.all([getKategoriListe(sprog), hentOrdbog()]);
  const f = t.forum;
  // Validér scope mod kategori-listen -> send kun en kendt slug til RPC'en
  // (ukendt/manipuleret slug nulstilles til "alle fora").
  const scope = kat ? kategorier.find((k) => k.slug === kat) ?? null : null;
  const scopeSlug = scope ? scope.slug : '';
  const resultater = q ? await getForumSoeg(q, scopeSlug || null, 50, sprog) : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/forum" className="text-sm text-grafit-500 hover:text-kobber-700">
        {f.tilbageForum}
      </Link>

      <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-grafit-900">
        {f.soegTitel}
      </h1>
      <p className="mt-1 text-sm text-grafit-500">
        {f.soegIntro}
      </p>

      <div className="mt-5">
        <TraadSoegeForm defaultValue={q} stor kategorier={kategorier} scopeSlug={scopeSlug} sprog={sprog} />
      </div>

      {/* Tilstande: ingen søgning endnu / ingen match / resultater */}
      {!q ? (
        <p className="mt-10 text-center text-grafit-400">
          {f.soegTom}
        </p>
      ) : resultater.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-grafit-300 bg-white px-6 py-12 text-center">
          <p className="text-grafit-600">
            {f.ingenMatch} <span className="font-semibold">“{q}”</span>
            {scope && <> {f.iScope} <span className="font-semibold">{scope.name}</span></>}.
          </p>
          <p className="mt-2 text-sm text-grafit-400">
            {scope ? (
              <>
                {f.proevAndetScope}{' '}
                <Link
                  href={`/forum/soeg?q=${encodeURIComponent(q)}`}
                  className="font-medium text-kobber-700 hover:underline"
                >
                  {f.soegAlleFora}
                </Link>
                .
              </>
            ) : (
              <>
                {f.proevAndet}{' '}
                <Link href="/forum" className="font-medium text-kobber-700 hover:underline">
                  {f.gennemse}
                </Link>
                .
              </>
            )}
          </p>
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-grafit-400">
            {f.antalMatcher(resultater.length)} “{q}”
            {scope && <> {f.iScope} {scope.name}</>}
          </p>
          <div className="mt-3 divide-y divide-grafit-100 overflow-hidden rounded-2xl border border-grafit-200 bg-white">
            {resultater.map((r) => (
              <Link
                key={r.id}
                href={`/forum/${r.kategoriSlug}/${r.slug}`}
                className="block px-4 py-4 transition-colors hover:bg-grafit-50"
              >
                {/* Kategori/model-chip - resultater er på tværs, så rummet vises */}
                <div className="flex items-center gap-2 text-xs text-grafit-400">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-grafit-100 px-2 py-0.5 font-semibold text-grafit-600">
                    {r.modelId ? (
                      <span className="font-display tabular-nums tracking-tight text-kobber-700">
                        {modelBadge(r.kategoriSlug)}
                      </span>
                    ) : (
                      <span aria-hidden="true">{r.kategoriIcon ?? '💬'}</span>
                    )}
                    {r.kategoriNavn}
                  </span>
                </div>

                {/* Titel */}
                <div className="mt-1.5 flex items-center gap-2">
                  {r.isPinned && (
                    <span className="shrink-0 text-xs" title={f.fastgjort}>
                      📌
                    </span>
                  )}
                  {r.isLocked && (
                    <span className="shrink-0 text-xs" title={f.laast}>
                      🔒
                    </span>
                  )}
                  <span className="font-semibold text-grafit-900">{r.title}</span>
                </div>

                {/* Highlightet uddrag */}
                <Uddrag tekst={r.uddrag} />

                {/* Forfatter + garage-badge + aktivitet + tal */}
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-grafit-400">
                  <span>{r.forfatter || f.ejer}</span>
                  <GarageBadge bil={r.bil} />
                  <span>· {relativTid(r.lastPostAt, sprog)}</span>
                  <span>· 💬 {r.replyCount}</span>
                  <span className="hidden sm:inline">· 👁 {r.viewCount}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
