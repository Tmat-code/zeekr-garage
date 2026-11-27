import { getLinkGrupper, lokaliserLinkGrupper } from '@/lib/links';
import { getModels } from '@/lib/queries';
import LinksVisning from '@/components/LinksVisning';
import { hentOrdbog, hentSprog } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await hentOrdbog();
  return { title: t.links.titel, description: t.links.metaBeskrivelse };
}

export default async function LinksSide() {
  // U1b: gruppe-titler og link-navne/-kilder vises paa laeserens sprog fra de
  // manuelle felter pr. sprog (tomt felt = dansk).
  const [raa, modeller, t, sprog] = await Promise.all([
    getLinkGrupper(),
    getModels(),
    hentOrdbog(),
    hentSprog(),
  ]);
  const grupper = lokaliserLinkGrupper(raa, sprog);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-grafit-900 sm:text-4xl">
        {t.links.titel}
      </h1>
      <p className="mt-3 max-w-2xl text-grafit-600">
        {t.links.intro}
      </p>
      <p className="mt-2 text-sm text-grafit-400">
        {t.links.note}
      </p>

      <LinksVisning
        grupper={grupper}
        modeller={modeller.map((m) => ({ slug: m.slug, name: m.name }))}
      />
    </main>
  );
}
