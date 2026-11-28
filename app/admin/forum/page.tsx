import { getForumGrupper } from '@/lib/forum';
import {
  getForumModTraade,
  getForumModIndlaeg,
  getModelOversigt,
  getForumAktivitet,
  getForumRapporter,
} from '@/lib/queries-admin';
import { getForumRegler } from '@/lib/forum-regler';
import { erAdmin } from '@/lib/admin';
import ForumModerering from '@/components/admin/ForumModerering';
import ForumRapporter from '@/components/admin/ForumRapporter';
import AktivitetFeed from '@/components/admin/AktivitetFeed';
import ForumEditorSektioner from '@/components/admin/ForumEditorSektioner';
import { hentSprog } from '@/lib/i18n/server';
import { vordbog } from '@/lib/i18n/vaerksted';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const v = vordbog(await hentSprog());
  return { title: v.metaTitel(v.nav.forum) };
}

export default async function AdminForumSide() {
  const [grupper, modTraade, modIndlaeg, regler, aktivitet, rapporter, kanModel, sprog] =
    await Promise.all([
      getForumGrupper(),
      getForumModTraade({ limit: 25 }),
      getForumModIndlaeg({ limit: 25 }),
      getForumRegler(),
      getForumAktivitet(12),
      getForumRapporter({ limit: 20 }),
      erAdmin(),
      hentSprog(),
    ]);
  const v = vordbog(sprog);
  const fs = v.forumSide;

  // Model-oversigten (til Modeller-panelet) er admin-only; hent kun når admin.
  const modeller = kanModel ? await getModelOversigt() : [];

  const antalKategorier = grupper.reduce((s, g) => s + g.kategorier.length, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border-2 border-kobber-200 bg-white p-5 sm:p-6">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-grafit-900">{fs.rapporterTitel}</h2>
          <span className="text-sm text-grafit-400">
            {rapporter.total === 0 ? fs.ingenAabne : fs.aabne(rapporter.total)}
          </span>
        </div>
        <p className="mb-4 text-sm text-grafit-500">{fs.rapporterIntro}</p>
        <ForumRapporter initial={rapporter} />
      </section>

      <section className="rounded-2xl border border-grafit-200 bg-grafit-50 p-5 sm:p-6">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-grafit-900">{fs.modTitel}</h2>
          <span className="text-sm text-grafit-400">
            {fs.modTaeller(modTraade.total, modIndlaeg.total)}
          </span>
        </div>
        <p className="mb-4 text-sm text-grafit-500">{fs.modIntro}</p>
        <ForumModerering initialTraade={modTraade} initialIndlaeg={modIndlaeg} />
      </section>

      <section className="rounded-2xl border border-grafit-200 bg-grafit-50 p-5 sm:p-6">
        <h2 className="mb-1 text-lg font-semibold text-grafit-900">{fs.aktivitetTitel}</h2>
        <p className="mb-4 text-sm text-grafit-500">{fs.aktivitetIntro}</p>
        <AktivitetFeed poster={aktivitet} sprog={sprog} tom={fs.ingenAktivitet} />
      </section>

      {/* Kategori-, model- og regel-editorerne forbliver DANSKE (afklaret med
          Torben 28-11: admin-kun-agtige struktur-editorer + dansk DB-indhold
          indtil U7) - derfor i en egen komponent uden for U6-scanneren. */}
      <ForumEditorSektioner
        grupper={grupper}
        antalKategorier={antalKategorier}
        kanModel={kanModel}
        modeller={modeller}
        regler={regler}
      />
    </div>
  );
}
