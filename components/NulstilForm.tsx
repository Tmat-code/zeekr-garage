'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

// Brugeren lander her efter at have klikket reset-linket i mailen:
// /auth/callback har byttet koden til en (recovery-)session, saa her kan vi
// saette et nyt password med updateUser.
export default function NulstilForm() {
  const router = useRouter();
  const [harSession, setHarSession] = useState<boolean | null>(null);
  const [kode, setKode] = useState('');
  const [kode2, setKode2] = useState('');
  const [fejl, setFejl] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sb = supabaseBrowser();
    sb.auth.getSession().then(({ data }) => setHarSession(!!data.session));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFejl('');
    if (kode.length < 6) return setFejl('Password skal være mindst 6 tegn.');
    if (kode !== kode2) return setFejl('De to felter er ikke ens.');

    setBusy(true);
    try {
      const sb = supabaseBrowser();
      const { error } = await sb.auth.updateUser({ password: kode });
      if (error) throw error;
      setInfo('Dit password er opdateret. Sender dig videre…');
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1200);
    } catch {
      setFejl('Kunne ikke opdatere password. Linket kan være udløbet — bed om et nyt fra login-siden.');
      setBusy(false);
    }
  }

  if (harSession === null) {
    return <p className="mt-6 text-sm text-grafit-500">Et øjeblik…</p>;
  }

  if (!harSession) {
    return (
      <div className="kort mt-6 p-6">
        <p className="text-grafit-700">Linket er udløbet eller ugyldigt.</p>
        <a
          href="/login"
          className="mt-3 inline-block text-sm font-medium text-kobber-700 hover:underline"
        >
          Tilbage til login
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="kort mt-6 flex flex-col gap-4 p-6">
      <div>
        <label htmlFor="kode" className="label">Nyt password</label>
        <input id="kode" type="password" value={kode} onChange={(e) => setKode(e.target.value)} placeholder="Mindst 6 tegn" className="input" />
      </div>
      <div>
        <label htmlFor="kode2" className="label">Gentag password</label>
        <input id="kode2" type="password" value={kode2} onChange={(e) => setKode2(e.target.value)} placeholder="Skriv det igen" className="input" />
      </div>

      {fejl && <p className="text-sm font-medium text-kobber-700">{fejl}</p>}
      {info && <p className="text-sm font-medium text-loest">{info}</p>}

      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? 'Vent…' : 'Gem nyt password'}
      </button>
    </form>
  );
}
