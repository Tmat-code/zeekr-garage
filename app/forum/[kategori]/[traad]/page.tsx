import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTraad, getIndlaeg } from '@/lib/forum';
import { hentOrdbog, hentSprog } from '@/lib/i18n/server';
import { DATO_LOCALE } from '@/lib/i18n/format';
import type { UiSprog } from '@/lib/i18n';
import { adminKontekst, rolleErModerator } from '@/lib/admin';
import { modelBadge } from '@/lib/model-badge';
import ForumTraad from '@/components/forum/ForumTraad';
import TraadModeration from '@/components/forum/TraadModeration';
import VisningPing from '@/components/forum/VisningPing';

export const dynamic = 'force-dynamic';

function dato(iso: string, sprog: UiSprog): string {
  return new Date(iso).toLocaleDateString(DATO_LOCALE[sprog], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export async function generateMetadata({
  params,
}: {
  params: { kategori: string; traad: string };
}) {
  const t = await getTraad(params.traad);
  return { title: t ? t.title : (await hentOrdbog()).forum.traadMetaFallback };
}

export default async function TraadSide({
  params,
}: {
  params: { kategori: string; traad: string };
}) {
  const traad = await getTraad(params.traad);
  // Tråden skal høre til den kategori URL'en peger på.
  if (!traad || traad.kategori.slug !== params.kategori) notFound();

  const [indlaeg, ctx] = await Promise.all([getIndlaeg(traad.id), adminKontekst()]);
  const erModerator = rolleErModerator(ctx.rolle);
  const isLoggedIn = !!ctx.user;
  const naeste = `/forum/${params.kategori}/${traad.slug}`;
  // Trin 3 + U1: laeserens maalsprog = UI-sproget (profil > cookie >
  // Accept-Language > da), saa knap og UI altid er enige. Styrer hvilke indlaeg
  // der faar en "Oversaet"-knap.
  const minSprog = await hentSprog();
  const f = (await hentOrdbog()).forum;

  // Bro til Feedback: prefill /meld med trådens titel + åbnings-indlæg (kortet,
  // så URL'en ikke bliver for lang). Kun relevant for moderatorer (triage).
  const aabning = indlaeg.find((p) => p.isOpening)?.body ?? '';
  const feedbackUrl =
    `/meld?type=fejl&titel=${encodeURIComponent(traad.title)}` +
    `&beskrivelse=${encodeURIComponent(aabning.slice(0, 1200))}` +
    `&fra=${encodeURIComponent(naeste)}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <VisningPing threadId={traad.id} />

      {/* Brødkrumme */}
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-grafit-500">
        <Link href="/forum" className="hover:text-kobber-700">
          {f.titel}
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={`/forum/${traad.kategori.slug}`} className="hover:text-kobber-700">
          {traad.kategori.modelId ? (
            <span className="mr-1.5 rounded bg-grafit-100 px-1 py-0.5 font-display text-[10px] font-semibold tabular-nums tracking-tight text-kobber-700">
              {modelBadge(traad.kategori.slug)}
            </span>
          ) : (
            traad.kategori.icon && <span className="mr-1">{traad.kategori.icon}</span>
          )}
          {traad.kategori.name}
        </Link>
      </nav>

      {/* Titel + meta */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {traad.isPinned && <span className="chip bg-kobber-100 text-kobber-800">{f.fastgjortChip}</span>}
        {traad.isLocked && <span className="chip bg-grafit-100 text-grafit-600">{f.laastChip}</span>}
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-grafit-900">{traad.title}</h1>
      <p className="mt-1 text-sm text-grafit-500">
        {f.traadMeta(dato(traad.createdAt, minSprog), traad.replyCount, traad.viewCount)}
      </p>

      {erModerator && (
        <TraadModeration
          threadId={traad.id}
          kategoriSlug={traad.kategori.slug}
          traadSlug={traad.slug}
          isPinned={traad.isPinned}
          isLocked={traad.isLocked}
          feedbackUrl={feedbackUrl}
        />
      )}

      <ForumTraad
        threadId={traad.id}
        kategoriSlug={traad.kategori.slug}
        traadSlug={traad.slug}
        indlaeg={indlaeg}
        megId={ctx.user?.id ?? null}
        erModerator={erModerator}
        isLoggedIn={isLoggedIn}
        isLocked={traad.isLocked}
        naeste={naeste}
        minSprog={minSprog}
      />
    </div>
  );
}
