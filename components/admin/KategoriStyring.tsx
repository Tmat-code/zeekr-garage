'use client';

import { useState, useTransition } from 'react';
import type { ForumGruppe, ForumKategoriStat, KategoriOversaettelser } from '@/lib/types';
import ModelBadge from '@/components/forum/ModelBadge';
import OversaettelsesFelter from '@/components/admin/OversaettelsesFelter';
import { INDHOLD_SPROG, OVERSAETTELSE_MAKS_KATEGORI, type Oversaettelser } from '@/lib/i18n/indhold';
import {
  opretKategori,
  retKategori,
  saetKategoriLaast,
  flytKategori,
  flytKategoriTilGruppe,
  flytGruppe,
  sletKategori,
  saetGruppeOversaettelser,
} from '@/app/admin/forum-actions';

// U7: kategoriens egne sv/en-felter (navn + beskrivelse). Gruppe-labelen
// oversættes ved gruppe-overskriften og gælder hele gruppen.
type KatOv = Oversaettelser<'name' | 'description'>;
type GruppeOv = Oversaettelser<'group_label'>;

function kunFelter<F extends string>(ov: KategoriOversaettelser, felter: readonly F[]): Oversaettelser<F> {
  const ud: Oversaettelser<F> = {};
  for (const s of INDHOLD_SPROG) {
    const obj: Partial<Record<F, string>> = {};
    for (const f of felter) {
      const v = (ov[s] as Record<string, string> | undefined)?.[f];
      if (v) obj[f] = v;
    }
    if (Object.keys(obj).length) ud[s] = obj;
  }
  return ud;
}

// Mangler der sv/en for et felt med dansk tekst? (markør i listen)
function manglerOversaettelse(dansk: Record<string, string | null>, ov: KategoriOversaettelser): boolean {
  return INDHOLD_SPROG.some((s) =>
    Object.entries(dansk).some(([f, d]) => !!d?.trim() && !(ov[s] as Record<string, string> | undefined)?.[f]?.trim()),
  );
}

function useKoer() {
  const [pending, start] = useTransition();
  const [fejl, setFejl] = useState<string | null>(null);
  const koer = (fn: () => Promise<void>) => {
    setFejl(null);
    start(async () => {
      try {
        await fn();
      } catch (e: any) {
        setFejl(e?.message ?? 'Noget gik galt.');
      }
    });
  };
  return { pending, fejl, koer, setFejl };
}

function KategoriRaekke({
  k,
  erForst,
  erSidst,
  flytMaal,
}: {
  k: ForumKategoriStat;
  erForst: boolean;
  erSidst: boolean;
  flytMaal: string[];
}) {
  const erModelForum = k.modelId != null;
  const { pending, fejl, koer } = useKoer();
  const [redigerer, setRedigerer] = useState(false);
  const [bekraeftSlet, setBekraeftSlet] = useState(false);
  const [navn, setNavn] = useState(k.name);
  const [ikon, setIkon] = useState(k.icon ?? '💬');
  const [beskrivelse, setBeskrivelse] = useState(k.description ?? '');
  const startOv = kunFelter(k.oversaettelser, ['name', 'description'] as const);
  const [ov, setOv] = useState<KatOv>(startOv);
  // Model-fora: navnet er modelnavnet (ens på alle sprog) - kun beskrivelsen tæller.
  const mangler = manglerOversaettelse(
    erModelForum ? { description: k.description } : { name: k.name, description: k.description },
    k.oversaettelser,
  );

  return (
    <div className={`rounded-xl border border-grafit-200 bg-white p-3 ${pending ? 'opacity-60' : ''}`}>
      {redigerer ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              className="input w-16 text-center"
              value={ikon}
              onChange={(e) => setIkon(e.target.value)}
              aria-label="Ikon"
              maxLength={4}
            />
            <input
              className="input flex-1"
              value={navn}
              onChange={(e) => setNavn(e.target.value)}
              placeholder="Navn"
            />
          </div>
          <textarea
            className="input min-h-[60px]"
            value={beskrivelse}
            onChange={(e) => setBeskrivelse(e.target.value)}
            placeholder="Beskrivelse"
          />
          <OversaettelsesFelter
            felter={[
              { felt: 'name', label: 'Navn', dansk: navn, maks: OVERSAETTELSE_MAKS_KATEGORI },
              {
                felt: 'description',
                label: 'Beskrivelse',
                dansk: beskrivelse,
                flerlinjet: true,
                maks: OVERSAETTELSE_MAKS_KATEGORI,
              },
            ]}
            vaerdi={ov}
            onChange={setOv}
          />
          <div className="flex gap-2">
            <button
              className="btn-primary !py-1.5 text-sm"
              disabled={pending || !navn.trim()}
              onClick={() =>
                koer(async () => {
                  await retKategori(k.id, {
                    name: navn,
                    icon: ikon,
                    description: beskrivelse,
                    oversaettelser: ov,
                  });
                  setRedigerer(false);
                })
              }
            >
              Gem
            </button>
            <button
              className="btn-ghost !py-1.5 text-sm"
              onClick={() => {
                setNavn(k.name);
                setIkon(k.icon ?? '💬');
                setBeskrivelse(k.description ?? '');
                setOv(startOv);
                setRedigerer(false);
              }}
            >
              Annullér
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
        <div className="flex items-center gap-3">
          {erModelForum ? (
            <ModelBadge slug={k.slug} size="sm" />
          ) : (
            <span className="text-lg" aria-hidden="true">{k.icon ?? '💬'}</span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-grafit-900">{k.name}</span>
              {k.isLocked && <span className="text-xs text-grafit-400" title="Låst">🔒</span>}
              <span className="shrink-0 text-xs text-grafit-400">{k.traade} tråde</span>
              {mangler && (
                <span className="shrink-0 text-xs font-medium text-kobber-700" title="Svensk eller engelsk mangler - den danske tekst vises">
                  🌐 mangler sv/en
                </span>
              )}
            </div>
            {k.description && <p className="truncate text-xs text-grafit-500">{k.description}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              className="rounded px-1.5 py-1 text-grafit-400 hover:bg-grafit-100 hover:text-grafit-700 disabled:opacity-30"
              disabled={pending || erForst}
              title="Flyt op"
              onClick={() => koer(() => flytKategori(k.id, 'op'))}
            >
              ↑
            </button>
            <button
              className="rounded px-1.5 py-1 text-grafit-400 hover:bg-grafit-100 hover:text-grafit-700 disabled:opacity-30"
              disabled={pending || erSidst}
              title="Flyt ned"
              onClick={() => koer(() => flytKategori(k.id, 'ned'))}
            >
              ↓
            </button>
            <button
              className="rounded px-2 py-1 text-xs text-grafit-500 hover:text-kobber-700"
              disabled={pending}
              onClick={() => koer(() => saetKategoriLaast(k.id, !k.isLocked))}
            >
              {k.isLocked ? 'Lås op' : 'Lås'}
            </button>
            <button
              className="rounded px-2 py-1 text-xs text-grafit-500 hover:text-kobber-700"
              onClick={() => setRedigerer(true)}
            >
              ✏️
            </button>
            {bekraeftSlet ? (
              <>
                <button
                  className="rounded bg-kobber-600 px-2 py-1 text-xs font-semibold text-white"
                  disabled={pending}
                  onClick={() => koer(() => sletKategori(k.id))}
                >
                  Slet?
                </button>
                <button className="px-1 text-xs text-grafit-400" onClick={() => setBekraeftSlet(false)}>
                  ✕
                </button>
              </>
            ) : (
              <button
                className="rounded px-2 py-1 text-xs text-grafit-400 hover:text-kobber-700"
                onClick={() => setBekraeftSlet(true)}
              >
                🗑
              </button>
            )}
          </div>
        </div>
        {erModelForum ? (
          <p className="pl-8 text-xs text-grafit-400">🚗 Model-forum - fast i Modellerne.</p>
        ) : flytMaal.length > 0 ? (
          <div className="flex items-center gap-2 pl-8">
            <label className="text-xs text-grafit-400" htmlFor={`flyt-${k.id}`}>
              Flyt til gruppe:
            </label>
            <select
              id={`flyt-${k.id}`}
              className="input !w-auto !py-1 text-sm"
              value=""
              disabled={pending}
              onChange={(e) => {
                const maal = e.target.value;
                if (maal) koer(() => flytKategoriTilGruppe(k.id, maal));
              }}
            >
              <option value="" disabled>
                Vælg gruppe …
              </option>
              {flytMaal.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        </div>
      )}
      {fejl && <p className="mt-2 text-xs text-kobber-700">{fejl}</p>}
    </div>
  );
}

function NyKategori({ grupper, fastGruppe }: { grupper?: ForumGruppe[]; fastGruppe?: string }) {
  const erFast = fastGruppe != null;
  const { pending, fejl, koer } = useKoer();
  const [aaben, setAaben] = useState(false);
  const [navn, setNavn] = useState('');
  const [gruppe, setGruppe] = useState('');
  const [ikon, setIkon] = useState('💬');
  const [beskrivelse, setBeskrivelse] = useState('');
  const [ov, setOv] = useState<KatOv>({});

  const aktivGruppe = erFast ? fastGruppe! : gruppe;

  if (!aaben) {
    return (
      <button
        className={erFast ? 'text-sm font-medium text-kobber-700 hover:underline' : 'btn-ghost text-sm'}
        onClick={() => setAaben(true)}
      >
        {erFast ? '+ Ny kategori' : '+ Ny gruppe'}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-grafit-300 bg-grafit-50 p-4">
      <div className="grid gap-2 sm:grid-cols-[4rem_1fr]">
        <input
          className="input text-center"
          value={ikon}
          onChange={(e) => setIkon(e.target.value)}
          aria-label="Ikon"
          maxLength={4}
        />
        <input
          className="input"
          value={navn}
          onChange={(e) => setNavn(e.target.value)}
          placeholder="Kategoriens navn"
        />
      </div>
      {erFast ? (
        <p className="mt-2 text-xs text-grafit-500">
          Lægges i gruppen <span className="font-medium text-grafit-700">{fastGruppe}</span>.
        </p>
      ) : (
        <div className="mt-2">
          <input
            className="input"
            value={gruppe}
            onChange={(e) => setGruppe(e.target.value)}
            placeholder="Navn på ny gruppe (fx Teknik)"
            list="forum-grupper"
          />
          <datalist id="forum-grupper">
            {(grupper ?? []).map((g) => (
              <option key={g.noegle} value={g.noegle} />
            ))}
          </datalist>
        </div>
      )}
      <textarea
        className="input mt-2 min-h-[60px]"
        value={beskrivelse}
        onChange={(e) => setBeskrivelse(e.target.value)}
        placeholder="Kort beskrivelse (valgfri)"
      />
      <div className="mt-2">
        <OversaettelsesFelter
          felter={[
            { felt: 'name', label: 'Navn', dansk: navn, maks: OVERSAETTELSE_MAKS_KATEGORI },
            {
              felt: 'description',
              label: 'Beskrivelse',
              dansk: beskrivelse,
              flerlinjet: true,
              maks: OVERSAETTELSE_MAKS_KATEGORI,
            },
          ]}
          vaerdi={ov}
          onChange={setOv}
        />
      </div>
      {!erFast && (
        <p className="mt-2 text-xs text-grafit-400">
          Gruppens svenske og engelske navn sætter du ved gruppe-overskriften, når den er oprettet.
        </p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <button
          className="btn-primary !py-1.5 text-sm"
          disabled={pending || !navn.trim() || !aktivGruppe.trim()}
          onClick={() =>
            koer(async () => {
              await opretKategori({
                name: navn,
                groupLabel: aktivGruppe,
                icon: ikon,
                description: beskrivelse,
                oversaettelser: ov,
              });
              setNavn('');
              setBeskrivelse('');
              setOv({});
              if (!erFast) setGruppe('');
              setAaben(false);
            })
          }
        >
          Opret
        </button>
        <button className="btn-ghost !py-1.5 text-sm" onClick={() => setAaben(false)}>
          Annullér
        </button>
        {fejl && <span className="text-sm text-kobber-700">{fejl}</span>}
      </div>
    </div>
  );
}

function GruppeBlok({
  g,
  flytMaal,
  erForstGruppe,
  erSidstGruppe,
  erModelGruppe,
}: {
  g: ForumGruppe;
  flytMaal: string[];
  erForstGruppe: boolean;
  erSidstGruppe: boolean;
  erModelGruppe: boolean;
}) {
  const { pending, fejl, koer } = useKoer();
  // U7: gruppens sv/en-label (DB'en holder den ens på alle gruppens rækker;
  // vis den første der har en).
  const startOv: GruppeOv = {};
  for (const s of INDHOLD_SPROG) {
    const v = g.kategorier.map((k) => k.oversaettelser[s]?.group_label).find((x) => x?.trim());
    if (v) startOv[s] = { group_label: v };
  }
  const [ov, setOv] = useState<GruppeOv>(startOv);
  const [gemtOv, setGemtOv] = useState(JSON.stringify(startOv));
  const [ovGemt, setOvGemt] = useState(false);
  const ovAendret = JSON.stringify(ov) !== gemtOv;
  return (
    <div>
      <div className="mb-2 flex items-center gap-1">
        <h3 className="flex-1 text-sm font-semibold uppercase tracking-wide text-grafit-400">
          {g.label}
        </h3>
        <button
          className="rounded px-1.5 py-1 text-grafit-400 hover:bg-grafit-100 hover:text-grafit-700 disabled:opacity-30"
          disabled={pending || erForstGruppe}
          title="Flyt gruppen op"
          onClick={() => koer(() => flytGruppe(g.noegle, 'op'))}
        >
          ↑
        </button>
        <button
          className="rounded px-1.5 py-1 text-grafit-400 hover:bg-grafit-100 hover:text-grafit-700 disabled:opacity-30"
          disabled={pending || erSidstGruppe}
          title="Flyt gruppen ned"
          onClick={() => koer(() => flytGruppe(g.noegle, 'ned'))}
        >
          ↓
        </button>
      </div>
      <div className="mb-2 flex flex-wrap items-start gap-2">
        <div className="min-w-[14rem] flex-1">
          <OversaettelsesFelter
            felter={[{ felt: 'group_label', label: 'Gruppe', dansk: g.noegle, maks: OVERSAETTELSE_MAKS_KATEGORI }]}
            vaerdi={ov}
            onChange={(v) => {
              setOv(v);
              setOvGemt(false);
            }}
          />
        </div>
        {ovAendret && (
          <button
            className="btn-primary !py-1.5 text-sm"
            disabled={pending}
            onClick={() =>
              koer(async () => {
                await saetGruppeOversaettelser(g.noegle, ov);
                setGemtOv(JSON.stringify(ov));
                setOvGemt(true);
              })
            }
          >
            Gem gruppe-navn
          </button>
        )}
        {ovGemt && !ovAendret && !fejl && <span className="self-center text-xs text-loest">Gemt.</span>}
      </div>
      {fejl && <p className="mb-2 text-xs text-kobber-700">{fejl}</p>}
      <div className="space-y-2">
        {g.kategorier.map((k, i) => (
          <KategoriRaekke
            key={k.id}
            k={k}
            erForst={i === 0}
            erSidst={i === g.kategorier.length - 1}
            flytMaal={flytMaal}
          />
        ))}
      </div>
      <div className="mt-2">
        {erModelGruppe ? (
          <p className="text-xs text-grafit-400">
            Model-fora tilføjes ikke her - de er koblet til en bil-model.
          </p>
        ) : (
          <NyKategori fastGruppe={g.noegle} />
        )}
      </div>
    </div>
  );
}

export default function KategoriStyring({ grupper }: { grupper: ForumGruppe[] }) {
  // Grupper der rummer model-fora ("Modellerne") - rygraden, holdes adskilt:
  // man kan ikke flytte en kategori ind i dem.
  const modelGrupper = new Set(
    grupper.filter((g) => g.kategorier.some((k) => k.modelId != null)).map((g) => g.noegle),
  );

  return (
    <div className="space-y-6">
      {grupper.map((g, i) => (
        <GruppeBlok
          key={g.noegle}
          g={g}
          erForstGruppe={i === 0}
          erSidstGruppe={i === grupper.length - 1}
          erModelGruppe={modelGrupper.has(g.noegle)}
          flytMaal={grupper
            .map((x) => x.noegle)
            .filter((l) => l !== g.noegle && !modelGrupper.has(l))}
        />
      ))}
      <div className="border-t border-grafit-200 pt-4">
        <NyKategori grupper={grupper} />
      </div>
    </div>
  );
}
