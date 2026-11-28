// U8: event-opdaterings-mailen pr. modtagerens sprog.
//
// RPC'en event_deltager_modtagere giver (email, sprog) for de tilmeldte; her
// grupperes de pr. sprog, og hver gruppe får én BCC-mail med emne + krop fra
// ordbogen (events.mail). Eventets titel og opdateringens tekst er indhold og
// står som skrevet (escapet). Ren modul (kun type-imports) - testet i
// scripts/i18n-test.mjs.

import type { Ordbog, UiSprog } from '@/lib/i18n';

export type EventMailTekster = Ordbog['events']['mail'];

const SPROG: readonly UiSprog[] = ['da', 'sv', 'en'];

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Robust mod RPC-formen: [{email, sprog}] - ukendt/manglende sprog -> da,
// rækker uden gyldig mail droppes, samme mail kun én gang (første sprog vinder).
export function grupperModtagere(rows: unknown): Record<UiSprog, string[]> {
  const ud: Record<UiSprog, string[]> = { da: [], sv: [], en: [] };
  const set = new Set<string>();
  for (const r of (Array.isArray(rows) ? rows : []) as any[]) {
    const email = typeof r?.email === 'string' ? r.email.trim() : '';
    if (!email.includes('@') || set.has(email.toLowerCase())) continue;
    set.add(email.toLowerCase());
    const s = SPROG.includes(r?.sprog) ? (r.sprog as UiSprog) : 'da';
    ud[s].push(email);
  }
  return ud;
}

export function bygEventMail(
  t: EventMailTekster,
  a: { titel: string; tekst: string; link: string; domaene: string; site: string },
): { emne: string; html: string } {
  const titel = escapeHtml(a.titel);
  return {
    emne: t.emne(a.titel, a.site),
    html:
      `<p>${escapeHtml(t.opdateringTil)} <strong>${titel}</strong>:</p>` + // i18n-ok
      `<p style="white-space:pre-line">${escapeHtml(a.tekst)}</p>` + // i18n-ok
      `<p><a href="${escapeHtml(a.link)}">${escapeHtml(t.seEventet(a.domaene))}</a></p>` + // i18n-ok
      `<hr><p style="color:#888;font-size:12px">${escapeHtml(t.fod(a.site))}</p>`, // i18n-ok
  };
}
