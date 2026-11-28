'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  STATUSES,
  SEVERITIES,
  ISSUE_CATEGORY_SLUGS,
  TYPE_META,
  type Status,
  type Severity,
} from '@/lib/config';
import { useOrdbog, useSprog } from '@/lib/i18n/klient';
import { useVOrdbog } from '@/lib/i18n/vaerksted/klient';
import { useVKoer } from '@/components/admin/useVKoer';
import type { IssueRow } from '@/lib/types';
import { KILDESPROG } from '@/lib/kildesprog';
import { SPROG_EGET_NAVN } from '@/lib/i18n/sprog';
import { soegeOrd, soegeTraef, titelPaaSprog } from '@/lib/titel-oversaet-kerne';
import {
  saetStatus,
  saetSeverity,
  saetKategori,
  saetMeldingSprog,
  markerLoest,
  sletMelding,
  gemRedigering,
  samlDublet,
} from '@/app/admin/actions';

const LOEST_GROEN = '#4f6f4a';
const selectKlasse =
  'rounded-lg border border-grafit-300 bg-white px-2 py-1 text-sm text-grafit-900';

// Ét klassificerings-felt: lille label over en dropdown, så de tre
// (status/alvor/kategori) laeser som én enhed i stedet for tre loese ting.
function Felt({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-grafit-400">
        {label}
      </span>
      {children}
    </label>
  );
}

// Overloebs-menu (⋯) til de sjaeldnere/destruktive handlinger, så de ikke
// kaemper om pladsen med den daglige klassificering.
function HandlingerMenu({
  disabled,
  label,
  children,
}: {
  disabled?: boolean;
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const knapRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Naar menuen aabner: flyt fokus til foerste punkt, så tastatur-brugere
  // lander inde i menuen (ikke efterladt paa ⋯-knappen).
  useEffect(() => {
    if (!open) return;
    const foerste = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    foerste?.focus();
  }, [open]);

  function luk(returFokus = true) {
    setOpen(false);
    // Tilbage til ⋯-knappen, så fokus ikke falder til toppen af siden.
    if (returFokus) knapRef.current?.focus();
  }

  // Tastatur paa selve ⋯-knappen: Enter/Mellemrum/Pil-ned aabner.
  function knapTaster(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      luk();
    }
  }

  // Tastatur inde i menuen: pile + Home/End flytter mellem punkter,
  // Escape lukker (fokus tilbage til knappen), Tab lukker paent.
  function menuTaster(e: React.KeyboardEvent) {
    const punkter = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    if (punkter.length === 0) return;
    const i = punkter.indexOf(document.activeElement as HTMLElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      punkter[(i + 1) % punkter.length].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      punkter[(i - 1 + punkter.length) % punkter.length].focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      punkter[0].focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      punkter[punkter.length - 1].focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      luk();
    } else if (e.key === 'Tab') {
      luk(false);
    }
  }

  return (
    <div className="relative">
      <button
        ref={knapRef}
        type="button"
        className="rounded-lg border border-grafit-200 px-2.5 py-1 text-base leading-none text-grafit-500 hover:border-grafit-300 hover:text-grafit-700"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={knapTaster}
      >
        ⋯
      </button>
      {open && (
        <>
          {/* Usynlig bagvaeg lukker menuen ved klik udenfor. */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => luk(false)}
          />
          <div
            ref={menuRef}
            role="menu"
            aria-label={label}
            className="absolute right-0 z-20 mt-1 min-w-[160px] overflow-hidden rounded-lg border border-grafit-200 bg-white py-1 shadow-lg"
            onKeyDown={menuTaster}
            onClick={() => luk(false)}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}

function MenuPunkt({
  onClick,
  danger,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${
        danger
          ? 'text-kobber-700 hover:bg-kobber-50'
          : 'text-grafit-700 hover:bg-grafit-50'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// P43: læg DENNE melding (dubletten) ind under en anden (originalen). Søgningen
// matcher også titlernes oversættelser, så en svensk dublet finder den danske
// original. Kun samme type (fejl/ønske); RPC'en håndhæver resten.
function SamlPanel({
  issue,
  alle,
  pending,
  onSaml,
  onLuk,
}: {
  issue: IssueRow;
  alle: IssueRow[];
  pending: boolean;
  onSaml: (original: IssueRow) => void;
  onLuk: () => void;
}) {
  const v = useVOrdbog();
  const f = v.feedback;
  const sprog = useSprog();
  const [q, setQ] = useState('');
  const [valgt, setValgt] = useState<IssueRow | null>(null);

  const kandidater = useMemo(() => {
    const ord = soegeOrd(q);
    if (q.trim().length < 2) return [];
    return alle
      .filter((i) => i.id !== issue.id && i.type === issue.type)
      .map((i) => ({ i, traef: soegeTraef(i, [], ord) }))
      .filter((x) => x.traef > 0)
      .sort((a, b) => b.traef - a.traef || b.i.confirmations - a.i.confirmations)
      .slice(0, 6)
      .map((x) => x.i);
  }, [alle, issue.id, issue.type, q]);

  return (
    <div className="mt-3 rounded-lg border border-kobber-200 bg-kobber-50/40 p-3">
      <p className="text-sm font-semibold text-grafit-900">{f.samlTitel}</p>
      <p className="mt-0.5 text-xs text-grafit-500">{f.samlIntro}</p>

      {valgt ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-grafit-800">{f.samlBekraeft(issue.title, valgt.title)}</p>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-lg bg-kobber-600 px-2.5 py-1 text-sm font-semibold text-white hover:bg-kobber-700"
              disabled={pending}
              onClick={() => onSaml(valgt)}
            >
              {f.samlKnap}
            </button>
            <button className="btn-ghost !px-2 !py-1 text-sm" onClick={() => setValgt(null)}>
              {v.faelles.fortryd}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <input
              className="input !py-1.5 text-sm"
              value={q}
              autoFocus
              onChange={(e) => setQ(e.target.value)}
              placeholder={f.samlSoegPh}
            />
            <button className="btn-ghost !px-2 !py-1 text-sm" onClick={onLuk}>
              {f.annuller}
            </button>
          </div>
          {q.trim().length >= 2 && kandidater.length === 0 && (
            <p className="text-xs text-grafit-500">{f.samlIngenTraef}</p>
          )}
          {kandidater.length > 0 && (
            <ul className="divide-y divide-grafit-100 overflow-hidden rounded-lg border border-grafit-200 bg-white">
              {kandidater.map((k) => {
                const oversat = titelPaaSprog(k, sprog);
                return (
                  <li key={k.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="min-w-[56px] text-xs tabular-nums text-grafit-500">
                      ▲ {f.stemmer(k.confirmations)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-grafit-900">{k.title}</span>
                      {oversat && (
                        <span className="block truncate text-xs text-grafit-400">{oversat}</span>
                      )}
                      <span className="block text-xs text-grafit-400">
                        {k.models.map((m) => m.name.replace('Zeekr ', '')).join(', ') || '-'}
                        {' · '}
                        {SPROG_EGET_NAVN[k.sprog]}
                      </span>
                    </span>
                    <button
                      className="rounded-lg border border-kobber-300 px-2.5 py-1 text-sm font-medium text-kobber-700 hover:bg-kobber-50"
                      onClick={() => setValgt(k)}
                    >
                      {f.samlVaelg}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Raekke({ issue, alle }: { issue: IssueRow; alle: IssueRow[] }) {
  const t = useOrdbog();
  const v = useVOrdbog();
  const f = v.feedback;
  const { pending, koer, fejl } = useVKoer();
  const [redigerer, setRedigerer] = useState(false);
  const [bekraeftSlet, setBekraeftSlet] = useState(false);
  const [markerer, setMarkerer] = useState(false);
  const [samler, setSamler] = useState(false);
  const [titel, setTitel] = useState(issue.title);
  const [beskrivelse, setBeskrivelse] = useState(issue.description);

  const type = TYPE_META[issue.type];
  const typeBadge = t.config.type[issue.type]?.badge ?? type.badge;
  const modelTekst = issue.models.map((m) => m.name).join(', ') || '-';
  const kanLoeses =
    issue.status !== 'loest_i_ota' && issue.status !== 'afklaret';

  return (
    <div
      className={`rounded-xl border border-grafit-200 bg-white p-4 ${
        pending ? 'opacity-60' : ''
      }`}
    >
      <div className="flex flex-wrap items-start gap-3">
        {/* Stemmer */}
        <div className="flex min-w-[48px] flex-col items-center rounded-lg bg-grafit-50 px-2 py-1">
          <span className="text-xs text-grafit-400">▲</span>
          <span className="text-lg font-semibold tabular-nums text-grafit-900">
            {issue.confirmations}
          </span>
        </div>

        {/* Titel + meta */}
        <div className="min-w-0 flex-1">
          {redigerer ? (
            <div className="space-y-2">
              <input
                className="input"
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
                placeholder={f.titelPh}
              />
              <textarea
                className="input min-h-[80px]"
                value={beskrivelse}
                onChange={(e) => setBeskrivelse(e.target.value)}
                placeholder={f.beskrivelsePh}
              />
              <div className="flex gap-2">
                <button
                  className="btn-primary !py-1.5 text-sm"
                  disabled={pending}
                  onClick={() =>
                    koer(
                      () =>
                        gemRedigering(issue.id, {
                          title: titel,
                          description: beskrivelse,
                        }),
                      () => setRedigerer(false),
                    )
                  }
                >
                  {f.gem}
                </button>
                <button
                  className="btn-ghost !py-1.5 text-sm"
                  onClick={() => {
                    setTitel(issue.title);
                    setBeskrivelse(issue.description);
                    setRedigerer(false);
                  }}
                >
                  {f.annuller}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-grafit-900">{issue.title}</span>
                <span className={`chip ${type.chip}`}>{typeBadge}</span>
                {issue.comments > 0 && (
                  <Link
                    href={`/melding/${issue.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 rounded-full bg-kobber-50 px-2 py-0.5 text-xs font-semibold text-kobber-700 hover:bg-kobber-100"
                    title={f.seKommentarer}
                  >
                    💬 {f.svar(issue.comments)}
                  </Link>
                )}
              </div>
              <p className="mt-0.5 text-xs text-grafit-500">
                {modelTekst}
                {issue.software_version && (
                  <span className="font-mono text-grafit-400">
                    {' '}
                    · {issue.software_version}
                  </span>
                )}
              </p>
            </>
          )}
        </div>
      </div>

      {!redigerer && (
        <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-3 border-t border-grafit-100 pt-3">
          {/* Klassificering: de tre dropdowns samlet som én enhed */}
          <div className="flex flex-wrap items-end gap-2">
            <Felt label={f.status}>
              <select
                className={selectKlasse}
                value={issue.status}
                disabled={pending}
                onChange={(e) =>
                  koer(() => saetStatus(issue.id, e.target.value as Status))
                }
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t.config.status[s]}
                  </option>
                ))}
              </select>
            </Felt>

            <Felt label={f.alvor}>
              <select
                className={selectKlasse}
                value={issue.severity}
                disabled={pending}
                onChange={(e) =>
                  koer(() => saetSeverity(issue.id, e.target.value as Severity))
                }
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {t.config.alvor[s]}
                  </option>
                ))}
              </select>
            </Felt>

            <Felt label={f.kategori}>
              <select
                className={selectKlasse}
                value={issue.category ?? ''}
                disabled={pending}
                onChange={(e) => koer(() => saetKategori(issue.id, e.target.value))}
              >
                <option value="">{f.ingenKategori}</option>
                {ISSUE_CATEGORY_SLUGS.map((slug) => (
                  <option key={slug} value={slug}>
                    {t.config.kategori[slug]}
                  </option>
                ))}
              </select>
            </Felt>

            {/* U3b: kildesprog (auto-detekteret ved oprettelse; ret hvis forkert) */}
            <Felt label={f.sprog}>
              <select
                className={selectKlasse}
                value={issue.sprog}
                disabled={pending}
                onChange={(e) => koer(() => saetMeldingSprog(issue.id, e.target.value))}
                title={f.sprogTitle}
              >
                {KILDESPROG.map((s) => (
                  <option key={s} value={s}>
                    {SPROG_EGET_NAVN[s]}
                  </option>
                ))}
              </select>
            </Felt>
          </div>

          <span className="flex-1" />

          {/* Handlinger: Markér løst synlig, resten i ⋯-menuen */}
          {bekraeftSlet ? (
            <span className="flex items-center gap-1">
              <span className="mr-1 text-xs text-grafit-500">{f.sletSpoerg}</span>
              <button
                className="rounded-lg bg-kobber-600 px-2.5 py-1 text-sm font-semibold text-white hover:bg-kobber-700"
                disabled={pending}
                onClick={() => koer(() => sletMelding(issue.id))}
              >
                {v.faelles.bekraeftSlet}
              </button>
              <button
                className="btn-ghost !px-2 !py-1 text-sm"
                onClick={() => setBekraeftSlet(false)}
              >
                {v.faelles.fortryd}
              </button>
            </span>
          ) : markerer ? (
            <span className="flex flex-wrap items-center gap-1">
              <span className="mr-1 text-xs text-grafit-500">{f.loestHvordan}</span>
              <button
                className="rounded-lg border px-2.5 py-1 text-sm font-medium hover:bg-grafit-50"
                style={{ borderColor: LOEST_GROEN, color: LOEST_GROEN }}
                disabled={pending}
                onClick={() => koer(() => markerLoest(issue.id), () => setMarkerer(false))}
                title={f.loestIOtaTitle}
              >
                {f.loestIOta}
              </button>
              <button
                className="rounded-lg border border-grafit-300 px-2.5 py-1 text-sm font-medium text-grafit-700 hover:bg-grafit-50"
                disabled={pending}
                onClick={() =>
                  koer(() => saetStatus(issue.id, 'afklaret'), () => setMarkerer(false))
                }
                title={f.afklaretTitle}
              >
                {f.afklaret}
              </button>
              <button
                className="btn-ghost !px-2 !py-1 text-sm"
                onClick={() => setMarkerer(false)}
              >
                {v.faelles.fortryd}
              </button>
            </span>
          ) : (
            <div className="flex items-center gap-2">
              {kanLoeses && (
                <button
                  className="rounded-lg border px-2.5 py-1 text-sm font-medium hover:bg-grafit-50"
                  style={{ borderColor: LOEST_GROEN, color: LOEST_GROEN }}
                  disabled={pending}
                  onClick={() => setMarkerer(true)}
                >
                  {f.markerLoest}
                </button>
              )}
              <HandlingerMenu disabled={pending} label={f.flereHandlinger}>
                <MenuPunkt onClick={() => setRedigerer(true)}>{f.rediger}</MenuPunkt>
                <MenuPunkt onClick={() => setSamler(true)}>{f.laegSammen}</MenuPunkt>
                <MenuPunkt danger onClick={() => setBekraeftSlet(true)}>
                  {f.slet}
                </MenuPunkt>
              </HandlingerMenu>
            </div>
          )}
        </div>
      )}

      {samler &&
        (issue.importeret ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-grafit-200 bg-grafit-50 p-3 text-xs text-grafit-600">
            <span className="flex-1">{f.samlImporteret}</span>
            <button className="btn-ghost !px-2 !py-1 text-sm" onClick={() => setSamler(false)}>
              {f.annuller}
            </button>
          </div>
        ) : (
          <SamlPanel
            issue={issue}
            alle={alle}
            pending={pending}
            onLuk={() => setSamler(false)}
            onSaml={(o) => koer(() => samlDublet(issue.id, o.id), () => setSamler(false))}
          />
        ))}

      {fejl && <p className="mt-2 text-xs text-kobber-700">{fejl}</p>}
    </div>
  );
}

export default function ModereringsTabel({ issues }: { issues: IssueRow[] }) {
  const v = useVOrdbog();
  // Sorteret som bugherrer: flest stemmer oeverst.
  const sorteret = [...issues].sort((a, b) => b.confirmations - a.confirmations);

  if (sorteret.length === 0) {
    return <p className="text-sm text-grafit-500">{v.feedback.ingenMeldinger}</p>;
  }

  return (
    <div className="space-y-2.5">
      {sorteret.map((i) => (
        <Raekke key={i.id} issue={i} alle={issues} />
      ))}
    </div>
  );
}
