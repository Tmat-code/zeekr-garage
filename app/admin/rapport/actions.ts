'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { erAdmin, erModerator } from '@/lib/admin';
import { erGyldigRapportType, erGyldigtSprog, MAALSPROG } from '@/lib/rapport-i18n';
import {
  oversaetDiagnose,
  oversaetFejl,
  oversaetKommentarer,
  oversaetterKonfigureret,
  type OversaetStatus,
} from '@/lib/oversaet';
import { getRapportFejl, getRapportKommentarRaa } from '@/lib/rapport';
import { naesteOpvarmSkridt } from '@/lib/rapport-opvarmning';

export async function danRapport(
  type: string,
  kunAendrede: boolean,
  top: string,
): Promise<number> {
  if (!(await erAdmin())) throw new Error('Kun admin kan danne rapporten.');
  const antal = top === 'alle' ? 1_000_000 : Math.min(Math.max(Number(top) || 20, 1), 200);
  const sb = supabaseServer();
  const { data, error } = await sb.rpc('dan_rapport_markering', {
    p_type: erGyldigRapportType(type),
    p_kun_aendrede: kunAendrede,
    p_antal: antal,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/rapport');
  revalidatePath('/');
  return Number(data ?? 0);
}

export async function fortrydMarkering(): Promise<number> {
  if (!(await erAdmin())) throw new Error('Kun admin.');
  const sb = supabaseServer();
  const { data, error } = await sb.rpc('fortryd_markering');
  if (error) throw new Error(error.message);
  revalidatePath('/admin/rapport');
  revalidatePath('/');
  return Number(data ?? 0);
}

export async function testOversaettelse(): Promise<OversaetStatus> {
  if (!(await erModerator())) throw new Error('Kun moderator/admin.');
  return oversaetDiagnose();
}

// Bundne klump-størrelser pr. HTTP-kald. Holdt små, så HVERT opvarmnings-kald
// afsluttes godt under Cloudflares 100s: den interne klump i oversaetFejl og
// oversaetKommentarerKerne er 5, så 10 = højst 2 interne klumper pr. kald. Det første
// kald betaler en evt. kold-model-opvarmning på Pixa; resten er cache-/varme-hurtige.
const OPVARM_KLUMP_MELDINGER = 10;
const OPVARM_KLUMP_KOMMENTARER = 10;

// Trin 2.7: "Forbered oversættelse". Varmer oversættelses-cachen for DET VALGTE udvalg
// (samme type/antal/kunAendrede/sprog som eksporten) i bundne klumper, ét kald ad
// gangen, så den rigtige eksport er ren cache og aldrig rammer Cloudflares 524.
// Genbruger cache-fill-stien (oversæt + cache, INGEN PDF): meldinger først (altid ved
// ikke-dansk), derefter kommentarer (kun når medKommentarer er slået til). Moderator-
// gated som resten af eksport-panelet. Returnerer global {gjort, total}; klienten
// kalder igen med `gjort` som ny offset indtil gjort >= total. Genoptag efter afbrud
// er gratis: den idempotente DB-cache gør et allerede-malet vindue til rene cache-hits.
export async function forberedOversaettelse(
  type: string,
  kunAendrede: boolean,
  top: string,
  sprog: string,
  offset: number,
  medKommentarer: boolean,
): Promise<{ gjort: number; total: number }> {
  if (!(await erModerator())) throw new Error('Kun moderator/admin.');

  const maalSprog = erGyldigtSprog(sprog);
  // Dansk = originalteksten (intet at oversætte); ingen motor = rapporten kan kun
  // være dansk. Begge veje: intet at forberede.
  if (!MAALSPROG[maalSprog] || !oversaetterKonfigureret()) return { gjort: 0, total: 0 };

  const rapportType = erGyldigRapportType(type);
  // Supersæt af begge eksport-ruters loft (PDF 100, CSV/dan_rapport 200) -> cap 200,
  // så opvarmningen dækker, uanset hvilken eksport Torben senere henter.
  const antal = top === 'alle' ? 1_000_000 : Math.min(Math.max(Number(top) || 20, 1), 200);

  // Samme meldings-udvalg som eksporten (begge ruter: getRapportFejl -> oversaetFejl).
  const fejl = await getRapportFejl(rapportType, kunAendrede, antal);
  const mTotal = fejl.length;

  // Kommentar-udvalget tælles kun med, når toggle er slået til - ellers tager
  // eksporten dem ikke med, og så skal de ikke varmes. Hentes rå (uoversat) så
  // opvarmningen selv skærer dem i vinduer.
  const komm = medKommentarer ? await getRapportKommentarRaa(fejl.map((f) => f.id)) : [];
  const kTotal = komm.length;

  const skridt = naesteOpvarmSkridt(
    mTotal,
    kTotal,
    offset,
    OPVARM_KLUMP_MELDINGER,
    OPVARM_KLUMP_KOMMENTARER,
  );
  if (skridt.slut) return { gjort: skridt.gjort, total: skridt.total };

  if (skridt.fase === 'meldinger') {
    // oversaetFejl cache-tjekker selv og oversætter + cacher kun de manglende i
    // vinduet (intern klump 5). Et varmt vindue = rene cache-hits (hurtigt).
    await oversaetFejl(fejl.slice(skridt.start, skridt.start + skridt.antal), maalSprog);
  } else {
    // oversaetKommentarer wirer 2.6-kernen mod `kommentar_oversaettelser`; hver klump
    // caches straks, så et timeout midt i et vindue stadig efterlader fremgang i DB'en.
    await oversaetKommentarer(komm.slice(skridt.start, skridt.start + skridt.antal), maalSprog);
  }

  return { gjort: skridt.gjort, total: skridt.total };
}
