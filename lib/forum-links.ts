// Link-hjaelpere i forummet (P38) - PURE (ingen node-moduler), saa den kan
// bruges baade klient-side (autolink i ForumTraad) og server-side (hook +
// opslag). SSRF-hentningen ligger i lib/link-preview.ts (server-only).
// (Egen fil - lib/links.ts er P19's nyttige-links-data.)

// http(s)-URL med ikke-whitespace-krop. Trailing tegn (punktum, komma,
// parentes osv.) strippes bagefter, saa "(se https://x.dk/a)." ikke faar
// ")."" med i URL'en.
const URL_RE = /https?:\/\/[^\s<>]+/gi;

// Fjern trailing tegn der naesten altid er saetnings-/parentes-tegn, ikke en
// del af URL'en. En afsluttende ')' beholdes kun hvis URL'en selv har en '('
// (balanceret, fx Wikipedia-links).
function trimTrailing(u: string): string {
  let s = u;
  while (s.length > 0) {
    const sidste = s[s.length - 1];
    if ('.,;:!?”’\'"<>'.includes(sidste)) {
      s = s.slice(0, -1);
      continue;
    }
    if (sidste === ')' || sidste === ']' || sidste === '}') {
      const aaben = sidste === ')' ? '(' : sidste === ']' ? '[' : '{';
      const antalLuk = s.split(sidste).length - 1;
      const antalAaben = s.split(aaben).length - 1;
      if (antalLuk > antalAaben) {
        s = s.slice(0, -1);
        continue;
      }
    }
    break;
  }
  return s;
}

// Foerste http(s)-URL i en tekst (raatrimmet), eller null.
export function foersteUrl(text: string): string | null {
  if (!text) return null;
  URL_RE.lastIndex = 0;
  const m = URL_RE.exec(text);
  if (!m) return null;
  const u = trimTrailing(m[0]);
  return u.length > 'https://'.length ? u : null;
}

// Normalisér en URL til cache-noegle: strip fragment (#...), lowercase host.
// Resten (sti, query, protokol) bevares. Fejler parsningen, returneres den
// raatrimmede streng (saa en "naesten-URL" stadig faar en stabil noegle).
export function normaliserUrl(url: string): string {
  const raw = (url ?? '').trim();
  try {
    const u = new URL(raw);
    u.hash = '';
    u.hostname = u.hostname.toLowerCase();
    return u.toString();
  } catch {
    return raw;
  }
}

export type AutolinkSegment =
  | { t: 'text'; s: string }
  | { t: 'url'; s: string; href: string };

// Del en tekst op i tekst- og URL-segmenter, saa rendereren kan goere URL'erne
// klikbare UDEN at roere resten (whitespace-pre-line bevares af rendereren).
export function autolinkSegmenter(text: string): AutolinkSegment[] {
  const ud: AutolinkSegment[] = [];
  if (!text) return ud;
  URL_RE.lastIndex = 0;
  let sidst = 0;
  let m: RegExpExecArray | null;
  while ((m = URL_RE.exec(text)) !== null) {
    const raw = m[0];
    const href = trimTrailing(raw);
    if (href.length <= 'https://'.length) continue;
    const start = m.index;
    if (start > sidst) ud.push({ t: 'text', s: text.slice(sidst, start) });
    ud.push({ t: 'url', s: href, href });
    const halet = raw.slice(href.length);
    sidst = start + href.length;
    if (halet) {
      ud.push({ t: 'text', s: halet });
      sidst = start + raw.length;
    }
  }
  if (sidst < text.length) ud.push({ t: 'text', s: text.slice(sidst) });
  return ud;
}

// Vaert/domaene til visning paa kortet (uden "www.").
export function vaertAf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
