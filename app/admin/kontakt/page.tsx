import { getKontaktBeskeder } from '@/lib/queries-admin';
import KontaktBeskeder from '@/components/admin/KontaktBeskeder';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Kontakt - Værkstedet' };

// Private henvendelser fra brugere (via /kontakt). Hele staben læser (layout'et
// gater til stab; RPC'en gater på er_moderator). Adskilt fra bil-feedbacken
// (/admin/feedback) og den offentlige "Om Zeekr Garage"-forumgruppe.
export default async function AdminKontaktSide() {
  const side = await getKontaktBeskeder({ limit: 20 });

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border-2 border-kobber-200 bg-white p-5 sm:p-6">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-grafit-900">Henvendelser</h2>
          <span className="text-sm text-grafit-400">
            {side.total === 0 ? 'ingen endnu' : `${side.total} i alt`}
          </span>
        </div>
        <p className="mb-4 text-sm text-grafit-500">
          Private beskeder fra ejere via Kontakt-siden - klage over en bruger, sikkerhed/persondata
          eller noget personligt. Ses kun af staben.
        </p>
        <KontaktBeskeder initial={side} />
      </section>
    </div>
  );
}
