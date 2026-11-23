// P9 - oprydning af forældreløse storage-filer.
// -----------------------------------------------------------------------------
// "Forældreløs" = et objekt i en billed-bucket (forum/meld) UDEN en levende
// reference i koblings-tabellen (forum_post_images / issue_images). De opstår
// især når man uploader i compose/editor og så fortryder (filen ligger i egen
// mappe, men ingen række peger på den), eller hvis en best-effort fil-sletning
// (P8-edit, meld-sletning) fejlede.
//
// VIGTIGT (lært i P8): selvhostede storage-filer slettes via storage-API'et
// (sb.storage.from(bucket).remove(paths)), IKKE via et SQL-delete på
// storage.objects (det fjerner ikke selve filen). Derfor lister + sletter vi
// via storage-API'et her - ingen SQL/migration.
//
// Soft-removed forum-indhold (is_removed=true) BEHOLDER sine forum_post_images-
// rækker, så dets filer tæller som "refererede" og røres IKKE af sweep'et -
// bevidst, så et evt. gendannet indlæg ikke får brudte billeder.

import type { SupabaseClient } from '@supabase/supabase-js';
import { FORUM_BUCKET, MELD_BUCKET, BESKED_BUCKET } from '@/lib/billeder';

// Bred nok til både den cookie-baserede server-klient (@supabase/ssr) OG
// service-rolle-klienten (@supabase/supabase-js) - besked-sweep'et kører med
// service-rollen, fordi 'besked' er en privat bucket uden læse-policy.
type SB = SupabaseClient<any, any, any>;

// Spar meget nye objekter: en åben compose/editor-upload er en "forældreløs"
// fil indtil indlægget gemmes. 24 timer er rigeligt til at dække en normal
// skrive-session, så vi aldrig rydder en upload der er på vej til at blive koblet.
export const MIN_ALDER_TIMER = 24;
const MIN_ALDER_MS = MIN_ALDER_TIMER * 60 * 60 * 1000;

const SIDE = 1000; // storage-list + path-fetch pagineres i sider af denne størrelse.

type Objekt = { path: string; createdAt: string | null };

// List én "mappe" (prefix) i en bucket. Supabase returnerer under-mapper som
// entries med id === null; rigtige filer har et id.
async function listPrefix(
  sb: SB,
  bucket: string,
  prefix: string,
): Promise<{ filer: Objekt[]; mapper: string[] }> {
  const filer: Objekt[] = [];
  const mapper: string[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await sb.storage.from(bucket).list(prefix || undefined, {
      limit: SIDE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    for (const e of batch) {
      const fuld = prefix ? `${prefix}/${e.name}` : e.name;
      const erMappe = (e as any).id === null || (e as any).id === undefined;
      if (erMappe) mapper.push(fuld);
      else filer.push({ path: fuld, createdAt: ((e as any).created_at as string) ?? null });
    }
    if (batch.length < SIDE) break;
    offset += SIDE;
  }
  return { filer, mapper };
}

// Alle objekter i en bucket (går rekursivt gennem <user_id>/-mapperne).
async function alleObjekter(sb: SB, bucket: string): Promise<Objekt[]> {
  const resultat: Objekt[] = [];
  const set = new Set<string>();
  const besoegt = new Set<string>();
  const koe: string[] = ['']; // start ved roden
  let vagt = 0;
  while (koe.length) {
    if (++vagt > 20000) break; // sikkerhedsgrænse mod patologisk dyb nesting
    const prefix = koe.shift() as string;
    if (besoegt.has(prefix)) continue;
    besoegt.add(prefix);
    const { filer, mapper } = await listPrefix(sb, bucket, prefix);
    for (const f of filer) {
      if (!set.has(f.path)) {
        set.add(f.path);
        resultat.push(f);
      }
    }
    for (const m of mapper) if (!besoegt.has(m)) koe.push(m);
  }
  return resultat;
}

// Alle refererede paths fra en koblings-tabel (ALLE rækker, også is_removed-
// indholdets - de skal netop bevares).
async function refereredePaths(sb: SB, tabel: string): Promise<Set<string>> {
  const set = new Set<string>();
  let fra = 0;
  for (;;) {
    const { data, error } = await sb.from(tabel).select('path').range(fra, fra + SIDE - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    for (const r of batch) {
      const p = (r as any).path;
      if (typeof p === 'string') set.add(p);
    }
    if (batch.length < SIDE) break;
    fra += SIDE;
  }
  return set;
}

export type ForaeldreloeseResultat = {
  bucket: string;
  objekter: number; // antal objekter fundet i bucketen
  refererede: number; // antal refererede paths
  foraeldreloese: string[]; // paths uden reference OG ældre end MIN_ALDER
};

// Find forældreløse filer i én bucket (ren læsning - sletter intet).
export async function findForaeldreloese(
  sb: SB,
  bucket: string,
  tabel: string,
): Promise<ForaeldreloeseResultat> {
  const objekter = await alleObjekter(sb, bucket);
  const ref = await refereredePaths(sb, tabel);
  const graense = Date.now() - MIN_ALDER_MS;
  const foraeldreloese = objekter
    .filter((o) => !ref.has(o.path))
    .filter((o) => {
      if (!o.createdAt) return false; // ukendt alder -> behold (konservativt)
      const t = new Date(o.createdAt).getTime();
      return !Number.isNaN(t) && t < graense;
    })
    .map((o) => o.path);
  return { bucket, objekter: objekter.length, refererede: ref.size, foraeldreloese };
}

// Slet paths via storage-API'et i batches. Returnerer antal faktisk fjernede.
export async function fjernFiler(sb: SB, bucket: string, paths: string[]): Promise<number> {
  let n = 0;
  for (let i = 0; i < paths.length; i += 100) {
    const del = paths.slice(i, i + 100);
    const { data, error } = await sb.storage.from(bucket).remove(del);
    if (error) throw new Error(error.message);
    n += (data ?? []).length;
  }
  return n;
}

// De to OFFENTLIGE billed-spor, så actions kan løbe begge i ét kald med den
// almindelige (cookie-baserede) klient.
export const BILLED_SPOR: { bucket: string; tabel: string }[] = [
  { bucket: FORUM_BUCKET, tabel: 'forum_post_images' },
  { bucket: MELD_BUCKET, tabel: 'issue_images' },
];

// Det PRIVATE besked-spor (P10). Køres separat MED SERVICE-ROLLEN, fordi
// 'besked'-bucketen ikke har nogen læse-policy (ingen - heller ikke moderator -
// kan liste den via egen session). Holdt ude af BILLED_SPOR netop derfor.
export const BESKED_SPOR = { bucket: BESKED_BUCKET, tabel: 'message_images' };
