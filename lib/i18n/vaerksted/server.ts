// UI-i18n U6: Værksted-ordbogen på serveren (server-komponenter + server-
// actions under app/admin). Samme sprog-opløsning som resten af sitet.

import { hentSprog } from '../server';
import { vordbog, type VOrdbog } from './index';

export async function hentVOrdbog(): Promise<VOrdbog> {
  return vordbog(await hentSprog());
}
