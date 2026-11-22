'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

// Simpel mail-validering (ikke perfekt, men fanger de åbenlyse fejl).
const MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SkiftMailForm({ nuvaerende }: { nuvaerende: string }) {
  const [mail, setMail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sendt, setSendt] = useState(false);
  const [fejl, setFejl] = useState('');

  const renset = mail.trim().toLowerCase();

  async function skift() {
    setFejl('');
    setSendt(false);
    if (!MAIL.test(renset)) return setFejl('Skriv en gyldig e-mailadresse.');
    if (renset === nuvaerende.trim().toLowerCase())
      return setFejl('Det er din nuværende mail.');
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
      setFejl(e?.message ?? 'Kunne ikke sende bekræftelse.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kort mt-6 space-y-4 p-6">
      <div>
        <label className="label" htmlFor="ny-mail">
          E-mail
        </label>
        <p className="mb-2 text-sm text-grafit-600">
          Nuværende: <span className="font-medium text-grafit-800">{nuvaerende}</span>
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
          placeholder="ny@mail.dk"
          autoComplete="email"
        />
      </div>

      {sendt ? (
        <p className="rounded-lg bg-loest/10 px-3 py-2 text-sm text-grafit-700 ring-1 ring-inset ring-loest/25">
          Vi har sendt et bekræftelses-link til <b>begge</b> adresser - både din nuværende og den
          nye. Mailen skifter først når <b>begge</b> links er klikket. Tjek evt. spam.
        </p>
      ) : (
        <p className="text-xs text-grafit-500">
          Af sikkerhed skifter mailen ikke med det samme: du får et bekræftelses-link på både din
          nuværende og din nye adresse, og begge skal bekræftes. Du er stadig logget ind imens.
        </p>
      )}

      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={busy || !renset} onClick={skift}>
          {busy ? 'Sender…' : 'Skift e-mail'}
        </button>
        {fejl && <span className="text-sm text-kobber-700">{fejl}</span>}
      </div>
    </div>
  );
}
