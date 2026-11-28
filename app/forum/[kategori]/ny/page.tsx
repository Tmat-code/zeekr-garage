import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getKategori } from '@/lib/forum';
import { adminKontekst, rolleErModerator } from '@/lib/admin';
import NyTraadForm from '@/components/forum/NyTraadForm';
import { hentOrdbog, hentSprog } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { kategori: string } }) {
  const kat = await getKategori(params.kategori, await hentSprog());
  const f = (await hentOrdbog()).forum;
  return { title: kat ? f.nyTraadMeta(kat.name) : f.nyTraad };
}

export default async function NyTraadSide({ params }: { params: { kategori: string } }) {
  const kat = await getKategori(params.kategori, await hentSprog());
  if (!kat) notFound();

  const ctx = await adminKontekst();
  const erModerator = rolleErModerator(ctx.rolle);
  const f = (await hentOrdbog()).forum;

  if (!ctx.user) redirect(`/login?naeste=${encodeURIComponent(`/forum/${kat.slug}/ny`)}`);
  // Låste kategorier (fx regler): kun moderatorer kan starte tråde.
  if (kat.isLocked && !erModerator) redirect(`/forum/${kat.slug}`);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href={`/forum/${kat.slug}`} className="text-sm text-grafit-500 hover:text-kobber-700">
        ← {kat.name}
      </Link>
      <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-grafit-900">
        {f.nyTraadTitel(kat.name)}
      </h1>
      <p className="mt-1 text-sm text-grafit-500">
        {f.nyTraadIntro}
      </p>
      <NyTraadForm kategoriSlug={kat.slug} kategoriNavn={kat.name} />
    </div>
  );
}
