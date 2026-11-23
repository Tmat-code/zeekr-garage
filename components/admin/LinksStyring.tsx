'use client';

import { useState, useTransition } from 'react';
import type { LinkGruppe, LinkPost } from '@/lib/types';
import {
  opretLinkGruppe,
  redigerLinkGruppe,
  sletLinkGruppe,
  flytLinkGruppe,
  opretLink,
  redigerLink,
  sletLink,
  flytLink,
  flytLinkTilGruppe,
} from '@/app/admin/links-actions';

type ModelOpt = { id: string; slug: string; name: string };

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
  return { pending, fejl, koer };
}

function kort(navn: string): string {
  return navn.replace(/^Zeekr\s+/i, '');
}

// Multi-vælger: klik en model til/fra. Ingen valgt = "gælder alle".
function ModelVaelger({
  modeller,
  valgte,
  setValgte,
}: {
  modeller: ModelOpt[];
  valgte: string[];
  setValgte: (v: string[]) => void;
}) {
  const toggle = (id: string) =>
    setValgte(valgte.includes(id) ? valgte.filter((x) => x !== id) : [...valgte, id]);
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {modeller.map((m) => {
          const aktiv = valgte.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m.id)}
              className={
                aktiv
                  ? 'rounded-full bg-kobber-600 px-2.5 py-1 text-xs font-medium text-white'
                  : 'rounded-full border border-grafit-200 bg-white px-2.5 py-1 text-xs text-grafit-600 hover:border-grafit-300'
              }
            >
              {kort(m.name)}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-xs text-grafit-400">
        {valgte.length === 0 ? 'Ingen valgt = gælder alle modeller' : `${valgte.length} valgt`}
      </p>
    </div>
  );
}

function idFraSlugs(l: LinkPost, modeller: ModelOpt[]): string[] {
  return l.modeller
    .map((m) => modeller.find((x) => x.slug === m.slug)?.id)
    .filter((x): x is string => !!x);
}

function LinkRaekke({
  l,
  erForst,
  erSidst,
  modeller,
  andreGrupper,
}: {
  l: LinkPost;
  erForst: boolean;
  erSidst: boolean;
  modeller: ModelOpt[];
  andreGrupper: { id: string; titel: string }[];
}) {
  const { pending, fejl, koer } = useKoer();
  const [redigerer, setRedigerer] = useState(false);
  const [bekraeftSlet, setBekraeftSlet] = useState(false);
  const [navn, setNavn] = useState(l.navn);
  const [kilde, setKilde] = useState(l.kilde ?? '');
  const [url, setUrl] = useState(l.url);
  const [valgte, setValgte] = useState<string[]>(idFraSlugs(l, modeller));

  if (redigerer) {
    return (
      <div className={`rounded-xl border border-grafit-200 bg-white p-3 ${pending ? 'opacity-60' : ''}`}>
        <div className="space-y-2">
          <input className="input" value={navn} onChange={(e) => setNavn(e.target.value)} placeholder="Navn" />
          <input className="input" value={kilde} onChange={(e) => setKilde(e.target.value)} placeholder="Kilde (fx zeekr.eu)" />
          <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          <ModelVaelger modeller={modeller} valgte={valgte} setValgte={setValgte} />
          <div className="flex gap-2">
            <button
              className="btn-primary !py-1.5 text-sm"
              disabled={pending || !navn.trim() || !url.trim()}
              onClick={() =>
                koer(async () => {
                  await redigerLink(l.id, { navn, kilde, url, modelIds: valgte });
                  setRedigerer(false);
                })
              }
            >
              Gem
            </button>
            <button
              className="btn-ghost !py-1.5 text-sm"
              onClick={() => {
                setNavn(l.navn);
                setKilde(l.kilde ?? '');
                setUrl(l.url);
                setValgte(idFraSlugs(l, modeller));
                setRedigerer(false);
              }}
            >
              Annullér
            </button>
          </div>
          {fejl && <p className="text-xs text-kobber-700">{fejl}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-grafit-200 bg-white p-3 ${pending ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium text-grafit-900">{l.navn}</span>
            {l.modeller.map((m) => (
              <span
                key={m.slug}
                className="shrink-0 rounded-full bg-kobber-100 px-2 py-0.5 text-xs font-medium text-kobber-800"
              >
                {kort(m.name)}
              </span>
            ))}
          </div>
          <div className="truncate text-xs text-grafit-400">
            {l.kilde ? `${l.kilde} · ` : ''}
            {l.url}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            className="rounded px-1.5 py-1 text-grafit-400 hover:bg-grafit-100 hover:text-grafit-700 disabled:opacity-30"
            disabled={pending || erForst}
            title="Flyt op"
            onClick={() => koer(() => flytLink(l.id, true))}
          >
            ↑
          </button>
          <button
            className="rounded px-1.5 py-1 text-grafit-400 hover:bg-grafit-100 hover:text-grafit-700 disabled:opacity-30"
            disabled={pending || erSidst}
            title="Flyt ned"
            onClick={() => koer(() => flytLink(l.id, false))}
          >
            ↓
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
                onClick={() => koer(() => sletLink(l.id))}
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
      {andreGrupper.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <label className="text-xs text-grafit-400" htmlFor={`flyt-${l.id}`}>
            Flyt til gruppe:
          </label>
          <select
            id={`flyt-${l.id}`}
            className="input !w-auto !py-1 text-sm"
            value=""
            disabled={pending}
            onChange={(e) => {
              const maal = e.target.value;
              if (maal) koer(() => flytLinkTilGruppe(l.id, maal));
            }}
          >
            <option value="" disabled>
              Vælg gruppe …
            </option>
            {andreGrupper.map((g) => (
              <option key={g.id} value={g.id}>
                {g.titel}
              </option>
            ))}
          </select>
        </div>
      )}
      {fejl && <p className="mt-2 text-xs text-kobber-700">{fejl}</p>}
    </div>
  );
}

function NytLink({ groupId, modeller }: { groupId: string; modeller: ModelOpt[] }) {
  const { pending, fejl, koer } = useKoer();
  const [aaben, setAaben] = useState(false);
  const [navn, setNavn] = useState('');
  const [kilde, setKilde] = useState('');
  const [url, setUrl] = useState('');
  const [valgte, setValgte] = useState<string[]>([]);

  if (!aaben) {
    return (
      <button className="text-sm font-medium text-kobber-700 hover:underline" onClick={() => setAaben(true)}>
        + Nyt link
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-grafit-300 bg-grafit-50 p-4">
      <div className="space-y-2">
        <input className="input" value={navn} onChange={(e) => setNavn(e.target.value)} placeholder="Navn (fx Officiel modelside)" />
        <input className="input" value={kilde} onChange={(e) => setKilde(e.target.value)} placeholder="Kilde (fx zeekr.eu)" />
        <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        <ModelVaelger modeller={modeller} valgte={valgte} setValgte={setValgte} />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          className="btn-primary !py-1.5 text-sm"
          disabled={pending || !navn.trim() || !url.trim()}
          onClick={() =>
            koer(async () => {
              await opretLink({ groupId, navn, kilde, url, modelIds: valgte });
              setNavn('');
              setKilde('');
              setUrl('');
              setValgte([]);
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
  modeller,
  andreGrupper,
  erForstGruppe,
  erSidstGruppe,
}: {
  g: LinkGruppe;
  modeller: ModelOpt[];
  andreGrupper: { id: string; titel: string }[];
  erForstGruppe: boolean;
  erSidstGruppe: boolean;
}) {
  const { pending, fejl, koer } = useKoer();
  const [redigerer, setRedigerer] = useState(false);
  const [bekraeftSlet, setBekraeftSlet] = useState(false);
  const [titel, setTitel] = useState(g.titel);
  const tom = g.links.length === 0;

  return (
    <div>
      <div className="mb-2 flex items-center gap-1">
        {redigerer ? (
          <div className="flex flex-1 items-center gap-2">
            <input className="input flex-1" value={titel} onChange={(e) => setTitel(e.target.value)} />
            <button
              className="btn-primary !py-1 text-xs"
              disabled={pending || !titel.trim()}
              onClick={() =>
                koer(async () => {
                  await redigerLinkGruppe(g.id, titel);
                  setRedigerer(false);
                })
              }
            >
              Gem
            </button>
            <button
              className="btn-ghost !py-1 text-xs"
              onClick={() => {
                setTitel(g.titel);
                setRedigerer(false);
              }}
            >
              Annullér
            </button>
          </div>
        ) : (
          <>
            <h3 className="flex-1 text-sm font-semibold uppercase tracking-wide text-grafit-400">
              {g.titel}
            </h3>
            <button
              className="rounded px-2 py-1 text-xs text-grafit-500 hover:text-kobber-700"
              onClick={() => setRedigerer(true)}
            >
              ✏️
            </button>
            <button
              className="rounded px-1.5 py-1 text-grafit-400 hover:bg-grafit-100 hover:text-grafit-700 disabled:opacity-30"
              disabled={pending || erForstGruppe}
              title="Flyt gruppen op"
              onClick={() => koer(() => flytLinkGruppe(g.id, true))}
            >
              ↑
            </button>
            <button
              className="rounded px-1.5 py-1 text-grafit-400 hover:bg-grafit-100 hover:text-grafit-700 disabled:opacity-30"
              disabled={pending || erSidstGruppe}
              title="Flyt gruppen ned"
              onClick={() => koer(() => flytLinkGruppe(g.id, false))}
            >
              ↓
            </button>
            {tom &&
              (bekraeftSlet ? (
                <>
                  <button
                    className="rounded bg-kobber-600 px-2 py-1 text-xs font-semibold text-white"
                    disabled={pending}
                    onClick={() => koer(() => sletLinkGruppe(g.id))}
                  >
                    Slet gruppe?
                  </button>
                  <button className="px-1 text-xs text-grafit-400" onClick={() => setBekraeftSlet(false)}>
                    ✕
                  </button>
                </>
              ) : (
                <button
                  className="rounded px-2 py-1 text-xs text-grafit-400 hover:text-kobber-700"
                  title="Slet tom gruppe"
                  onClick={() => setBekraeftSlet(true)}
                >
                  🗑
                </button>
              ))}
          </>
        )}
      </div>
      {fejl && <p className="mb-2 text-xs text-kobber-700">{fejl}</p>}
      <div className="space-y-2">
        {g.links.map((l, i) => (
          <LinkRaekke
            key={l.id}
            l={l}
            erForst={i === 0}
            erSidst={i === g.links.length - 1}
            modeller={modeller}
            andreGrupper={andreGrupper}
          />
        ))}
      </div>
      <div className="mt-2">
        <NytLink groupId={g.id} modeller={modeller} />
      </div>
    </div>
  );
}

function NyGruppe() {
  const { pending, fejl, koer } = useKoer();
  const [aaben, setAaben] = useState(false);
  const [titel, setTitel] = useState('');

  if (!aaben) {
    return (
      <button className="btn-ghost text-sm" onClick={() => setAaben(true)}>
        + Ny gruppe
      </button>
    );
  }
  return (
    <div className="rounded-xl border border-dashed border-grafit-300 bg-grafit-50 p-4">
      <input
        className="input"
        value={titel}
        onChange={(e) => setTitel(e.target.value)}
        placeholder="Navn på ny gruppe (fx Leasing)"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          className="btn-primary !py-1.5 text-sm"
          disabled={pending || !titel.trim()}
          onClick={() =>
            koer(async () => {
              await opretLinkGruppe(titel);
              setTitel('');
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

export default function LinksStyring({
  grupper,
  modeller,
}: {
  grupper: LinkGruppe[];
  modeller: ModelOpt[];
}) {
  return (
    <div className="space-y-6">
      {grupper.map((g, i) => (
        <GruppeBlok
          key={g.id}
          g={g}
          modeller={modeller}
          andreGrupper={grupper.filter((x) => x.id !== g.id).map((x) => ({ id: x.id, titel: x.titel }))}
          erForstGruppe={i === 0}
          erSidstGruppe={i === grupper.length - 1}
        />
      ))}
      <div className="border-t border-grafit-200 pt-4">
        <NyGruppe />
      </div>
    </div>
  );
}
