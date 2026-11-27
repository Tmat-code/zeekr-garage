// Ren, testbar plan-logik for "Forbered oversættelse"-opvarmningen (trin 2.7).
// ---------------------------------------------------------------------------
// 2.6 gav kommentarerne holdbar DB-cache som meldingernes `oversaettelser`, men
// den FØRSTE hårde rapport efter et deploy maler stadig koldt én gang (nye/redigerede
// rækker + evt. kold LibreTranslate-model på Pixa) og kan ramme Cloudflares 524, før
// den konvergerer. Opvarmningen maler cachen for det valgte udvalg i BUNDNE klumper,
// ÉT HTTP-kald ad gangen, så hvert kald afsluttes godt under Cloudflares 100s og den
// rigtige eksport så er ren cache og aldrig rammer 524. Rækkefølge: først meldingerne
// (`oversaettelser`, altid ved ikke-dansk), derefter kommentarerne
// (`kommentar_oversaettelser`, kun når "Inkludér kommentarer" er slået til) - begge
// genbruger 2.6/tidligere cache-fill-sti (oversæt + cache, INGEN PDF).
//
// Denne fil er REN (ingen app-imports): den afgør KUN hvilket vindue der males næst
// ud fra (mTotal, kTotal, global offset), så klump-/progress-logikken kan assertes
// isoleret (bundet klump-størrelse, gjort/total, genoptag efter afbrud) uden DB eller
// netværk. Serveren (app/admin/rapport/actions.ts) oversætter selve vinduet og lader
// cachen bære konvergensen; klienten (RapportPanel) kalder igen med `gjort` som ny
// offset indtil `gjort >= total`.

export type OpvarmFase = 'meldinger' | 'kommentarer';

export type OpvarmSkridt =
  | { slut: true; gjort: number; total: number }
  | {
      slut: false;
      fase: OpvarmFase;
      start: number; // 0-baseret indeks INDEN FOR fasens egen liste
      antal: number; // vinduets størrelse (>= 1, <= batch)
      gjort: number; // global fremgang EFTER dette vindue er malet
      total: number; // mTotal + kTotal
    };

// Afgør næste opvarmnings-skridt ud fra den GLOBALE offset (antal poster malet indtil
// nu; meldinger tælles først, derefter kommentarer). mTotal/kTotal er antal meldinger/
// kommentarer i udvalget - 0 når den fase ikke skal varmes (fx dansk, ingen motor,
// eller kommentarer slået fra).
//
// Garantier (asserteres isoleret):
//  - Bundet klump: 1 <= antal <= batch for den aktive fase.
//  - Ingen fase-krydsning i ét skridt: et meldings-vindue holder sig inden for mTotal,
//    et kommentar-vindue inden for kTotal - så serveren kalder PRÆCIS én oversætter-
//    funktion pr. kald.
//  - Monoton fremgang: `gjort` vokser strengt pr. skridt og lander præcis på `total`.
//  - Genoptag: en vilkårlig offset (fx midt i kommentarerne efter et afbrudt forsøg)
//    mapper til det korrekte næste vindue - kombineret med den idempotente DB-cache
//    betyder det, at et genforsøg springer det allerede gjorte over.
export function naesteOpvarmSkridt(
  mTotal: number,
  kTotal: number,
  offset: number,
  batchMeldinger: number,
  batchKommentarer: number,
): OpvarmSkridt {
  const m = Math.max(0, Math.floor(mTotal));
  const k = Math.max(0, Math.floor(kTotal));
  const total = m + k;
  const bM = Math.max(1, Math.floor(batchMeldinger));
  const bK = Math.max(1, Math.floor(batchKommentarer));
  const o = Math.max(0, Math.floor(offset));

  if (o >= total) return { slut: true, gjort: total, total };

  if (o < m) {
    const antal = Math.min(bM, m - o);
    return { slut: false, fase: 'meldinger', start: o, antal, gjort: o + antal, total };
  }

  const ko = o - m;
  const antal = Math.min(bK, k - ko);
  return { slut: false, fase: 'kommentarer', start: ko, antal, gjort: m + ko + antal, total };
}
