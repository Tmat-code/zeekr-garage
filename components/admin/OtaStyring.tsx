'use client';

import { useState, useTransition } from 'react';
import type { SoftwareUpdate } from '@/lib/types';
import { opretOta, retOta, sletOta, type OtaInput } from '@/app/admin/ota-actions';

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

// Changelog -> punkter (lokal, saa vi ikke traekker server-lib ind i klienten).
function splitPunkter(tekst: string): string[] {
  return tekst
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

// Dagens dato i Europe/Copenhagen som 'YYYY-MM-DD' (sv-SE giver ISO-format).
function iDag(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Copenhagen' }).format(new Date());
}

function datoKort(iso: string): string {
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Europe/Copenhagen',
    });
  } catch {
    return iso;
  }
}

// Multi-vælger: klik en model til/fra. Mindst én skal vælges.
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
        {valgte.length === 0 ? 'Vælg mindst én model' : `${valgte.length} valgt`}
      </p>
    </div>
  );
}

function idFraSlugs(u: SoftwareUpdate, modeller: ModelOpt[]): string[] {
  return u.modeller
    .map((m) => modeller.find((x) => x.slug === m.slug)?.id)
    .filter((x): x is string => !!x);
}

// Delt formular til opret + ret. onGem faar den samlede input; onAnnuller lukker.
function OtaForm({
  modeller,
  start,
  gemLabel,
  onGem,
  onAnnuller,
}: {
  modeller: ModelOpt[];
  start: { version: string; releasedAt: string; changelog: string; note: string; modelIds: string[] };
  gemLabel: string;
  onGem: (input: OtaInput) => Promise<void>;
  onAnnuller?: () => void;
}) {
  const { pending, fejl, koer } = useKoer();
  const [version, setVersion] = useState(start.version);
  const [releasedAt, setReleasedAt] = useState(start.releasedAt);
  const [changelog, setChangelog] = useState(start.changelog);
  const [note, setNote] = useState(start.note);
  const [valgte, setValgte] = useState<string[]>(start.modelIds);

  const punkter = splitPunkter(changelog);
  const kanGemme = !!version.trim() && punkter.length > 0 && valgte.length > 0 && !!releasedAt;

  return (
    <div className={`space-y-3 ${pending ? 'opacity-60' : ''}`}>
      <div>
        <label className="mb-1 block text-xs font-medium text-grafit-500">Model(ler)</label>
        <ModelVaelger modeller={modeller} valgte={valgte} setValgte={setValgte} />
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[12rem]">
          <label className="mb-1 block text-xs font-medium text-grafit-500">Version</label>
          <input
            className="input"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="fx Zeekr OS 3.0.4"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-grafit-500">Dato</label>
          <input
            type="date"
            className="input !w-auto"
            value={releasedAt}
            onChange={(e) => setReleasedAt(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-grafit-500">
          Changelog - én linje = ét punkt
        </label>
        <textarea
          className="input min-h-[8rem] font-mono text-sm"
          value={changelog}
          onChange={(e) => setChangelog(e.target.value)}
          placeholder={'Indsæt changeloggen her.\nHver linje bliver ét punkt i listen.'}
        />
        <p className="mt-1 text-xs text-grafit-400">
          {punkter.length} {punkter.length === 1 ? 'punkt' : 'punkter'} splittes automatisk.
        </p>
        {punkter.length > 0 && (
          <ul className="mt-2 list-disc space-y-0.5 rounded-lg border border-grafit-100 bg-grafit-50 p-3 pl-7 text-sm text-grafit-600">
            {punkter.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-grafit-500">Note (valgfri)</label>
        <input
          className="input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="fx rulles ud gradvist"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          className="btn-primary !py-1.5 text-sm"
          disabled={pending || !kanGemme}
          onClick={() =>
            koer(() => onGem({ version, releasedAt, changelog, note, modelIds: valgte }))
          }
        >
          {gemLabel}
        </button>
        {onAnnuller && (
          <button className="btn-ghost !py-1.5 text-sm" onClick={onAnnuller}>
            Annullér
          </button>
        )}
        {fejl && <span className="text-sm text-kobber-700">{fejl}</span>}
      </div>
    </div>
  );
}

function NytOpslag({ modeller }: { modeller: ModelOpt[] }) {
  const [aaben, setAaben] = useState(false);
  // Remount formularen ved hver aabning, saa felterne (incl. dagens dato) nulstilles.
  const [n, setN] = useState(0);

  if (!aaben) {
    return (
      <button className="btn-primary text-sm" onClick={() => { setN((x) => x + 1); setAaben(true); }}>
        + Nyt OTA-opslag
      </button>
    );
  }
  return (
    <div className="rounded-xl border border-dashed border-grafit-300 bg-grafit-50 p-4">
      <OtaForm
        key={n}
        modeller={modeller}
        start={{ version: '', releasedAt: iDag(), changelog: '', note: '', modelIds: [] }}
        gemLabel="Opret"
        onGem={async (input) => {
          await opretOta(input);
          setAaben(false);
        }}
        onAnnuller={() => setAaben(false)}
      />
    </div>
  );
}

function OtaRaekke({ u, modeller }: { u: SoftwareUpdate; modeller: ModelOpt[] }) {
  const { pending, fejl, koer } = useKoer();
  const [redigerer, setRedigerer] = useState(false);
  const [bekraeftSlet, setBekraeftSlet] = useState(false);

  if (redigerer) {
    return (
      <div className="rounded-xl border border-grafit-200 bg-white p-3">
        <OtaForm
          modeller={modeller}
          start={{
            version: u.version,
            releasedAt: u.releasedAt,
            changelog: u.changelog,
            note: u.note ?? '',
            modelIds: idFraSlugs(u, modeller),
          }}
          gemLabel="Gem"
          onGem={async (input) => {
            await retOta(u.id, input);
            setRedigerer(false);
          }}
          onAnnuller={() => setRedigerer(false)}
        />
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-grafit-200 bg-white p-3 ${pending ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-grafit-900">{u.version}</span>
            <span className="text-xs text-grafit-400">{datoKort(u.releasedAt)}</span>
            {u.modeller.map((m) => (
              <span
                key={m.slug}
                className="shrink-0 rounded-full bg-kobber-100 px-2 py-0.5 text-xs font-medium text-kobber-800"
              >
                {kort(m.name)}
              </span>
            ))}
          </div>
          <div className="mt-1 text-xs text-grafit-400">
            {u.punkter.length} {u.punkter.length === 1 ? 'punkt' : 'punkter'}
            {u.note ? ` · ${u.note}` : ''}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
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
                onClick={() => koer(() => sletOta(u.id))}
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
      {fejl && <p className="mt-2 text-xs text-kobber-700">{fejl}</p>}
    </div>
  );
}

export default function OtaStyring({
  opdateringer,
  modeller,
}: {
  opdateringer: SoftwareUpdate[];
  modeller: ModelOpt[];
}) {
  return (
    <div className="space-y-4">
      <NytOpslag modeller={modeller} />
      {opdateringer.length === 0 ? (
        <p className="rounded-xl border border-dashed border-grafit-200 bg-grafit-50 p-4 text-sm text-grafit-400">
          Ingen OTA-opslag endnu. Opret det første ovenfor.
        </p>
      ) : (
        <div className="space-y-2">
          {opdateringer.map((u) => (
            <OtaRaekke key={u.id} u={u} modeller={modeller} />
          ))}
        </div>
      )}
    </div>
  );
}
