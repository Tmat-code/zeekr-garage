import { getLinkGrupper } from '@/lib/links';
import { getModels } from '@/lib/queries';
import LinksVisning from '@/components/LinksVisning';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Nyttige links',
  description:
    'Nyttige links for Zeekr-ejere: officielt fra Zeekr, test og specs, køb, tilbehør og praktisk. Filtrér efter din model.',
};

export default async function LinksSide() {
  const [grupper, modeller] = await Promise.all([getLinkGrupper(), getModels()]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-grafit-900 sm:text-4xl">
        Nyttige links
      </h1>
      <p className="mt-3 max-w-2xl text-grafit-600">
        Ting vi selv bruger som Zeekr-ejere: officielt fra Zeekr, test og specs, køb og tilbehør,
        og lidt praktisk. Filtrér på din model, så du ser det, der passer til netop din bil - links
        uden model gælder alle.
      </p>
      <p className="mt-2 text-sm text-grafit-400">
        Vi tjener ikke på nogen af linkene. Eksterne sider åbner i et nyt faneblad.
      </p>

      <LinksVisning
        grupper={grupper}
        modeller={modeller.map((m) => ({ slug: m.slug, name: m.name }))}
      />
    </main>
  );
}
