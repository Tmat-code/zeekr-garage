// SSRF-sikker link-preview-henter (P38) - SERVER-ONLY (node: dns/net/http/https).
// ---------------------------------------------------------------------------
// Serveren henter en VILKAARLIG bruger-leveret URL for at traekke Open Graph-
// data ud. Den koerer paa Pixa midt paa hjemmenettet (Coolify 192.168.1.18:8000,
// router 192.168.1.1, selvhostet Supabase), saa SSRF-vaernet er ikke til
// forhandling: en ondsindet bruger maa ALDRIG kunne faa serveren til at hente
// en intern adresse.
//
// Vaern:
//  - Kun http/https.
//  - Vi slaar vaertsnavnet op SELV (dns.lookup) og validerer HVER returneret IP
//    mod en blokliste (privat/loopback/link-local/reserved). Selve forbindelsen
//    bruger en custom `lookup`, der re-validerer paa forbindelses-tidspunktet
//    (lukker DNS-rebinding/TOCTOU: socketten forbinder kun til en valideret IP).
//  - Redirects foelges manuelt (maks REDIRECT_MAKS). HVER redirect er en ny
//    request med ny lookup-validering, saa en redirect til en intern IP fanges.
//  - Timeout (~5s samlet) + stoerrelses-cap (~512 KB; vi laeser kun starten/<head>).
//  - Best-effort: enhver fejl/blokering/timeout -> null (ingen kort, intet crash).

import { lookup as dnsLookup } from 'node:dns';
import { isIP } from 'node:net';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import type { LookupFunction } from 'node:net';
// (ingen import fra lib/forum-links her - helperen bruger kun node-moduler)

const TIMEOUT_MS = 5000;
const MAKS_BYTES = 512 * 1024; // 512 KB - rigeligt til <head>
const REDIRECT_MAKS = 3;
const USER_AGENT = 'ZeekrGarageBot/1.0 (+https://zeekr-garage.dk)';

export type LinkPreview = { title: string | null; description: string | null; image: string | null };

// --- IP-blokering ----------------------------------------------------------

function ipv4ErPrivat(ip: string): boolean {
  const d = ip.split('.').map((x) => parseInt(x, 10));
  if (d.length !== 4 || d.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true; // uparsbar = bloker
  const [a, b] = d;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10/8
  if (a === 127) return true; // 127/8 loopback
  if (a === 169 && b === 254) return true; // 169.254/16 link-local
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
  if (a === 192 && b === 168) return true; // 192.168/16
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64/10 CGNAT (ekstra)
  if (a >= 224) return true; // 224/4 multicast + 240/4 reserved + 255.255.255.255
  return false;
}

function ipv6ErPrivat(raw: string): boolean {
  let ip = raw.toLowerCase();
  // Zone-id (fe80::1%eth0) -> strip
  const pct = ip.indexOf('%');
  if (pct >= 0) ip = ip.slice(0, pct);
  // IPv4-mappet (::ffff:1.2.3.4 eller ::ffff:102:304) -> tjek den indlejrede IPv4.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(ip);
  if (mapped) return ipv4ErPrivat(mapped[1]);
  if (ip === '::1') return true; // loopback
  if (ip === '::') return true; // unspecified
  if (ip.startsWith('fe80')) return true; // fe80::/10 link-local
  // fc00::/7 unique-local = fc.. eller fd..
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true;
  return false;
}

// true => IP maa IKKE hentes.
export function erBlokeretIp(ip: string): boolean {
  const fam = isIP(ip);
  if (fam === 4) return ipv4ErPrivat(ip);
  if (fam === 6) return ipv6ErPrivat(ip);
  return true; // ukendt format = bloker
}

// Custom lookup til http(s).request: slaar op som normalt, men KASTER hvis den
// resolvede adresse er blokeret. Re-validerer paa HVER forbindelse (inkl. hver
// redirect, da hver redirect er en ny request med denne lookup).
const sikkerLookup: LookupFunction = (hostname, options, callback) => {
  // En host der ER en IP-literal (http://192.168.1.18) slaas ikke op af dns,
  // men bliver stadig valideret her.
  const direkte = isIP(hostname);
  if (direkte) {
    if (erBlokeretIp(hostname)) {
      callback(new Error('Blokeret IP (intern adresse).'), '', direkte);
      return;
    }
  }
  dnsLookup(hostname, options as any, (err: any, address: any, family: any) => {
    if (err) {
      callback(err, address, family);
      return;
    }
    // options.all => address er et array af { address, family }.
    const liste = Array.isArray(address) ? address : [{ address, family }];
    for (const a of liste) {
      if (erBlokeretIp(a.address)) {
        callback(new Error('Blokeret IP (intern adresse).'), '', 0);
        return;
      }
    }
    callback(null, address as any, family);
  });
};

// --- HTML-udtraek ----------------------------------------------------------

function afkodHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// Find content for en <meta>-tag hvor property ELLER name matcher et af de
// givne noegle-navne (attribut-raekkefoelgen varierer, saa vi laeser hele tag'et).
function metaIndhold(html: string, noegler: string[]): string | null {
  const tagRe = /<meta\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html)) !== null) {
    const tag = m[0];
    const key = /(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
    if (!key || !noegler.includes(key)) continue;
    const content = /content\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
    if (content != null) {
      const v = afkodHtml(content).trim();
      if (v) return v;
    }
  }
  return null;
}

function titelTag(html: string): string | null {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!m) return null;
  const v = afkodHtml(m[1]).replace(/\s+/g, ' ').trim();
  return v || null;
}

function parseOg(html: string, sidensUrl: string): LinkPreview {
  const title = metaIndhold(html, ['og:title', 'twitter:title']) ?? titelTag(html);
  const description =
    metaIndhold(html, ['og:description', 'twitter:description', 'description']) ?? null;
  let image = metaIndhold(html, ['og:image', 'og:image:url', 'twitter:image']) ?? null;
  if (image) {
    try {
      image = new URL(image, sidensUrl).href; // absolutér relativ og:image
    } catch {
      image = null;
    }
  }
  return { title, description, image };
}

// --- Hentning (med manuel redirect) ---------------------------------------

function hentEn(
  urlStr: string,
): Promise<{ redirectTil: string } | { html: string; finalUrl: string } | null> {
  return new Promise((resolve) => {
    let u: URL;
    try {
      u = new URL(urlStr);
    } catch {
      resolve(null);
      return;
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      resolve(null);
      return;
    }

    const request = u.protocol === 'https:' ? httpsRequest : httpRequest;
    let settled = false;
    const done = (v: any) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };

    const req = request(
      u,
      {
        method: 'GET',
        lookup: sikkerLookup,
        headers: {
          'user-agent': USER_AGENT,
          accept: 'text/html,application/xhtml+xml',
          // Signalér at vi kun vil have starten; servere der respekterer det
          // sparer baandbredde (vi capper uanset).
          range: 'bytes=0-524287',
        },
        timeout: TIMEOUT_MS,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        // Redirect -> giv location tilbage til kalderens redirect-loop (ny
        // request = ny lookup-validering).
        if (status >= 300 && status < 400 && res.headers.location) {
          res.destroy();
          try {
            const next = new URL(res.headers.location, u).href;
            done({ redirectTil: next });
          } catch {
            done(null);
          }
          return;
        }
        if (status < 200 || status >= 300) {
          res.destroy();
          done(null);
          return;
        }
        const ct = String(res.headers['content-type'] ?? '');
        if (ct && !/text\/html|application\/xhtml|^\s*$/i.test(ct)) {
          // Ikke HTML (fx et billede/PDF) -> intet OG at parse.
          res.destroy();
          done(null);
          return;
        }
        const chunks: Buffer[] = [];
        let laengde = 0;
        res.on('data', (c: Buffer) => {
          laengde += c.length;
          if (laengde <= MAKS_BYTES) {
            chunks.push(c);
          }
          // Naar vi har nok (eller har set </head>), stop.
          if (laengde >= MAKS_BYTES) {
            res.destroy();
          }
        });
        res.on('end', () => done({ html: Buffer.concat(chunks).toString('utf8'), finalUrl: u.href }));
        res.on('close', () => {
          // destroy() efter cap -> 'end' fyrer ikke; lever det vi har.
          if (!settled) {
            done(
              chunks.length
                ? { html: Buffer.concat(chunks).toString('utf8'), finalUrl: u.href }
                : null,
            );
          }
        });
        res.on('error', () => done(null));
      },
    );

    req.on('timeout', () => {
      req.destroy();
      done(null);
    });
    req.on('error', () => done(null)); // inkl. "Blokeret IP" fra sikkerLookup
    req.end();
  });
}

// Hent OG-data for en URL, SSRF-sikkert, med manuel redirect-loop. Returnerer
// null ved enhver fejl/blokering/timeout, eller hvis intet brugbart blev fundet.
export async function hentLinkPreview(startUrl: string): Promise<LinkPreview | null> {
  let url = startUrl;
  for (let i = 0; i <= REDIRECT_MAKS; i++) {
    const r = await hentEn(url);
    if (!r) return null;
    if ('redirectTil' in r) {
      url = r.redirectTil;
      continue;
    }
    const data = parseOg(r.html, r.finalUrl);
    // Intet brugbart (hverken titel eller billede) -> behandl som "ingen preview".
    if (!data.title && !data.image) return null;
    return data;
  }
  return null; // for mange redirects
}
