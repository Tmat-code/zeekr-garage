'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useOrdbog } from '@/lib/i18n/klient';
import { gotrueFejl, type GotrueFejl } from '@/lib/gotrue-fejl';

type Besked =
  | 'passwordForKort'
  | 'ikkeEns'
  | 'passwordOpdateret'
  | 'kunneIkkeOpdatere'
  | { gotrue: GotrueFejl };

// Brugeren lander her efter at have klikket reset-linket i mailen:
// /auth/callback har byttet koden til en (recovery-)session, saa her kan vi
// saette et nyt password med updateUser.
export default function NulstilForm() {
  const router = useRouter();
  const k = useOrdbog().konto;
  const [harSession, setHarSession] = useState<boolean | null>(null);
  const [kode, setKode] = useState('');
  const [kode2, setKode2] = useState('');
  // Noegler (ikke faerdig tekst), saa en synlig besked skifter med sproget.
  const [fejlN, setFejl] = useState<Besked | null>(null);
  const [infoN, setInfo] = useState<Besked | null>(null);
  const tekst = (b: Besked | null) =>
    b === null ? '' : typeof b === 'string' ? k[b] : k.gotrue[b.gotrue];
  const fejl = tekst(fejlN);
  const info = tekst(infoN);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sb = supabaseBrowser();
    sb.auth.getSession().then(({ data }) => setHarSession(!!data.session));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFejl(null);
    if (kode.length < 6) return setFejl('passwordForKort');
    if (kode !== kode2) return setFejl('ikkeEns');

    setBusy(true);
    try {
      const sb = supabaseBrowser();
      const { error } = await sb.auth.updateUser({ password: kode });
      if (error) throw error;
      setInfo('passwordOpdateret');
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1200);
    } catch (err: any) {
      // Kendte GoTrue-fejl (fx samme password som foer, for svagt) faar deres
      // egen tekst; alt andet den generiske "linket kan vaere udloebet".
      const n = gotrueFejl(err);
      setFejl(n && n !== 'forkertLogin' ? { gotrue: n } : 'kunneIkkeOpdatere');
      setBusy(false);
    }
  }

  if (harSession === null) {
    return <p className="mt-6 text-sm text-grafit-500">{k.etOejeblik}</p>;
  }

  if (!harSession) {
    return (
      <div className="kort mt-6 p-6">
        <p className="text-grafit-700">{k.nulstilLinkUdloebet}</p>
        <a
          href="/login"
          className="mt-3 inline-block text-sm font-medium text-kobber-700 hover:underline"
        >
          {k.tilbageTilLogin}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="kort mt-6 flex flex-col gap-4 p-6">
      <div>
        <label htmlFor="kode" className="label">{k.nytPassword}</label>
        <input id="kode" type="password" value={kode} onChange={(e) => setKode(e.target.value)} placeholder={k.adgangskodePh} className="input" />
      </div>
      <div>
        <label htmlFor="kode2" className="label">{k.gentagPassword}</label>
        <input id="kode2" type="password" value={kode2} onChange={(e) => setKode2(e.target.value)} placeholder={k.gentagPh} className="input" />
      </div>

      {fejl && <p className="text-sm font-medium text-kobber-700">{fejl}</p>}
      {info && <p className="text-sm font-medium text-loest">{info}</p>}

      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? k.vent : k.gemNytPassword}
      </button>
    </form>
  );
}
