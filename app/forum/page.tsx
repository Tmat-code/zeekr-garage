import Link from 'next/link';
import { getForumGrupper, getKategoriListe } from '@/lib/forum';
import { getCurrentUser } from '@/lib/queries';
import ForumOversigt from '@/components/forum/ForumOversigt';
import TraadSoegeForm from '@/components/forum/TraadSoegeForm';
import { hentOrdbog, hentSprog } from '@/lib/i18n/server';

export async function generateMetadata() {
  const f = (await hentOrdbog()).forum;
  return { title: f.metaTitel, description: f.metaBeskrivelse };
}

export const dynamic = 'force-dynamic';

export default async function ForumSide() {
  const [grupper, kategorier, user, sprog, t] = await Promise.all([
    getForumGrupper(),
    getKategoriListe(),
    getCurrentUser(),
    hentSprog(),
    hentOrdbog(),
  ]);
  const f = t.forum;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Intro */}
      <section className="rounded-2xl border border-grafit-200 bg-white px-6 py-8 sm:px-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-grafit-900 sm:text-3xl">
          {f.titel}
        </h1>
        <p className="mt-2 max-w-2xl text-grafit-600">
          {f.introFoer}{' '}
          <Link href="/feedback" className="font-medium text-kobber-700 hover:underline">
            {f.introLink}
          </Link>
          {f.introEfter}
        </p>
        <p className="mt-4 text-sm text-grafit-400">
          {f.alleKanLaese}
          {!user && (
            <>
              {' '}
              <Link href="/login" className="font-medium text-kobber-700 hover:underline">
                {t.faellesFejl.logInd}
              </Link>
            </>
          )}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span aria-hidden>📋</span>
          <span className="text-grafit-600">{f.nyHerLaes}</span>
          <Link
            href="/forum/regler"
            className="font-medium text-kobber-700 hover:underline"
          >
            {f.reglerLink}
          </Link>
          <span className="text-grafit-400">{f.reglerEfter}</span>
        </div>
      </section>

      {/* Tværgående tråd-søgning: finder indhold på tværs af alle rum, med
          valgfrit scope til ét forum. */}
      <div className="mt-6">
        <TraadSoegeForm stor kategorier={kategorier} sprog={sprog} />
      </div>

      <div className="mt-8">
        <ForumOversigt grupper={grupper} sprog={sprog} />
      </div>
    </div>
  );
}
