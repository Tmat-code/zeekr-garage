'use client';

import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import {
  STATUSES,
  SEVERITIES,
  ISSUE_CATEGORIES,
  STATUS_STYLE,
  SEVERITY_STYLE,
  TYPE_META,
  type Status,
  type Severity,
} from '@/lib/config';
import type { IssueRow } from '@/lib/types';
import {
  saetStatus,
  saetSeverity,
  saetKategori,
  markerLoest,
  sletMelding,
  gemRedigering,
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
  children,
}: {
  disabled?: boolean;
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
        aria-label="Flere handlinger"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Flere handlinger"
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
            aria-label="Flere handlinger"
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

function Raekke({ issue }: { issue: IssueRow }) {
  const [pending, start] = useTransition();
  const [fejl, setFejl] = useState<string | null>(null);
  const [redigerer, setRedigerer] = useState(false);
  const [bekraeftSlet, setBekraeftSlet] = useState(false);
  const [markerer, setMarkerer] = useState(false);
  const [titel, setTitel] = useState(issue.title);
  const [beskrivelse, setBeskrivelse] = useState(issue.description);

  const type = TYPE_META[issue.type];
  const modelTekst = issue.models.map((m) => m.name).join(', ') || '-';
  const kanLoeses =
    issue.status !== 'loest_i_ota' && issue.status !== 'afklaret';

  function koer(fn: () => Promise<void>) {
    setFejl(null);
    start(async () => {
      try {
        await fn();
      } catch (e: any) {
        setFejl(e?.message ?? 'Noget gik galt.');
      }
    });
  }

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
                placeholder="Titel"
              />
              <textarea
                className="input min-h-[80px]"
                value={beskrivelse}
                onChange={(e) => setBeskrivelse(e.target.value)}
                placeholder="Beskrivelse"
              />
              <div className="flex gap-2">
                <button
                  className="btn-primary !py-1.5 text-sm"
                  disabled={pending}
                  onClick={() =>
                    koer(async () => {
                      await gemRedigering(issue.id, {
                        title: titel,
                        description: beskrivelse,
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
                    setTitel(issue.title);
                    setBeskrivelse(issue.description);
                    setRedigerer(false);
                  }}
                >
                  Annullér
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-grafit-900">{issue.title}</span>
                <span className={`chip ${type.chip}`}>{type.badge}</span>
                {issue.comments > 0 && (
                  <Link
                    href={`/melding/${issue.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 rounded-full bg-kobber-50 px-2 py-0.5 text-xs font-semibold text-kobber-700 hover:bg-kobber-100"
                    title="Se kommentarer"
                  >
                    💬 {issue.comments} svar
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
            <Felt label="Status">
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
                    {STATUS_STYLE[s].label}
                  </option>
                ))}
              </select>
            </Felt>

            <Felt label="Alvor">
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
                    {SEVERITY_STYLE[s].label}
                  </option>
                ))}
              </select>
            </Felt>

            <Felt label="Kategori">
              <select
                className={selectKlasse}
                value={issue.category ?? ''}
                disabled={pending}
                onChange={(e) => koer(() => saetKategori(issue.id, e.target.value))}
              >
                <option value="">– ingen –</option>
                {ISSUE_CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Felt>
          </div>

          <span className="flex-1" />

          {/* Handlinger: Markér løst synlig, resten i ⋯-menuen */}
          {bekraeftSlet ? (
            <span className="flex items-center gap-1">
              <span className="mr-1 text-xs text-grafit-500">Slet denne melding?</span>
              <button
                className="rounded-lg bg-kobber-600 px-2.5 py-1 text-sm font-semibold text-white hover:bg-kobber-700"
                disabled={pending}
                onClick={() => koer(() => sletMelding(issue.id))}
              >
                Bekræft slet
              </button>
              <button
                className="btn-ghost !px-2 !py-1 text-sm"
                onClick={() => setBekraeftSlet(false)}
              >
                Fortryd
              </button>
            </span>
          ) : markerer ? (
            <span className="flex flex-wrap items-center gap-1">
              <span className="mr-1 text-xs text-grafit-500">Løst hvordan?</span>
              <button
                className="rounded-lg border px-2.5 py-1 text-sm font-medium hover:bg-grafit-50"
                style={{ borderColor: LOEST_GROEN, color: LOEST_GROEN }}
                disabled={pending}
                onClick={() =>
                  koer(async () => {
                    await markerLoest(issue.id);
                    setMarkerer(false);
                  })
                }
                title="Zeekr har rettet det i en software-opdatering"
              >
                ✅ Løst i OTA
              </button>
              <button
                className="rounded-lg border border-grafit-300 px-2.5 py-1 text-sm font-medium text-grafit-700 hover:bg-grafit-50"
                disabled={pending}
                onClick={() =>
                  koer(async () => {
                    await saetStatus(issue.id, 'afklaret');
                    setMarkerer(false);
                  })
                }
                title="Afsluttet uden OTA-fix, fx fejlinformeret bruger eller afklaret i en kommentar"
              >
                💬 Afklaret
              </button>
              <button
                className="btn-ghost !px-2 !py-1 text-sm"
                onClick={() => setMarkerer(false)}
              >
                Fortryd
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
                  ✅ Markér løst
                </button>
              )}
              <HandlingerMenu disabled={pending}>
                <MenuPunkt onClick={() => setRedigerer(true)}>✏️ Redigér</MenuPunkt>
                <MenuPunkt danger onClick={() => setBekraeftSlet(true)}>
                  🗑 Slet
                </MenuPunkt>
              </HandlingerMenu>
            </div>
          )}
        </div>
      )}

      {fejl && <p className="mt-2 text-xs text-kobber-700">{fejl}</p>}
    </div>
  );
}

export default function ModereringsTabel({ issues }: { issues: IssueRow[] }) {
  // Sorteret som bugherrer: flest stemmer oeverst.
  const sorteret = [...issues].sort((a, b) => b.confirmations - a.confirmations);

  if (sorteret.length === 0) {
    return <p className="text-sm text-grafit-500">Ingen meldinger endnu.</p>;
  }

  return (
    <div className="space-y-2.5">
      {sorteret.map((i) => (
        <Raekke key={i.id} issue={i} />
      ))}
    </div>
  );
}
