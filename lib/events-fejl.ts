// U5: fejl-NØGLER for events (samme mønster som lib/beskeder-fejl.ts).
// Server-actions returnerer en nøgle; klienten slår teksten op ved render.
// Ren fil, så i18n-testen kan køre den.

export const EVENT_FEJL = [
  'kunModerator',
  'titelForKort',
  'slutFoerStart',
  'kunneIkkeOprette',
  'kunneIkkeGemme',
  'kunneIkkeAflyse',
  'kunneIkkeSlette',
  'logIndTilmeld',
  'kunneIkkeTilmelde',
  'kunneIkkeAfmelde',
  'skrivBesked',
  'kunneIkkeSende',
  'nogetGikGalt',
] as const;

export type EventFejl = (typeof EVENT_FEJL)[number];

export function erEventFejl(x: unknown): x is EventFejl {
  return typeof x === 'string' && (EVENT_FEJL as readonly string[]).includes(x);
}

export const EVENT_TITEL_MIN = 3;

// Fælles validering (klient + server): titel mindst 3 tegn, og slut - hvis sat -
// må ikke ligge før start. ISO-strenge eller null.
export function validerEvent(input: {
  title: string;
  startsAt?: string | null;
  endsAt?: string | null;
}): EventFejl | null {
  if (input.title.trim().length < EVENT_TITEL_MIN) return 'titelForKort';
  if (input.startsAt && input.endsAt) {
    const s = new Date(input.startsAt).getTime();
    const e = new Date(input.endsAt).getTime();
    if (Number.isFinite(s) && Number.isFinite(e) && e < s) return 'slutFoerStart';
  }
  return null;
}

// Udfald af "send opdatering": selve opslaget er gemt; mailen er best-effort.
export type OpdateringGrund = 'ok' | 'ingenTilmeldte' | 'mailFejl';
