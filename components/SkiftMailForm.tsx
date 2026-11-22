'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

// Simpel mail-validering (ikke perfekt, men fanger de åbenlyse fejl).
const MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GoTrue svarer på engelsk - oversæt de almindelige fejl til dansk.
function fejlPaaDansk(besked: string): string {
  const b = besked.toLowerCase();
  if (b.includes('already been registered') || b.includes('already registered') || b.includes('already in use'))
    return 'Den e-mailadresse er allerede i brug.';
  if (b.includes('invalid') && b.includes('email')) return 'E-mailadressen er ugyldig.';
  if (b.includes('rate limit') || b.includes('for security purposes'))
    return 'Der er sendt for mange forsøg - prøv igen om lidt.';
  if (b.includes('same') && b.includes('email')) return 'Det er din nuværende mail.';
  return 'Kunne ikke sende bekræftelse. Prøv igen.';
}

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
      setFejl(fejlPaaDansk(e?.message ?? ''));
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
          Vi har sendt et bekræftelses-link til din <b>nye</b> adresse. Mailen skifter først når du
          har klikket linket. Tjek evt. spam.
        </p>
      ) : (
        <p className="text-xs text-grafit-500">
          Af sikkerhed skifter mailen ikke med det samme: du får et bekræftelses-link på din nye
          adresse, og mailen skifter først når du har klikket det. Du er stadig logget ind imens.
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
