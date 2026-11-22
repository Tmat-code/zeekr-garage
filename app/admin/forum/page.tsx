import { getForumGrupper } from '@/lib/forum';
import { getAdminForum } from '@/lib/queries-admin';
import { getForumRegler } from '@/lib/forum-regler';
import KategoriStyring from '@/components/admin/KategoriStyring';
import ForumModerering from '@/components/admin/ForumModerering';
import ForumReglerEditor from '@/components/admin/ForumReglerEditor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Forum - Værkstedet' };

export default async function AdminForumSide() {
  const [grupper, forum, regler] = await Promise.all([
    getForumGrupper(),
    getAdminForum(25),
    getForumRegler(),
  ]);

  const antalKategorier = grupper.reduce((s, g) => s + g.kategorier.length, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border-2 border-kobber-200 bg-white p-5 sm:p-6">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-grafit-900">Forum-moderering</h2>
          <span className="text-sm text-grafit-400">{forum.traade.length} seneste tråde</span>
        </div>
        <p className="mb-4 text-sm text-grafit-500">
          Fastgør, lås eller fjern tråde og indlæg. Handlingerne slår igennem på forummet med det
          samme.
        </p>
        <ForumModerering traade={forum.traade} indlaeg={forum.indlaeg} />
      </section>

      <section className="rounded-2xl border border-grafit-200 bg-grafit-50 p-5 sm:p-6">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-grafit-900">Kategorier</h2>
          <span className="text-sm text-grafit-400">{antalKategorier} i alt</span>
        </div>
        <p className="mb-4 text-sm text-grafit-500">
          Opret, omdøb, sortér og lås kategorier - direkte her, uden at gå i databasen. En låst
          kategori kan kun moderatorer starte tråde i.
        </p>
        <KategoriStyring grupper={grupper} />
      </section>

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
        <ForumReglerEditor initial={regler.content} updatedAt={regler.updatedAt} />
      </section>
    </div>
  );
}
