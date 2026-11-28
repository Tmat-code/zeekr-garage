import { redirect } from 'next/navigation';
import Link from 'next/link';
import { adminKontekst, rolleErSuperadmin } from '@/lib/admin';
import { getAuditAktoerer, getAuditSeneste } from '@/lib/queries-admin';
import AuditFlade from '@/components/admin/AuditFlade';

export const dynamic = 'force-dynamic';
// P44: egen fanetitel (admin-kun, dansk som resten af fanen).
export const metadata = { title: 'Audit-log - Værkstedet' };

export default async function AuditSide() {
  const { rolle } = await adminKontekst();
  // Superadmin-only. Layoutet gater allerede til stab; her strammes til superadmin.
  if (!rolleErSuperadmin(rolle)) redirect('/admin');

  const [aktoerer, seneste] = await Promise.all([
    getAuditAktoerer(),
    getAuditSeneste(50, 0),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-grafit-900">🕵️ Audit-log</h2>
        <Link href="/admin" className="btn-ghost !py-1.5 text-sm">
          ← Tilbage til admin
        </Link>
      </div>

      <AuditFlade aktoerer={aktoerer} seneste={seneste} />
    </div>
  );
}
