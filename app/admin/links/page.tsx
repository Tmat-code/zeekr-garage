import { getLinkGrupper } from '@/lib/links';
import { getModels } from '@/lib/queries';
import { erAdmin } from '@/lib/admin';
import LinksStyring from '@/components/admin/LinksStyring';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Links - Værkstedet' };

export default async function AdminLinksSide() {
  const kan = await erAdmin();

  if (!kan) {
    return (
      <section className="rounded-2xl border border-grafit-200 bg-grafit-50 p-5 sm:p-6">
        <h2 className="mb-1 text-lg font-semibold text-grafit-900">Links</h2>
        <p className="text-sm text-grafit-500">
          Kuratering af links-siden er forbeholdt admin.
        </p>
      </section>
    );
  }

  // fallback:false => en reelt tom DB vises ærligt (ingen fallback-indhold at
  // "redigere"); normalt er der seedet indhold.
  const [grupper, modeller] = await Promise.all([
    getLinkGrupper({ fallback: false }),
    getModels(),
  ]);

  const antal = grupper.reduce((s, g) => s + g.links.length, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border-2 border-kobber-200 bg-white p-5 sm:p-6">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-grafit-900">Nyttige links</h2>
          <a href="/links" target="_blank" className="text-sm text-kobber-700 hover:underline">
            Se på siden →
          </a>
        </div>
        <p className="mb-4 text-sm text-grafit-500">
          Opret, omdøb, flyt mellem grupper, sortér og slet links - direkte her, uden at gå i
          databasen. Pilene omsorterer i gruppen, dropdown'en flytter et link til en anden gruppe,
          og pilene ved gruppe-overskriften omsorterer grupperne. Et link kan tagges med en model;
          links uden model gælder alle. Model-filteret på links-siden dukker op af sig selv, når
          mindst to modeller har links. {antal} links i alt.
        </p>
        <LinksStyring
          grupper={grupper}
          modeller={modeller.map((m) => ({ id: m.id, slug: m.slug, name: m.name }))}
        />
      </section>
    </div>
  );
}
