// Ren, testbar kerne for rapportens KOMMENTAR-oversaettelses-cache (trin 2.6).
// ---------------------------------------------------------------------------
// Kommentarerne havde foer KUN en in-memory cache (toemt ved hvert deploy), saa den
// haarde rapport maltes kold forfra efter enhver deploy. Nu faar de en holdbar
// DB-cache `kommentar_oversaettelser` PRAECIS som meldingernes `oversaettelser`.
// Logikken her er ren (ingen app-imports): DB-laesning/skrivning, motoren og
// hash-funktionen injiceres, saa cache-stien kan assertes isoleret (hit/miss/
// hash-mismatch/konvergens/dedupe) uden DB eller netvaerk. Produktionen wirer den
// mod Supabase + motorOversaet i lib/oversaet.ts.

export type KommentarInput = { id: string; tekst: string };
export type CacheRaekke = { comment_id: string; kilde_hash: string; oversat: string };

export type KommentarCacheDeps = {
  // Slaar cachen op for de givne comment-id'er (ét kald). Må gerne kaste - en fejl
  // behandles som "intet cachet" (alt bliver miss), saa en DB-hikke aldrig crasher.
  hentCache: (ids: string[]) => Promise<CacheRaekke[]>;
  // Skriver (upsert) de faerdige raekker. Må gerne kaste (best-effort cache).
  skrivCache: (raekker: CacheRaekke[]) => Promise<void>;
  // Oversaetter en liste UNIKKE kildetekster -> oversatte (samme raekkefoelge).
  oversaet: (unikke: string[]) => Promise<string[]>;
  // kilde_hash af en body. Produktionen folder MOTOR_ID ind, saa et motor-skift
  // giver hash-mismatch -> cache-miss -> gen-oversaettelse (som meldingerne).
  noegle: (tekst: string) => string;
  klump?: number;
};

// Oversaetter kommentarer med holdbar cache. Returnerer de oversatte tekster i
// SAMME raekkefoelge som input (en graceful fallback = den danske original).
//
// Konvergens: hvert gennemfoert klump skrives straks til cachen, saa et forsoeg der
// timer ud (Cloudflare 524) alligevel efterlader fremgang i DB'en - naeste forsoeg
// laeser cache og springer det gjorte over, praecis som meldingernes `oversaettelser`.
// En fejlet klump beholder dansk og caches IKKE, saa et genforsoeg proever igen.
//
// Dedupe: identiske bodies (fx "+1", "samme her") oversaettes KUN én gang (collapse
// til ét motor-kald), men hver kommentar faar sin egen cache-raekke (PK comment_id),
// saa cascade-oprydning ved slet og hash-staleness ved redigering virker pr. kommentar.
export async function oversaetKommentarerKerne(
  komm: KommentarInput[],
  deps: KommentarCacheDeps,
): Promise<string[]> {
  const ud: string[] = komm.map((k) => k.tekst); // graceful default = dansk original
  if (komm.length === 0) return ud;

  // 1) Cache-opslag i ét kald; valider mod kilde_hash (fanger redigering + motor-skift).
  const cache = new Map<string, CacheRaekke>();
  try {
    for (const r of await deps.hentCache(komm.map((k) => k.id))) cache.set(r.comment_id, r);
  } catch {
    // cache-laesning fejlede -> behandl alt som miss (graceful, intet crash).
  }

  // 2) Afgoer hits vs. miss. Byg samtidig tekst -> alle manglende indeks med den body
  //    (dedupe-grundlaget: samme body oversaettes kun én gang, men caches pr. id).
  const tekstTilIndeks = new Map<string, number[]>();
  komm.forEach((k, i) => {
    const h = deps.noegle(k.tekst);
    const c = cache.get(k.id);
    if (c && c.kilde_hash === h) {
      ud[i] = c.oversat; // hit
    } else {
      const liste = tekstTilIndeks.get(k.tekst);
      if (liste) liste.push(i);
      else tekstTilIndeks.set(k.tekst, [i]);
    }
  });
  if (tekstTilIndeks.size === 0) return ud; // alt var cachet

  // 3) Oversaet de UNIKKE manglende bodies i smaaklumper. Hvert klump caches straks.
  const unikke = [...tekstTilIndeks.keys()];
  const KLUMP = deps.klump ?? 5;
  for (let start = 0; start < unikke.length; start += KLUMP) {
    const gruppe = unikke.slice(start, start + KLUMP);

    let oversat: string[];
    try {
      oversat = await deps.oversaet(gruppe);
    } catch (e) {
      // Hele klumpen fejlede: behold dansk (allerede i `ud`), cache INTET -> et
      // genforsoeg proever klumpen igen (konvergens).
      console.error('[oversaet] kommentar-klump fejlede, beholder dansk:', e);
      continue;
    }

    const raekker: CacheRaekke[] = [];
    gruppe.forEach((t, j) => {
      const o = oversat[j] ?? t; // defensivt: manglende output -> dansk, ikke cachet
      if (oversat[j] == null) return;
      const kildeHash = deps.noegle(t);
      for (const i of tekstTilIndeks.get(t) ?? []) {
        ud[i] = o;
        raekker.push({ comment_id: komm[i].id, kilde_hash: kildeHash, oversat: o });
      }
    });

    try {
      await deps.skrivCache(raekker);
    } catch (e) {
      console.error('[oversaet] kunne ikke cache kommentarer:', e);
    }
  }

  return ud;
}
