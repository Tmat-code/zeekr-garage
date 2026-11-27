'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { IssueRow, Model, GarageBil } from '@/lib/types';
import { relativTid } from '@/lib/i18n/format';
import { useOrdbog, useSprog } from '@/lib/i18n/klient';
import { TYPE_META, ISSUE_CATEGORY_SLUGS, kategoriLabelPaa, type Status } from '@/lib/config';
import { soegeOrd, soegeTraef } from '@/lib/titel-oversaet-kerne';
import { StatusTag, SeverityTag, PlatformSignal } from '@/components/Tags';
import ConfirmButton from '@/components/ConfirmButton';
import OversatTitel from '@/components/OversatTitel';

type Sortering = 'stemmer' | 'nyeste';
type TypeFilter = 'alle' | 'fejl' | 'oenske';
type StatusFilter = 'aktive' | 'afsluttet' | 'alle';

// Aktive = i spil; Afsluttet = løst/afklaret (udfald, ikke den røde tråd).
const AKTIVE_STATUS: Status[] = ['ny', 'bekraeftet', 'sendt_til_zeekr'];
const AFSLUTTET_STATUS: Status[] = ['afklaret', 'loest_i_ota'];

export default function FejlBoard({
  issues,
  models,
  userCars,
  myCounts,
  isLoggedIn,
}: {
  issues: IssueRow[];
  models: Model[];
  userCars: GarageBil[];
  myCounts: Record<string, number>;
  isLoggedIn: boolean;
}) {
  const [query, setQuery] = useState('');
  const [modelSlug, setModelSlug] = useState<string | 'alle'>('alle');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('alle');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('aktive');
  const [kategoriFilter, setKategoriFilter] = useState<string>('alle');
  const [sort, setSort] = useState<Sortering>('stemmer');
  const t = useOrdbog();
  const sprog = useSprog();
  const f = t.feedback;

  const antalFejl = useMemo(() => issues.filter((i) => i.type === 'fejl').length, [issues]);
  const antalOensker = useMemo(() => issues.filter((i) => i.type === 'oenske').length, [issues]);
  const antalAktive = useMemo(
    () => issues.filter((i) => AKTIVE_STATUS.includes(i.status)).length,
    [issues],
  );
  const antalAfsluttet = useMemo(
    () => issues.filter((i) => AFSLUTTET_STATUS.includes(i.status)).length,
    [issues],
  );

  const viste = useMemo(() => {
    // U3b: søg på tværs af sprog - titlens oversættelser + kategori-label på
    // læserens sprog tæller med. Alle ord skal matche (stamme-reduceret).
    const ord = soegeOrd(query);
    let r = issues;
    if (statusFilter === 'aktive') {
      r = r.filter((i) => AKTIVE_STATUS.includes(i.status));
    } else if (statusFilter === 'afsluttet') {
      r = r.filter((i) => AFSLUTTET_STATUS.includes(i.status));
    }
    if (typeFilter !== 'alle') {
      r = r.filter((i) => i.type === typeFilter);
    }
    if (modelSlug !== 'alle') {
      r = r.filter((i) => i.models.some((m) => m.slug === modelSlug));
    }
    if (kategoriFilter !== 'alle') {
      r = r.filter((i) => i.category === kategoriFilter);
    }
    if (ord.length > 0) {
      r = r.filter(
        (i) =>
          soegeTraef(
            i,
            [i.category ?? '', kategoriLabelPaa(i.category, t.config.kategori) ?? ''],
            ord,
          ) === ord.length,
      );
    }
    return [...r].sort((a, b) =>
      sort === 'nyeste'
        ? b.created_at.localeCompare(a.created_at)
        : b.confirmations - a.confirmations,
    );
  }, [issues, modelSlug, typeFilter, statusFilter, kategoriFilter, query, sort, t]);

  return (
    <div>
      {/* Modelfilter */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <FilterChip aktiv={modelSlug === 'alle'} onClick={() => setModelSlug('alle')}>
          {f.alleModeller}
        </FilterChip>
        {models.map((m) => (
          <FilterChip key={m.slug} aktiv={modelSlug === m.slug} onClick={() => setModelSlug(m.slug)}>
            {m.name.replace('Zeekr ', '')}
          </FilterChip>
        ))}
      </div>

      {/* Status- + type-filter */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Status: Aktive (standard) / Afsluttet / Alle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-grafit-400">
            {f.status}
          </span>
          <div className="inline-flex gap-1 rounded-lg bg-grafit-100 p-1">
          {([
            { key: 'aktive', navn: f.aktive, antal: antalAktive },
            { key: 'afsluttet', navn: f.afsluttet, antal: antalAfsluttet },
            { key: 'alle', navn: t.faelles.alle, antal: issues.length },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setStatusFilter(t.key)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                statusFilter === t.key ? 'bg-white text-grafit-900 shadow-sm' : 'text-grafit-500'
              }`}
            >
              {t.navn} <span className="font-normal opacity-60">({t.antal})</span>
            </button>
          ))}
          </div>
        </div>

        {/* Type: Alle / Fejl / Ønsker */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-grafit-400">
            {f.type}
          </span>
          <div className="inline-flex gap-1 rounded-lg bg-grafit-100 p-1">
          {([
            { key: 'alle', navn: t.faelles.alle, antal: issues.length },
            { key: 'fejl', navn: f.fejlFane, antal: antalFejl },
            { key: 'oenske', navn: f.oenskerFane, antal: antalOensker },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTypeFilter(t.key)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                typeFilter === t.key ? 'bg-white text-grafit-900 shadow-sm' : 'text-grafit-500'
              }`}
            >
              {t.navn} <span className="font-normal opacity-60">({t.antal})</span>
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* Søg + kategori + sortering */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={f.soegPlaceholder}
            title={f.soegHjaelp}
            aria-label={f.soegPlaceholder}
            className="input sm:max-w-xs"
          />
          <select
            value={kategoriFilter}
            onChange={(e) => setKategoriFilter(e.target.value)}
            className="input sm:max-w-[13rem]"
            aria-label={f.kategoriAria}
          >
            <option value="alle">{f.alleKategorier}</option>
            {ISSUE_CATEGORY_SLUGS.map((slug) => (
              <option key={slug} value={slug}>
                {t.config.kategori[slug]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-grafit-500">
            {f.antal(viste.length, typeFilter)}
          </span>
          <div className="flex gap-1 rounded-lg bg-grafit-100 p-1">
            <SortKnap aktiv={sort === 'stemmer'} onClick={() => setSort('stemmer')}>
              {f.flestStemmer}
            </SortKnap>
            <SortKnap aktiv={sort === 'nyeste'} onClick={() => setSort('nyeste')}>
              {f.nyeste}
            </SortKnap>
          </div>
        </div>
      </div>

      {/* Liste */}
      {viste.length === 0 ? (
        <div className="kort p-10 text-center">
          <p className="font-semibold text-grafit-700">{f.tomTitel}</p>
          <p className="mt-1 text-sm text-grafit-500">
            {modelSlug === 'alle' && typeFilter === 'alle' && !query.trim()
              ? f.tomFoerste
              : f.tomFilter}
          </p>
          <Link href="/meld" className="btn-primary mt-4">{f.meldInd}</Link>
        </div>
      ) : (
        <ul className="grid gap-3">
          {viste.map((i) => (
            <li
              key={i.id}
              className={`kort flex items-start gap-4 p-4 sm:p-5 ${
                statusFilter === 'alle' && AFSLUTTET_STATUS.includes(i.status)
                  ? 'opacity-60'
                  : ''
              }`}
            >
              <ConfirmButton
                issueId={i.id}
                issueModelIds={i.models.map((m) => m.id)}
                userCars={userCars}
                initialCount={i.confirmations}
                initialMine={myCounts[i.id] ?? 0}
                isLoggedIn={isLoggedIn}
              />
              <div className="min-w-0 flex-1">
                <OversatTitel
                  tag="h3"
                  titel={i.title}
                  sprog={i.sprog}
                  titler={i.titler}
                  href={`/melding/${i.id}`}
                  className="font-semibold text-grafit-900"
                  linkClassName="hover:text-kobber-700 hover:underline"
                />
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className={`chip ${TYPE_META[i.type].chip}`}>{t.config.type[i.type].badge}</span>
                  {kategoriLabelPaa(i.category, t.config.kategori) && (
                    <span className="chip border border-kobber-200 bg-kobber-50 text-kobber-700">
                      {kategoriLabelPaa(i.category, t.config.kategori)}
                    </span>
                  )}
                  {i.models.map((m) => (
                    <span key={m.slug} className="chip bg-grafit-100 text-grafit-700">
                      {m.name.replace('Zeekr ', '')}
                    </span>
                  ))}
                  <PlatformSignal platforms={i.models.map((m) => m.platform)} />
                  {i.software_version && (
                    <span className="chip bg-grafit-100 font-mono text-grafit-600">{i.software_version}</span>
                  )}
                  {i.type === 'fejl' && <SeverityTag severity={i.severity} />}
                  {(i.status === 'sendt_til_zeekr' || i.status === 'loest_i_ota' || i.status === 'afklaret' || i.status === 'bekraeftet') && (
                    <StatusTag status={i.status} />
                  )}
                  <span className="text-grafit-400">· {relativTid(i.created_at, sprog)}</span>
                  {i.comments > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-kobber-50 px-2 py-0.5 font-semibold text-kobber-700">
                      💬 {f.svar(i.comments)}
                    </span>
                  )}
                  {i.billeder.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-grafit-100 px-2 py-0.5 font-semibold text-grafit-600">
                      📷 {i.billeder.length}
                    </span>
                  )}
                </div>
                {i.billeder.length > 0 && (
                  <Link
                    href={`/melding/${i.id}`}
                    className="mt-2 flex flex-wrap gap-1.5"
                    aria-label={f.seBilleder}
                  >
                    {i.billeder.slice(0, 3).map((url, n) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={n}
                        src={url}
                        alt=""
                        loading="lazy"
                        className="h-14 w-14 rounded-lg border border-grafit-200 object-cover"
                      />
                    ))}
                    {i.billeder.length > 3 && (
                      <span className="flex h-14 w-14 items-center justify-center rounded-lg border border-grafit-200 bg-grafit-50 text-xs font-semibold text-grafit-500">
                        +{i.billeder.length - 3}
                      </span>
                    )}
                  </Link>
                )}
              </div>
              <Link
                href={`/melding/${i.id}`}
                className="btn-ghost shrink-0 self-start !px-3 !py-1.5 text-sm"
              >
                {f.detaljer}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  aktiv,
  onClick,
  children,
}: {
  aktiv: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
        aktiv ? 'bg-grafit-900 text-white' : 'bg-grafit-100 text-grafit-600 hover:bg-grafit-200'
      }`}
    >
      {children}
    </button>
  );
}

function SortKnap({
  aktiv,
  onClick,
  children,
}: {
  aktiv: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
        aktiv ? 'bg-white text-grafit-900 shadow-sm' : 'text-grafit-500'
      }`}
    >
      {children}
    </button>
  );
}
