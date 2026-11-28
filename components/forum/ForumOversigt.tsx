import Link from 'next/link';
import { relativTid } from '@/lib/i18n/format';
import ModelBadge from '@/components/forum/ModelBadge';
import type { ForumGruppe } from '@/lib/types';
import { ordbog, type UiSprog } from '@/lib/i18n';

// Kort undertekst pr. gruppe (Polestar har gruppe-overskrift + undertekst) -
// bor i ordbogen (forum.gruppeTekst), keyet på gruppens danske DB-navn.

function KategoriRaekke({
  slug,
  icon,
  modelId,
  name,
  description,
  traade,
  visninger,
  sidstAktiv,
  isLocked,
  ejere,
  sprog,
}: {
  slug: string;
  icon: string | null;
  modelId: string | null;
  name: string;
  description: string | null;
  traade: number;
  visninger: number;
  sidstAktiv: string | null;
  isLocked: boolean;
  ejere: number;
  sprog: UiSprog;
}) {
  const f = ordbog(sprog).forum;
  // Social proof paa model-fora: "N ejere" fra Min garage. Vises paa alle
  // skaerme (ogsaa mobil, hvor tal-kolonnerne er skjult), saa model-foraene
  // foeles levende selv uden traade. Skjult naar 0 ejere eller ikke-model.
  const visEjere = !!modelId && ejere > 0;
  return (
    <Link
      href={`/forum/${slug}`}
      className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-grafit-50"
    >
      {modelId ? (
        <ModelBadge slug={slug} size="md" />
      ) : (
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-grafit-100 text-lg"
          aria-hidden="true"
        >
          {icon ?? '💬'}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold text-grafit-900">{name}</span>
          {isLocked && (
            <span className="shrink-0 text-xs text-grafit-400" title={f.kunModeratorerOpretter}>
              🔒
            </span>
          )}
        </div>
        {description && (
          <p className="mt-0.5 line-clamp-1 text-sm text-grafit-500">{description}</p>
        )}
        {visEjere && (
          <div className="mt-1.5">
            <span className="chip bg-kobber-100 text-kobber-800">
              {f.ejere(ejere)}
            </span>
          </div>
        )}
      </div>

      {/* Tal: skjul på de mindste skærme, vis fra sm */}
      <div className="hidden shrink-0 items-center gap-6 text-right text-sm sm:flex">
        <div className="w-14">
          <div className="font-semibold tabular-nums text-grafit-800">{traade}</div>
          <div className="text-xs text-grafit-400">{f.traadeLabel(traade)}</div>
        </div>
        <div className="w-16">
          <div className="font-semibold tabular-nums text-grafit-800">{visninger}</div>
          <div className="text-xs text-grafit-400">{f.visningerLabel}</div>
        </div>
        <div className="w-24 text-grafit-500">
          {sidstAktiv ? relativTid(sidstAktiv, sprog) : '-'}
        </div>
      </div>

      {/* Kompakt tal på mobil */}
      <div className="shrink-0 text-right text-xs text-grafit-400 sm:hidden">
        <div className="font-semibold tabular-nums text-grafit-700">{traade}</div>
        <div>{sidstAktiv ? relativTid(sidstAktiv, sprog) : f.ny}</div>
      </div>
    </Link>
  );
}

// Grupperet kategori-oversigt (ren visning). Tråd-/indhold-søgning lever på
// /forum/soeg (P4); kategori-filter-boksen er fjernet 23-11 (forvekslet med
// søgefeltet - rum-listen er kort og grupperet i forvejen).
export default function ForumOversigt({
  grupper,
  sprog = 'da',
}: {
  grupper: ForumGruppe[];
  sprog?: UiSprog;
}) {
  const gruppeTekst = ordbog(sprog).forum.gruppeTekst;
  return (
    <div className="space-y-8">
      {grupper.map((g) => (
        <section key={g.label}>
          <div className="mb-2 px-1">
            <h2 className="font-display text-lg font-bold tracking-tight text-grafit-900">
              {g.label}
            </h2>
            {gruppeTekst[g.label] && (
              <p className="text-sm text-grafit-500">{gruppeTekst[g.label]}</p>
            )}
          </div>
          <div className="divide-y divide-grafit-100 overflow-hidden rounded-2xl border border-grafit-200 bg-white">
            {g.kategorier.map((k) => (
              <KategoriRaekke
                key={k.id}
                slug={k.slug}
                icon={k.icon}
                modelId={k.modelId}
                name={k.name}
                description={k.description}
                traade={k.traade}
                visninger={k.visninger}
                sidstAktiv={k.sidstAktiv}
                isLocked={k.isLocked}
                ejere={k.ejere}
                sprog={sprog}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
