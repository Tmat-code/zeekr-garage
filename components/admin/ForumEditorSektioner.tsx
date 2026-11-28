// Forum-fanens STRUKTUR-editorer: kategorier, model-administration (admin) og
// forum-regler. Forbliver DANSKE (afklaret med Torben 28-11 under U6: kategori-
// /model-editoren er admin-kun i designet). U7: editorerne har felter pr. sprog
// (svensk + engelsk) til selve indholdet; editorens egen UI er stadig dansk. Udskilt fra app/admin/forum/page.tsx, så siden selv kan
// oversættes, mens denne fil bevidst står uden for U6-scanneren.

import KategoriStyring from '@/components/admin/KategoriStyring';
import ForumReglerEditor from '@/components/admin/ForumReglerEditor';
import TilfoejModel from '@/components/admin/TilfoejModel';
import ModellerPanel from '@/components/admin/ModellerPanel';
import type { getForumGrupper } from '@/lib/forum';
import type { getModelOversigt } from '@/lib/queries-admin';
import type { getForumRegler } from '@/lib/forum-regler';

export default function ForumEditorSektioner({
  grupper,
  antalKategorier,
  kanModel,
  modeller,
  regler,
}: {
  grupper: Awaited<ReturnType<typeof getForumGrupper>>;
  antalKategorier: number;
  kanModel: boolean;
  modeller: Awaited<ReturnType<typeof getModelOversigt>>;
  regler: Awaited<ReturnType<typeof getForumRegler>>;
}) {
  return (
    <>
      <section className="rounded-2xl border border-grafit-200 bg-grafit-50 p-5 sm:p-6">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-grafit-900">Kategorier</h2>
          <span className="text-sm text-grafit-400">{antalKategorier} i alt</span>
        </div>
        <p className="mb-4 text-sm text-grafit-500">
          Opret, omdøb, flyt mellem grupper, sortér og lås kategorier - direkte her, uden at gå i
          databasen. Brug "+ Ny kategori" under en gruppe til at lægge en ny kategori i netop den
          gruppe, eller "+ Ny gruppe" nederst til at lave en helt ny spand. Pilene omsorterer i
          gruppen, dropdown'en flytter til en anden gruppe, og pilene ved gruppe-overskriften
          omsorterer grupperne. Model-foraene er fast i Modellerne. En låst kategori kan kun
          moderatorer starte tråde i.
        </p>
        <KategoriStyring grupper={grupper} />
      </section>

      {kanModel && (
        <section className="rounded-2xl border border-grafit-200 bg-grafit-50 p-5 sm:p-6">
          <h2 className="mb-1 text-lg font-semibold text-grafit-900">Tilføj model</h2>
          <p className="mb-4 text-sm text-grafit-500">
            Opret en ny Zeekr-model, så den straks kan vælges i Min garage, bruges til "mig med"-
            bekræftelser og tælles med i Zeekr-rapporten. Modellen får automatisk sit eget forum
            under Modellerne. Model-fora kan ikke oprettes som almindelige kategorier - de skal
            kobles til en bil-model, og det er netop det, der sker her.
          </p>
          <TilfoejModel />

          <div className="mt-6 border-t border-grafit-200 pt-5">
            <h3 className="mb-1 text-base font-semibold text-grafit-900">Modeller</h3>
            <p className="mb-4 text-sm text-grafit-500">
              Alle modeller med deres forbrug. Ryd en fejloprettet model væk (kun mulig, når den er
              tom), eller arkivér en model, der er i brug - så forsvinder den fra "vælg model"-
              listerne, mens data og rapport bevares.
            </p>
            <ModellerPanel modeller={modeller} />
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-grafit-200 bg-white p-5 sm:p-6">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-grafit-900">Forum-regler</h2>
          <a
            href="/forum/regler"
            target="_blank"
            className="text-sm text-kobber-700 hover:underline"
          >
            Se på forummet →
          </a>
        </div>
        <p className="mb-4 text-sm text-grafit-500">
          De fælles spilleregler for forummet. Rediger her, så slår de igennem på{' '}
          <span className="font-mono text-grafit-600">/forum/regler</span> med det samme.
        </p>
        <ForumReglerEditor
          initial={regler.contentDa}
          initialOversaettelser={regler.oversaettelser}
          updatedAt={regler.updatedAt}
        />
      </section>
    </>
  );
}
