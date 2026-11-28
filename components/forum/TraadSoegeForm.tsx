// Tvaergaaende traad-soegning: en ren GET-form -> /forum/soeg?q=...&kat=...
// Server-renderbar (ingen state), virker uden JS, og URL'en er delbar/bogmaerkbar
// - i tråd med resten af sitets SSR-linje.
//
// Tre former, styret af props:
//  - kategorier givet  -> scope-dropdown (Alle fora + hvert rum), valgt = scopeSlug.
//  - scopeSlug uden liste -> skjult kat-felt (rum-søgning inde i ét forum).
//  - ingen af delene   -> ren søgning i alt.
import type { ForumKategori } from '@/lib/types';
import { modelBadge } from '@/lib/model-badge';
import { ordbog, type UiSprog } from '@/lib/i18n';

export default function TraadSoegeForm({
  defaultValue = '',
  stor = false,
  kategorier,
  scopeSlug = '',
  scopeNavn,
  sprog = 'da',
}: {
  defaultValue?: string;
  stor?: boolean;
  kategorier?: ForumKategori[];
  scopeSlug?: string;
  scopeNavn?: string;
  // U2: UI-sproget fra siden (server-komponent - ingen hooks/async her).
  sprog?: UiSprog;
}) {
  const f = ordbog(sprog).forum;
  // Grupper kategorierne til <optgroup> (bevarer rækkefølgen fra listen).
  const grupper: { label: string; kats: ForumKategori[] }[] = [];
  if (kategorier) {
    const idx = new Map<string, number>();
    for (const k of kategorier) {
      // U7: grupperet på den danske nøgle, vist med label på læserens sprog.
      if (!idx.has(k.groupKey)) {
        idx.set(k.groupKey, grupper.length);
        grupper.push({ label: k.groupLabel, kats: [] });
      }
      grupper[idx.get(k.groupKey)!].kats.push(k);
    }
  }

  const placeholder = scopeNavn ? f.soegIPh(scopeNavn) : f.soegAllePh;

  return (
    <form action="/forum/soeg" method="get" role="search" className="flex flex-wrap gap-2">
      <div className="relative min-w-[12rem] flex-1">
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-grafit-400"
          aria-hidden="true"
        >
          🔎
        </span>
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder={placeholder}
          aria-label={scopeNavn ? f.soegIAria(scopeNavn) : f.soegAlleAria}
          className={`input pl-9 ${stor ? 'py-3 text-base' : ''}`}
        />
      </div>

      {kategorier ? (
        // Scope-vælger: Alle fora + hvert rum.
        <select
          name="kat"
          defaultValue={scopeSlug}
          aria-label={f.afgraensAria}
          className="input w-auto shrink-0"
        >
          <option value="">{f.alleFora}</option>
          {grupper.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.kats.map((k) => (
                <option key={k.slug} value={k.slug}>
                  {k.modelId ? `${modelBadge(k.slug)} · ${k.name}` : k.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      ) : (
        // Rum-søgning: scopet til ét forum via skjult felt.
        scopeSlug && <input type="hidden" name="kat" value={scopeSlug} />
      )}

      <button type="submit" className="btn-primary shrink-0">
        {f.soeg}
      </button>
    </form>
  );
}
