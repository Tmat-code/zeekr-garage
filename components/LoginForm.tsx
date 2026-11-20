'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

type Mode = 'ind' | 'opret' | 'glemt';

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const naeste = params.get('naeste') || '/';

  const [mode, setMode] = useState<Mode>('ind');
  const [email, setEmail] = useState('');
  const [kode, setKode] = useState('');
  const [navn, setNavn] = useState('');
  const [fejl, setFejl] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  function skift(m: Mode) {
    setMode(m);
    setFejl('');
    setInfo('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFejl('');
    setInfo('');
    if (!email.includes('@')) return setFejl('Skriv en gyldig e-mail.');

    setBusy(true);
    try {
      const sb = supabaseBrowser();

      if (mode === 'glemt') {
        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?naeste=/nulstil`,
        });
        if (error) throw error;
        // Neutral besked — afsloerer ikke om mailen findes.
        setInfo('Hvis der findes en konto på den mail, har vi sendt et nulstillingslink. Tjek din indbakke.');
        setBusy(false);
        return;
      }

      if (kode.length < 6) {
        setBusy(false);
        return setFejl('Adgangskode skal være mindst 6 tegn.');
      }

      if (mode === 'opret') {
        const { data, error } = await sb.auth.signUp({
          email,
          password: kode,
          options: {
            data: { display_name: navn.trim() || email.split('@')[0] },
            emailRedirectTo: `${window.location.origin}/auth/callback?naeste=${encodeURIComponent(naeste)}`,
          },
        });
        if (error) throw error;
        if (!data.session) {
          setInfo('Konto oprettet — tjek din mail for at bekræfte, så er du klar.');
          setBusy(false);
          return;
        }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password: kode });
        if (error) throw error;
      }
      router.push(naeste);
      router.refresh();
    } catch (err: any) {
      setFejl(
        err?.message?.includes('Invalid login')
          ? 'Forkert e-mail eller adgangskode.'
          : mode === 'glemt'
            ? 'Kunne ikke sende nulstillingslink. Prøv igen.'
            : 'Kunne ikke logge ind. Prøv igen.',
      );
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="kort mt-6 flex flex-col gap-4 p-6">
      {mode !== 'glemt' ? (
        <div className="flex gap-1 rounded-lg bg-grafit-100 p-1">
          <button
            type="button"
            onClick={() => skift('ind')}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${mode === 'ind' ? 'bg-white text-grafit-900 shadow-sm' : 'text-grafit-500'}`}
          >
            Log ind
          </button>
          <button
            type="button"
            onClick={() => skift('opret')}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${mode === 'opret' ? 'bg-white text-grafit-900 shadow-sm' : 'text-grafit-500'}`}
          >
            Opret konto
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => skift('ind')}
          className="self-start text-sm font-medium text-grafit-500 hover:text-kobber-700"
        >
          ← Tilbage til login
        </button>
      )}

      {mode === 'opret' && (
        <div>
          <label htmlFor="navn" className="label">Visningsnavn</label>
          <input id="navn" value={navn} onChange={(e) => setNavn(e.target.value)} placeholder="Sådan vises du i community'et" className="input" />
        </div>
      )}

      <div>
        <label htmlFor="email" className="label">E-mail</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="dig@eksempel.dk" className="input" />
      </div>

      {mode !== 'glemt' && (
        <div>
          <label htmlFor="kode" className="label">Adgangskode</label>
          <input id="kode" type="password" value={kode} onChange={(e) => setKode(e.target.value)} placeholder="Mindst 6 tegn" className="input" />
          {mode === 'ind' && (
            <button
              type="button"
              onClick={() => skift('glemt')}
              className="mt-2 text-xs font-medium text-grafit-500 hover:text-kobber-700"
            >
              Glemt password?
            </button>
          )}
        </div>
      )}

      {fejl && <p className="text-sm font-medium text-kobber-700">{fejl}</p>}
      {info && <p className="text-sm font-medium text-loest">{info}</p>}

      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? 'Vent…' : mode === 'opret' ? 'Opret konto' : mode === 'glemt' ? 'Send nulstillingslink' : 'Log ind'}
      </button>
      {mode !== 'glemt' && (
        <p className="text-xs text-grafit-400">
          Du behøver kun en konto for at bidrage. Læsning er altid fri.
        </p>
      )}
    </form>
  );
}
