import { getKontaktBeskeder } from '@/lib/queries-admin';
import KontaktBeskeder from '@/components/admin/KontaktBeskeder';
import { hentVOrdbog } from '@/lib/i18n/vaerksted/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const v = await hentVOrdbog();
  return { title: v.metaTitel(v.nav.kontakt) };
}

// Private henvendelser fra brugere (via /kontakt). Hele staben læser (layout'et
// gater til stab; RPC'en gater på er_moderator). Adskilt fra bil-feedbacken
// (/admin/feedback) og den offentlige "Om Zeekr Garage"-forumgruppe.
export default async function AdminKontaktSide() {
  const [side, v] = await Promise.all([getKontaktBeskeder({ limit: 20 }), hentVOrdbog()]);
  const k = v.kontakt;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border-2 border-kobber-200 bg-white p-5 sm:p-6">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-grafit-900">{k.henvendelser}</h2>
          <span className="text-sm text-grafit-400">
            {side.total === 0 ? k.ingenEndnuTaeller : v.faelles.iAlt(side.total)}
          </span>
        </div>
        <p className="mb-4 text-sm text-grafit-500">{k.intro}</p>
        <KontaktBeskeder initial={side} />
      </section>
    </div>
  );
}
