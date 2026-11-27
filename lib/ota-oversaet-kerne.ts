// U1b: ren, testbar kerne for maskinoversættelse af OTA-noter (changelog-punkter +
// note) på /software. Ingen app-imports: DB-cache, motor og hash injiceres
// (lib/ota-oversaet.ts wirer dem). Samme mønster som rapport-kommentar-cache.ts.
//
// Princip: den danske original er ALTID record. En oversættelse vises kun når den
// er komplet (ét output pr. punkt + note); ellers vises originalen, og intet caches,
// så næste visning prøver igen.

export type OtaKilde = { id: string; punkter: string[]; note: string | null };
export type OtaOversat = { punkter: string[]; note: string | null };
export type OtaCacheRaekke = {
  update_id: string;
  kilde_hash: string;
  punkter: unknown; // jsonb-array fra DB - valideres her
  note: string | null;
};
export type OtaCacheSkriv = { update_id: string; kilde_hash: string; punkter: string[]; note: string | null };

export type OtaDeps = {
  noegle: (kildeTekst: string) => string; // hash inkl. motor-id
  hentCache: (ids: string[]) => Promise<OtaCacheRaekke[]>;
  skrivCache: (raekker: OtaCacheSkriv[]) => Promise<void>;
  oversaet: (tekster: string[]) => Promise<string[]>;
  maksNye?: number; // højst så mange opslag oversættes pr. kald (resten: original)
};

// Kanonisk kilde-tekst til hashing: punkterne + noten, entydigt adskilt.
export function otaKildeTekst(k: OtaKilde): string {
  return `${k.punkter.join('\n')}\n\u0000note\u0000\n${k.note ?? ''}`;
}

// Rensningen sætter punktum efter en linje uden tegnsætning (MT læner sig på
// sætningsgrænser). Et changelog-punkt UDEN afsluttende punktum i originalen skal
// heller ikke have det i oversættelsen - ellers ser listen anderledes ud end den
// danske. Ellipse ("...") røres ikke.
export function spejlSlut(kilde: string, oversat: string): string {
  const k = kilde.trim();
  let o = oversat.trim();
  if (!/[.!?:;…]$/.test(k) && /[^.]\.$/.test(o)) o = o.slice(0, -1).trimEnd();
  return o;
}

function erStrengListe(v: unknown, laengde: number): v is string[] {
  return Array.isArray(v) && v.length === laengde && v.every((x) => typeof x === 'string');
}

export async function oversaetOtaKerne(kilder: OtaKilde[], deps: OtaDeps): Promise<Map<string, OtaOversat>> {
  const ud = new Map<string, OtaOversat>();
  const medIndhold = kilder.filter((k) => k.punkter.length > 0 || (k.note ?? '').trim());
  if (medIndhold.length === 0) return ud;

  const hashes = new Map(medIndhold.map((k) => [k.id, deps.noegle(otaKildeTekst(k))]));

  // 1) Cache (fejl i opslaget = alt er miss; aldrig crash).
  let cache: OtaCacheRaekke[] = [];
  try {
    cache = await deps.hentCache(medIndhold.map((k) => k.id));
  } catch {
    cache = [];
  }
  const cacheMap = new Map(cache.map((r) => [r.update_id, r]));

  const mangler: OtaKilde[] = [];
  for (const k of medIndhold) {
    const c = cacheMap.get(k.id);
    if (c && c.kilde_hash === hashes.get(k.id) && erStrengListe(c.punkter, k.punkter.length)) {
      ud.set(k.id, { punkter: c.punkter, note: k.note ? c.note ?? k.note : null });
    } else {
      mangler.push(k);
    }
  }
  if (mangler.length === 0) return ud;

  // 2) Oversæt de manglende (højst maksNye) i ÉT kald: alle punkter + noter fladt.
  const udvalg = mangler.slice(0, deps.maksNye ?? 8);
  const flade: string[] = [];
  const spaend: { start: number; punkter: number; harNote: boolean }[] = [];
  for (const k of udvalg) {
    const harNote = !!(k.note ?? '').trim();
    spaend.push({ start: flade.length, punkter: k.punkter.length, harNote });
    flade.push(...k.punkter);
    if (harNote) flade.push(k.note as string);
  }

  let raa: string[];
  try {
    raa = await deps.oversaet(flade);
  } catch {
    return ud; // motoren nede -> originalen vises, intet caches
  }

  const skriv: OtaCacheSkriv[] = [];
  udvalg.forEach((k, i) => {
    const { start, punkter, harNote } = spaend[i];
    const del = raa.slice(start, start + punkter + (harNote ? 1 : 0));
    const kildeDel = flade.slice(start, start + punkter + (harNote ? 1 : 0));
    // Komplet? Hvert output skal findes og være ikke-tomt.
    if (del.length !== kildeDel.length || del.some((o) => typeof o !== 'string' || !o.trim())) return;
    const ov = del.map((o, j) => spejlSlut(kildeDel[j], o));
    const res: OtaOversat = { punkter: ov.slice(0, punkter), note: harNote ? ov[punkter] : null };
    ud.set(k.id, res);
    skriv.push({ update_id: k.id, kilde_hash: hashes.get(k.id) as string, punkter: res.punkter, note: res.note });
  });

  if (skriv.length > 0) {
    try {
      await deps.skrivCache(skriv);
    } catch {
      /* cache er best-effort */
    }
  }
  return ud;
}
