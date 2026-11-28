// Delte moderings-grunde (P21). Bruges BAADE af rapportér-knappen (bruger vælger
// hvorfor) og af moderator-handlingerne (hvorfor en traad/indlaeg fjernes, eller
// en bruger advares). Enum-værdierne SKAL matche check'ene i migrationerne
// (mod_fjern_traad/mod_fjern_indlaeg/mod_advar_bruger + forum_reports).
//
// U2: labels bor i ordbogen (`modGrund`). `label` her er den danske, så
// endnu-ikke-oversatte kaldere (Værkstedet, U6) opfører sig som før; oversatte
// flader bruger `grundLabel(v, sprog)`.

import { da } from '@/lib/i18n/da';
import { ordbog, type UiSprog } from '@/lib/i18n';

const VAERDIER = ['dublet', 'tone', 'off-topic', 'spam', 'andet'] as const;

export type ModGrund = (typeof VAERDIER)[number];

export const MOD_GRUNDE: readonly { value: ModGrund; label: string }[] = VAERDIER.map((value) => ({
  value,
  label: da.modGrund[value],
}));

export const MOD_GRUND_VALUES: string[] = [...VAERDIER];

export function grundLabel(v: string | null | undefined, sprog: UiSprog = 'da'): string {
  const t = ordbog(sprog);
  if (!v) return t.modGrundUkendt;
  return (t.modGrund as Record<string, string>)[v] ?? v;
}
