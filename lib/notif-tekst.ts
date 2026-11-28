// U8: notifikations-tekst på LÆSERENS sprog ud fra type + params.
//
// Triggerne skriver stadig en færdig dansk `tekst` (fallback), men fra U8 også
// `params jsonb` med de rå byggesten (se migration 20261128120000_u8_...). Her
// bygges teksten fra ordbogen. Mangler params (gamle rækker), er typen ukendt
// eller et påkrævet felt mangler/har forkert type, gives `tekst` tilbage uændret
// - aldrig en halv eller tom sætning.
//
// Ren modul: kun type-imports, ordbogens `notif.tekster` sprøjtes ind, så
// scripts/i18n-test.mjs kan teste den uden Next. Navne, titler, emner og
// moderatorens fritekst er indhold og indsættes ordret.

import type { Ordbog } from '@/lib/i18n';

export type NotifTekster = Ordbog['notif']['tekster'];

export type NotifRaa = {
  type: string;
  tekst: string;
  params?: unknown;
};

type P = Record<string, unknown>;

function erObjekt(x: unknown): x is P {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

// Ikke-tom streng, ellers null.
function str(p: P, k: string): string | null {
  const v = p[k];
  return typeof v === 'string' && v.trim() !== '' ? v : null;
}

const MANGLER = Symbol('mangler');

// Påkrævet streng -> kast MANGLER (fanges og giver fallback).
function krav(p: P, k: string): string {
  const v = str(p, k);
  if (v === null) throw MANGLER;
  return v;
}

function grund(t: NotifTekster, p: P): string {
  const g = krav(p, 'grund');
  const label = (t.grund as Record<string, string>)[g];
  if (!label) throw MANGLER; // ukendt grund -> hellere den danske tekst
  return t.grundMedFritekst(label, str(p, 'fritekst'));
}

// Suspensionens udløb i dansk tid (som triggerens to_char(... 'Europe/Copenhagen')).
function dato(t: NotifTekster, iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw MANGLER;
  const dele = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const v = (type: string) => dele.find((x) => x.type === type)?.value ?? '';
  return t.dato({ d: v('day'), m: v('month'), y: v('year'), t: v('hour'), min: v('minute') });
}

function byg(t: NotifTekster, type: string, p: P): string {
  const navn = (fallback: string) => str(p, 'navn') ?? fallback;
  switch (type) {
    case 'forum_svar':
      return p.direkte === true
        ? t.forumSvarDirekte(navn(t.enEjer), krav(p, 'titel'))
        : t.forumSvar(navn(t.enEjer), krav(p, 'titel'));
    case 'mention':
      return t.omtale(navn(t.enEjer), krav(p, 'titel'));
    case 'pb_besked':
      return p.gruppe === true
        ? t.gruppeBesked(navn(t.enEjer), str(p, 'gruppenavn') ?? t.enGruppe)
        : t.besked(navn(t.enEjer));
    case 'nyt_event':
      return t.nytEvent(navn(t.holdet), krav(p, 'titel'));
    case 'advarsel':
      return t.advarsel(grund(t, p));
    case 'forum_rapport': {
      const hvad = p.hvad;
      if (hvad !== 'indlaeg' && hvad !== 'traad') throw MANGLER;
      return t.rapport(navn(t.enEjer), hvad, str(p, 'titel'), grund(t, { grund: p.grund }));
    }
    case 'kontakt':
      return t.kontakt(krav(p, 'emne'));
    case 'ota':
      return t.ota(krav(p, 'version'));
    case 'moderation':
      switch (p.v) {
        case 'fjern_traad':
          return t.fjernTraad(krav(p, 'titel'), grund(t, p));
        case 'fjern_indlaeg':
          return t.fjernIndlaeg(krav(p, 'titel'), grund(t, p));
        case 'fjern_avatar':
          return t.fjernAvatar(grund(t, p));
        case 'suspender':
          return t.suspender(dato(t, krav(p, 'til')), grund(t, p));
        case 'ban':
          return t.ban(grund(t, p));
        case 'ophaev':
          return t.ophaev;
        default:
          throw MANGLER;
      }
    default:
      throw MANGLER;
  }
}

export function notifTekst(n: NotifRaa, t: NotifTekster): string {
  if (!erObjekt(n.params)) return n.tekst;
  try {
    return byg(t, n.type, n.params);
  } catch (e) {
    // MANGLER = forventet fallback; alt andet logges, men en notifikation må
    // aldrig vælte klokken - den danske tekst vises i stedet.
    if (e !== MANGLER) console.error('[notif] kunne ikke bygge tekst:', e);
    return n.tekst;
  }
}

// Kolonnerne klokken + /notifikationer henter (params fra U8).
export const NOTIF_KOLONNER = 'id, type, tekst, href, er_laest, created_at, params'; // i18n-ok
