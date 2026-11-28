import Link from 'next/link';
import { getForumRegler } from '@/lib/forum-regler';
import { relativTid } from '@/lib/i18n/format';
import ReglerIndhold from '@/components/forum/ReglerIndhold';
import { hentOrdbog, hentSprog } from '@/lib/i18n/server';

export async function generateMetadata() {
  const f = (await hentOrdbog()).forum;
  return { title: f.reglerMetaTitel, description: f.reglerMetaBeskrivelse };
}

export const dynamic = 'force-dynamic';

export default async function ForumReglerSide() {
  const [{ content, updatedAt }, sprog, t] = await Promise.all([
    getForumRegler(),
    hentSprog(),
    hentOrdbog(),
  ]);
  const f = t.forum;
  const harIndhold = content.trim().length > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <nav className="mb-4 text-sm text-grafit-400">
        <Link href="/forum" className="hover:text-kobber-700 hover:underline">
          {f.titel}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-grafit-600">{f.reglerBroedkrumme}</span>
      </nav>

      <section className="rounded-2xl border border-grafit-200 bg-white px-6 py-8 sm:px-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-grafit-900 sm:text-3xl">
          {f.reglerTitel}
        </h1>
        {updatedAt && (
          <p className="mt-1 text-xs text-grafit-400">{f.opdateret(relativTid(updatedAt, sprog))}</p>
        )}

        <div className="mt-6">
          {harIndhold ? (
            <ReglerIndhold content={content} />
          ) : (
            <p className="text-grafit-500">
              {f.reglerTomme}
            </p>
          )}
        </div>
      </section>

      <p className="mt-6 text-sm text-grafit-500">
        {f.reglerFejlFoer}{' '}
        <Link href="/feedback" className="font-medium text-kobber-700 hover:underline">
          {f.reglerFejlLink}
        </Link>
        {f.reglerFejlEfter}
      </p>
    </div>
  );
}
