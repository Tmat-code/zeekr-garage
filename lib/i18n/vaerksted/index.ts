// UI-i18n U6: Værkstedets moderator-ordbog samlet. Ren modul (ingen Next), så
// både server og klient kan slå op. Server: `hentVOrdbog()` fra ./server.
// Klient: `useVOrdbog()` fra ./klient. Må KUN importeres under app/admin/** og
// components/admin/** (scripts/i18n-test.mjs tjekker det), så teksten holdes
// ude af det offentlige bundle.

import { vda, type VOrdbog } from './da';
import { vsv } from './sv';
import { ven } from './en';
import type { UiSprog } from '../sprog';

export type { VOrdbog, ManualKort, ManualBlok } from './da';

export const V_ORDBOGER: Record<UiSprog, VOrdbog> = { da: vda, sv: vsv, en: ven };

export function vordbog(sprog: UiSprog): VOrdbog {
  return V_ORDBOGER[sprog] ?? vda;
}
