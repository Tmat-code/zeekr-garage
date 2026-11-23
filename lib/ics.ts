// .ics-generering (RFC 5545) for ÉT event - ren, testbar logik (P13).
// Route-handleren (app/events/[slug]/ics/route.ts) henter eventet + origin og
// kalder byggEventIcs(); al formatering (tidszone, escape, folding) ligger her,
// saa den kan verificeres uden en koerende server.

export const ICS_TZID = 'Europe/Copenhagen';

// Kanonisk VTIMEZONE for Europe/Copenhagen (CET/CEST, EU-DST-regler).
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${ICS_TZID}`,
  'X-LIC-LOCATION:Europe/Copenhagen',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

// Tekst-escape jf. RFC 5545 (3.3.11): backslash, komma, semikolon, newline.
function esc(v: string): string {
  return v
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// Lokal vaeg-tid i Europe/Copenhagen -> "YYYYMMDDTHHMMSS" (til TZID-form).
export function lokalVaegtid(iso: string): string {
  const d = new Date(iso);
  const dele = new Intl.DateTimeFormat('en-CA', {
    timeZone: ICS_TZID,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const p: Record<string, string> = {};
  for (const del of dele) p[del.type] = del.value;
  const time = p.hour === '24' ? '00' : p.hour; // nogle runtimes giver "24" ved midnat
  return `${p.year}${p.month}${p.day}T${time}${p.minute}${p.second}`;
}

// UTC -> "YYYYMMDDTHHMMSSZ" (til DTSTAMP).
function utcStempel(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Fold linjer til <=75 oktetter jf. RFC 5545 (3.1): fortsaettelse med CRLF + SP.
function fold(linje: string): string {
  const bytes = Buffer.from(linje, 'utf8');
  if (bytes.length <= 75) return linje;
  const stykker: string[] = [];
  let start = 0;
  let graense = 75; // foerste linje 75; efterfoelgende 74 (plads til ledende SP)
  while (start < bytes.length) {
    let slut = Math.min(start + graense, bytes.length);
    while (slut < bytes.length && (bytes[slut] & 0xc0) === 0x80) slut--; // ikke midt i UTF-8
    stykker.push(bytes.subarray(start, slut).toString('utf8'));
    start = slut;
    graense = 74;
  }
  return stykker.join('\r\n ');
}

export type IcsEvent = {
  id: string;
  slug: string;
  title: string | null;
  description: string | null;
  location: string | null;
  starts_at: string;            // paakraevet (route guarder paa null)
  ends_at: string | null;
  is_cancelled: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export function byggEventIcs(ev: IcsEvent, eventUrl: string, naa: Date = new Date()): string {
  const startMs = new Date(ev.starts_at).getTime();
  // Mangler sluttid: default +2 timer, saa kalenderen faar en blok.
  const slutIso = ev.ends_at ?? new Date(startMs + 2 * 60 * 60 * 1000).toISOString();

  // SEQUENCE: sekunder fra created_at til updated_at (0 hvis aldrig aendret).
  // Stiger monotont ved hver opdatering -> revision (samme UID overskrives).
  const createdMs = ev.created_at ? new Date(ev.created_at).getTime() : startMs;
  const updatedMs = ev.updated_at ? new Date(ev.updated_at).getTime() : createdMs;
  const sequence = Math.max(0, Math.round((updatedMs - createdMs) / 1000));

  const aflyst = ev.is_cancelled === true;
  const summary = (aflyst ? 'AFLYST: ' : '') + (ev.title ?? 'Event');

  const descDele: string[] = [];
  if (ev.description) descDele.push(ev.description);
  descDele.push(eventUrl);
  const description = descDele.join('\n\n');

  const vevent: string[] = [
    'BEGIN:VEVENT',
    `UID:${ev.id}@zeekr-garage.dk`,
    `DTSTAMP:${utcStempel(naa)}`,
    `DTSTART;TZID=${ICS_TZID}:${lokalVaegtid(ev.starts_at)}`,
    `DTEND;TZID=${ICS_TZID}:${lokalVaegtid(slutIso)}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(description)}`,
    `URL:${esc(eventUrl)}`,
    `SEQUENCE:${sequence}`,
    `STATUS:${aflyst ? 'CANCELLED' : 'CONFIRMED'}`,
    `TRANSP:${aflyst ? 'TRANSPARENT' : 'OPAQUE'}`,
  ];
  if (ev.location) vevent.push(`LOCATION:${esc(ev.location)}`);
  vevent.push('END:VEVENT');

  const linjer = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Zeekr Garage//Events//DA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...VTIMEZONE,
    ...vevent,
    'END:VCALENDAR',
  ];

  // CRLF-afslutning + linje-folding jf. spec.
  return linjer.map(fold).join('\r\n') + '\r\n';
}
