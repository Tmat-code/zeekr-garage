'use client';

import { Fragment, useState, type ReactNode } from 'react';
import { useVOrdbog } from '@/lib/i18n/vaerksted/klient';
import type { ManualBlok, ManualKort } from '@/lib/i18n/vaerksted';
import AdminManual from '@/components/admin/AdminManual';

// Rollestyret manual til Værkstedet.
//
// U6: MODERATOR-manualen ligger som data i Værksted-ordbogen (da/sv/en,
// lib/i18n/vaerksted/*.ts) og renderes her på moderatorens sprog. ADMIN-
// manualen (Links, OTA, Modeller, Audit, oprydning m.m.) er AdminManual og
// forbliver dansk (admin-kun = dansk, design valg 2). En admin kan slå
// moderator-manualen op og se præcis det, en moderator ser.
//
// Holdes i sync med features: retter du en moderator-synlig flade, så ret
// kortet i ordbogen (alle tre sprog) og evt. AdminManual.

// Let inline-markup i manual-teksten: **fed**, _kursiv_, `kode`.
function Inline({ tekst }: { tekst: string }) {
  const dele = tekst.split(/(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g);
  return (
    <>
      {dele.map((d, i) => {
        if (d.startsWith('**') && d.endsWith('**') && d.length > 4) {
          return (
            <span key={i} className="font-medium text-grafit-900">
              {d.slice(2, -2)}
            </span>
          );
        }
        if (d.startsWith('_') && d.endsWith('_') && d.length > 2) {
          return <em key={i}>{d.slice(1, -1)}</em>;
        }
        if (d.startsWith('`') && d.endsWith('`') && d.length > 2) {
          return (
            <span key={i} className="font-mono text-grafit-600">
              {d.slice(1, -1)}
            </span>
          );
        }
        return <Fragment key={i}>{d}</Fragment>;
      })}
    </>
  );
}

function Blok({ b }: { b: ManualBlok }) {
  if ('p' in b) {
    return (
      <p>
        <Inline tekst={b.p} />
      </p>
    );
  }
  if ('note' in b) {
    return (
      <p className="text-grafit-500">
        <Inline tekst={b.note} />
      </p>
    );
  }
  if ('afsnit' in b) {
    return (
      <h4 className="mt-1 text-xs font-semibold uppercase tracking-wide text-grafit-400">{b.afsnit}</h4>
    );
  }
  if ('liste' in b) {
    return (
      <ul className="space-y-1.5 pl-5 [list-style:disc] marker:text-kobber-500">
        {b.liste.map((p, i) => (
          <li key={i}>
            {p.navn && <span className="font-medium text-grafit-900">{p.navn}: </span>}
            <Inline tekst={p.tekst} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="divide-y divide-grafit-100 overflow-hidden rounded-xl border border-grafit-200">
      {b.situationer.map((s, i) => (
        <li key={i} className="px-3 py-2.5">
          <p className="font-medium text-grafit-900">{s.naar}</p>
          <p className="mt-0.5 text-grafit-700">
            <Inline tekst={s.tekst} />
          </p>
        </li>
      ))}
    </ul>
  );
}

function Kort({ kort }: { kort: ManualKort }) {
  return (
    <section className="rounded-2xl border border-grafit-200 bg-white p-5 sm:p-6">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span aria-hidden className="text-lg">
          {kort.ikon}
        </span>
        <h3 className="text-lg font-semibold text-grafit-900">{kort.titel}</h3>
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-grafit-700">
        {kort.blokke.map((b, i) => (
          <Blok key={i} b={b} />
        ))}
      </div>
    </section>
  );
}

function ModeratorManual() {
  const v = useVOrdbog();
  return (
    <div className="space-y-5">
      {v.manual.kort.map((k, i) => (
        <Kort key={i} kort={k} />
      ))}
    </div>
  );
}

function VaelgerKnap({
  aktiv,
  onClick,
  forbundet,
  children,
}: {
  aktiv: boolean;
  onClick: () => void;
  forbundet?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktiv}
      className={`${forbundet ? 'border-l border-grafit-300 ' : ''}px-4 py-2 text-sm font-medium ${
        aktiv ? 'bg-kobber-50 text-kobber-800' : 'bg-white text-grafit-600 hover:bg-grafit-50'
      }`}
    >
      {children}
    </button>
  );
}

export default function ManualVisning({
  erAdmin,
  erSuperadmin = false,
}: {
  erAdmin: boolean;
  erSuperadmin?: boolean;
}) {
  const v = useVOrdbog();
  const m = v.manual;
  // Admin/superadmin lander på admin-manualen; ét klik til moderator-manualen
  // (onboarding). Superadmin-laget (Audit + rolle-styring) følger admin-visningen.
  const [visAdmin, setVisAdmin] = useState(erAdmin);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-grafit-900">📖 {m.titel}</h2>
        <p className="mt-0.5 text-sm text-grafit-500">{m.intro}</p>
      </div>

      {erAdmin && (
        <div>
          <div className="inline-flex overflow-hidden rounded-lg border border-grafit-300">
            <VaelgerKnap aktiv={visAdmin} onClick={() => setVisAdmin(true)}>
              {m.adminManual}
            </VaelgerKnap>
            <VaelgerKnap aktiv={!visAdmin} onClick={() => setVisAdmin(false)} forbundet>
              {m.modManual}
            </VaelgerKnap>
          </div>
          <p className="mt-2 text-xs text-grafit-400">{visAdmin ? m.serAdmin : m.serMod}</p>
        </div>
      )}

      {erAdmin && visAdmin ? <AdminManual superadmin={erSuperadmin} /> : <ModeratorManual />}
    </div>
  );
}
