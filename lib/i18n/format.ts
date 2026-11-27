// Dato/tid/tal pr. UI-sprog (flyttet fra lib/tid.ts i U1). Rene funktioner,
// virker på både server og klient. `sprog` er valgfri og falder til dansk, så
// kaldere i endnu-ikke-oversatte skiver opfører sig som før.

import { ordbog } from './index';
import type { UiSprog } from './sprog';

// Samme locales som rapportens DATO_LOCALE (lib/rapport-i18n.ts). Bevidst en
// lokal kopi: format.ts bruges i klient-komponenter, og en import af
// rapport-i18n ville trække hele rapportens tekst-tabel med i browser-bundlet.
export const DATO_LOCALE: Record<UiSprog, string> = { da: 'da-DK', sv: 'sv-SE', en: 'en-GB' };

const TZ = 'Europe/Copenhagen';

// Absolut dato + tid i dansk tid (til events). null => "Dato kommer".
export function datoTid(iso: string | null, sprog: UiSprog = 'da'): string {
  if (!iso) return ordbog(sprog).tid.datoKommer;
  return new Date(iso).toLocaleString(DATO_LOCALE[sprog], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  });
}

// 'YYYY-MM-DD' -> kort dato uden tid ("27. nov. 2026"). Middag for at undgå
// tz-dagskift. Ugyldig værdi gives tilbage som den er.
export function datoKort(isoDato: string, sprog: UiSprog = 'da'): string {
  try {
    return new Date(isoDato + 'T12:00:00').toLocaleDateString(DATO_LOCALE[sprog], {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: TZ,
    });
  } catch {
    return isoDato;
  }
}

// Relativ tidsangivelse ("3t siden" / "3 tim sedan" / "3h ago").
export function relativTid(iso: string, sprog: UiSprog = 'da'): string {
  const t = ordbog(sprog).tid;
  const sek = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));

  if (sek < 60) return t.ligeNu;
  const min = Math.floor(sek / 60);
  if (min < 60) return t.minutter(min);
  const timer = Math.floor(min / 60);
  if (timer < 24) return t.timer(timer);
  const dage = Math.floor(timer / 24);
  if (dage === 1) return t.iGaar;
  if (dage < 7) return t.dage(dage);
  const uger = Math.floor(dage / 7);
  if (uger < 5) return t.uger(uger);
  const maaneder = Math.floor(dage / 30);
  if (maaneder < 12) return t.maaneder(maaneder);
  return t.aar(Math.floor(dage / 365));
}

// Heltal med sprogets tusindtals-separator.
export function tal(n: number, sprog: UiSprog = 'da'): string {
  return n.toLocaleString(DATO_LOCALE[sprog]);
}
