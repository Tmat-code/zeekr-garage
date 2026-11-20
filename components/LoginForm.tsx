'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const naeste = params.get('naeste') || '/';

  const [mode, setMode] = useState<'ind' | 'opret'>('ind');
  const [email, setEmail] = useState('');
  const [kode, setKode] = useState('');
  const [navn, setNavn] = useState('');
  const [fejl, setFejl] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFejl('');
    setInfo('');
    if (!email.includes('@')) return setFejl('Skriv en gyldig e-mail.');
    if (kode.length < 6) return setFejl('Adgangskode skal være mindst 6 tegn.');

    setBusy(true);
    try {
      const sb = supabaseBrowser();
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
          : 'Kunne ikke logge ind. Prøv igen.',
      );
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="kort mt-6 flex flex-col gap-4 p-6">
      <div className="flex gap-1 rounded-lg bg-grafit-100 p-1">
        <button
          type="button"
          onClick={() => setMode('ind')}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${mode === 'ind' ? 'bg-white text-grafit-900 shadow-sm' : 'text-grafit-500'}`}
        >
          Log ind
        </button>
        <button
          type="button"
          onClick={() => setMode('opret')}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${mode === 'opret' ? 'bg-white text-grafit-900 shadow-sm' : 'text-grafit-500'}`}
        >
          Opret konto
        </button>
      </div>

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

      <div>
        <label htmlFor="kode" className="label">Adgangskode</label>
        <input id="kode" type="password" value={kode} onChange={(e) => setKode(e.target.value)} placeholder="Mindst 6 tegn" className="input" />
      </div>

      {fejl && <p className="text-sm font-medium text-kobber-700">{fejl}</p>}
      {info && <p className="text-sm font-medium text-loest">{info}</p>}

      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? 'Vent…' : mode === 'opret' ? 'Opret konto' : 'Log ind'}
      </button>
      <p className="text-xs text-grafit-400">
        Du behøver kun en konto for at bidrage. Læsning er altid fri.
      </p>
    </form>
  );
}
