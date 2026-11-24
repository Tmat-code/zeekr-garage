// Delte moderings-grunde (P21). Bruges BAADE af rapportér-knappen (bruger vælger
// hvorfor) og af moderator-handlingerne (hvorfor en traad/indlaeg fjernes, eller
// en bruger advares). Enum-værdierne SKAL matche check'ene i migrationerne
// (mod_fjern_traad/mod_fjern_indlaeg/mod_advar_bruger + forum_reports).
export const MOD_GRUNDE = [
  { value: 'dublet', label: 'Dublet' },
  { value: 'tone', label: 'Tone / personangreb' },
  { value: 'off-topic', label: 'Off-topic' },
  { value: 'spam', label: 'Spam' },
  { value: 'andet', label: 'Andet' },
] as const;

export type ModGrund = (typeof MOD_GRUNDE)[number]['value'];

export const MOD_GRUND_VALUES: string[] = MOD_GRUNDE.map((g) => g.value);

export function grundLabel(v: string | null | undefined): string {
  if (!v) return 'ukendt';
  return MOD_GRUNDE.find((g) => g.value === v)?.label ?? v;
}
