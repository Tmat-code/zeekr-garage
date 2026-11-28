// U6: fejl-NØGLER for Værkstedets moderator-handlinger. Server-actions
// returnerer en nøgle (aldrig en færdig tekst og aldrig en rå DB-fejl);
// klienten slår teksten op i Værksted-ordbogen ved render, så en synlig fejl
// skifter med når man skifter sprog. Samme mønster som U5 (lib/beskeder-fejl.ts).
// Ren fil (ingen Next/Supabase), så i18n-testen kan køre den.

export const VAERKSTED_FEJL = [
  'ingenAdgang',
  'ugyldigStatus',
  'ugyldigAlvor',
  'ugyldigKategori',
  'ugyldigtSprog',
  'tomTitel',
  'ugyldigGrund',
  'ugyldigeDage',
  'egenKonto',
  'maalErAdmin',
  'brugerFindesIkke',
  'henvendelseFindesIkke',
  'nogetGikGalt',
] as const;

export type VFejl = (typeof VAERKSTED_FEJL)[number];

export type VSvar<T = undefined> = { ok: true; data: T } | { ok: false; fejl: VFejl };

export function erVFejl(x: unknown): x is VFejl {
  return typeof x === 'string' && (VAERKSTED_FEJL as readonly string[]).includes(x);
}

// De kendte (danske) raise exception-tekster fra de RPC'er Værkstedets
// moderator-flader kalder (mod_suspender_bruger, admin_ban_bruger, admin_ophaev,
// admin_anonymiser i 20261124140000_bruger_sanktioner.sql + P32-udgaverne i
// 20261124210000_p32_audit_superadmin.sql, kontakt_saet_behandlet i
// 20261126130000_kontakt_beskeder.sql) + RLS-afvisninger -> nøgle.
// Ukendt -> null (kalderen bruger 'nogetGikGalt' og logger originalen).
export function vFejlFraDb(besked: string | null | undefined): VFejl | null {
  const m = (besked ?? '').toLowerCase();
  if (!m) return null;
  if (/^kun (moderator|admin|stab|superadmin)/.test(m)) return 'ingenAdgang';
  if (/row-level security|permission denied/.test(m)) return 'ingenAdgang';
  if (m.includes('ugyldig grund')) return 'ugyldigGrund';
  if (m.includes('antal dage')) return 'ugyldigeDage';
  if (m.includes('din egen konto')) return 'egenKonto';
  if (/^en admin/.test(m)) return 'maalErAdmin';
  if (m.includes('brugeren findes ikke')) return 'brugerFindesIkke';
  if (m.includes('henvendelsen findes ikke')) return 'henvendelseFindesIkke';
  return null;
}

// Suspensions-længde: heltal 1..3650 (samme grænse som RPC'en).
export function gyldigeDage(dage: unknown): boolean {
  return typeof dage === 'number' && Number.isInteger(dage) && dage >= 1 && dage <= 3650;
}
