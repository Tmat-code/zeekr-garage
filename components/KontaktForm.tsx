'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { sendKontakt } from '@/app/kontakt/actions';
import { useOrdbog } from '@/lib/i18n/klient';

const EMNE_MAKS = 160;
const BESKED_MAKS = 4000;

export default function KontaktForm({
  svarMailStandard = '',
}: {
  // Brugerens konto-mail som forvalgt svar-mail (kan ryddes/aendres).
  svarMailStandard?: string;
}) {
  const t = useOrdbog();
  const k = t.kontakt;
  const [emne, setEmne] = useState('');
  const [besked, setBesked] = useState('');
  const [svarMail, setSvarMail] = useState(svarMailStandard);
  const [fejl, setFejl] = useState<string | null>(null);
  const [sendt, setSendt] = useState(false);
  const [pending, start] = useTransition();

  function send() {
    setFejl(null);
    const e = emne.trim();
    const b = besked.trim();
    if (!e || !b) {
      setFejl(k.udfyldBegge);
      return;
    }
    start(async () => {
      try {
        await sendKontakt(e, b, svarMail);
        setSendt(true);
      } catch (err: any) {
        setFejl(err?.message ?? t.faellesFejl.nogetGikGalt);
      }
    });
  }

  if (sendt) {
    return (
      <div className="rounded-xl border border-kobber-200 bg-kobber-50 p-5">
        <p className="font-semibold text-grafit-900">{k.takSendt}</p>
        <p className="mt-1 text-sm text-grafit-600">{k.sendtTekst(svarMail.trim() || null)}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="btn-ghost text-sm"
            onClick={() => {
              setEmne('');
              setBesked('');
              setSendt(false);
            }}
          >
            {k.skrivEnTil}
          </button>
          <Link href="/" className="btn-ghost text-sm">
            {k.tilForsiden}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="kontakt-emne">
          {k.emne}
        </label>
        <input
          id="kontakt-emne"
          className="input"
          value={emne}
          maxLength={EMNE_MAKS}
          placeholder={k.emnePh}
          disabled={pending}
          onChange={(e) => setEmne(e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="kontakt-besked">
          {k.besked}
        </label>
        <textarea
          id="kontakt-besked"
          className="input min-h-[160px] resize-y"
          value={besked}
          maxLength={BESKED_MAKS}
          placeholder={k.beskedPh}
          disabled={pending}
          onChange={(e) => setBesked(e.target.value)}
        />
        <p className="mt-1 text-right text-xs text-grafit-400">
          {besked.length}/{BESKED_MAKS}
        </p>
      </div>

      <div>
        <label className="label" htmlFor="kontakt-mail">
          {k.svarMail} <span className="font-normal text-grafit-400">{t.faellesFejl.valgfri}</span>
        </label>
        <input
          id="kontakt-mail"
          type="email"
          className="input"
          value={svarMail}
          maxLength={200}
          placeholder={k.svarMailPh}
          disabled={pending}
          onChange={(e) => setSvarMail(e.target.value)}
        />
        <p className="mt-1 text-xs text-grafit-400">
          {k.svarMailHjaelp}
        </p>
      </div>

      {fejl && <p className="text-sm text-kobber-700">{fejl}</p>}

      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending} onClick={send}>
          {pending ? k.sender : k.send}
        </button>
      </div>
    </div>
  );
}
