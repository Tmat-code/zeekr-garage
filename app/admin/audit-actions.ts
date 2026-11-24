'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { erSuperadmin } from '@/lib/admin';
import {
  getAuditSpor,
  getAuditSeneste,
  type AuditSide,
} from '@/lib/queries-admin';

// Audit-fladen er superadmin-only. RPC'erne gater ogsaa selv i DB
// (where er_superadmin()), men vi stopper tidligt her med en laesbar fejl.

export async function hentAuditSpor(
  aktoer: string | null,
  limit = 50,
  offset = 0,
): Promise<AuditSide> {
  if (!(await erSuperadmin())) throw new Error('Kun superadmin.');
  return getAuditSpor(aktoer, limit, offset);
}

export async function hentAuditSeneste(limit = 50, offset = 0): Promise<AuditSide> {
  if (!(await erSuperadmin())) throw new Error('Kun superadmin.');
  return getAuditSeneste(limit, offset);
}

// Revert: skriv OLD-snapshotten tilbage (kun sikker delmaengde + "uroert siden"-
// guard - alt haandhaeves i superadmin_revert). Fejlbeskeden fra RPC'en bobler
// op til UI'et (fx "Raekken er aendret siden - fortryd manuelt.").
export async function fortrydHaendelse(auditId: number): Promise<string> {
  if (!(await erSuperadmin())) throw new Error('Kun superadmin.');
  const sb = supabaseServer();
  const { data, error } = await sb.rpc('superadmin_revert', { p_audit_id: auditId });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/audit');
  revalidatePath('/admin');
  return (data as string) ?? 'Fortrudt.';
}
