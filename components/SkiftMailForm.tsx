'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useOrdbog } from '@/lib/i18n/klient';
import { gotrueFejl } from '@/lib/gotrue-fejl';
import type { Ordbog } from '@/lib/i18n';

// Simpel mail-validering (ikke perfekt, men fanger de åbenlyse fejl).
const MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GoTrue svarer på engelsk -> stabil nøgle (lib/gotrue-fejl.ts) -> ordbogen.
// "findes allerede" har sin egen mail-skift-ordlyd (ikke signup'ens "log ind i
// stedet"). Gemmes som en vælger, så en synlig fejl skifter med sproget.
type FejlFn = (t: Ordbog) => string;
function fejlFra(err: unknown): FejlFn {
  const n = gotrueFejl(err as { message?: string; code?: string });
  if (n === 'findesAllerede') return (t) => t.garage.mailIBrug;
  if (n === 'mailUgyldig' || n === 'forMange' || n === 'sammeMail') return (t) => t.konto.gotrue[n];
  return (t) => t.garage.kunneIkkeSendeBekraeftelse;
}

export default function SkiftMailForm({ nuvaerende }: { nuvaerende: string }) {
  const t = useOrdbog();
  const g = t.garage;
  const [mail, setMail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sendt, setSendt] = useState(false);
  const [fejlFn, setFejlFn] = useState<FejlFn | null>(null);
  const fejl = fejlFn ? fejlFn(t) : '';
  const setFejl = (f: FejlFn | null) => setFejlFn(() => f);

  const renset = mail.trim().toLowerCase();

  async function skift() {
    setFejl(null);
    setSendt(false);
    if (!MAIL.test(renset)) return setFejl((o) => o.garage.ugyldigMail);
    if (renset === nuvaerende.trim().toLowerCase())
      return setFejl((o) => o.konto.gotrue.sammeMail);
    setBusy(true);
    try {
      const sb = supabaseBrowser();
      const { error } = await sb.auth.updateUser(
        { email: renset },
        { emailRedirectTo: `${window.location.origin}/auth/confirm?next=/garage` },
      );
      if (error) throw error;
      setSendt(true);
      setMail('');
    } catch (e: any) {
      setFejl(fejlFra(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kort mt-6 space-y-4 p-6">
      <div>
        <label className="label" htmlFor="ny-mail">
          {g.email}
        </label>
        <p className="mb-2 text-sm text-grafit-600">
          {g.nuvaerende} <span className="font-medium text-grafit-800">{nuvaerende}</span>
        </p>
        <input
          id="ny-mail"
          type="email"
          className="input"
          value={mail}
          onChange={(e) => {
            setMail(e.target.value);
            setSendt(false);
          }}
          placeholder={g.nyMailPh}
          autoComplete="email"
        />
      </div>

      {sendt ? (
        <p className="rounded-lg bg-loest/10 px-3 py-2 text-sm text-grafit-700 ring-1 ring-inset ring-loest/25">
          {g.mailSendtFoer}
          <b>{g.mailSendtNye}</b>
          {g.mailSendtEfter}
        </p>
      ) : (
        <p className="text-xs text-grafit-500">{g.mailHjaelp}</p>
      )}

      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={busy || !renset} onClick={skift}>
          {busy ? g.sender : g.skiftMail}
        </button>
        {fejl && <span className="text-sm text-kobber-700">{fejl}</span>}
      </div>
    </div>
  );
}
