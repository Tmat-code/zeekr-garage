'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useOrdbog } from '@/lib/i18n/klient';

type Fejl = 'navnForKort' | 'navnForLangt' | 'kunneIkkeGemme';

const MIN = 2;
const MAX = 40;

export default function VisningsnavnForm({ initial }: { initial: string }) {
  const router = useRouter();
  const g = useOrdbog().garage;
  const [navn, setNavn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [gemt, setGemt] = useState(false);
  const [fejlN, setFejl] = useState<Fejl | null>(null);
  const fejl =
    fejlN === 'navnForKort' ? g.navnForKort(MIN) : fejlN === 'navnForLangt' ? g.navnForLangt(MAX) : fejlN ? g[fejlN] : '';

  const renset = navn.trim();
  const uaendret = renset === initial.trim();

  async function gem() {
    setFejl(null);
    setGemt(false);
    if (renset.length < MIN) return setFejl('navnForKort');
    if (renset.length > MAX) return setFejl('navnForLangt');
    setBusy(true);
    try {
      const sb = supabaseBrowser();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) throw new Error('ingen bruger'); // i18n-ok
      const { error } = await sb
        .from('profiles')
        .update({ display_name: renset })
        .eq('id', user.id);
      if (error) throw error;
      setNavn(renset);
      setGemt(true);
      router.refresh();
    } catch (e: any) {
      console.error('Gem visningsnavn:', e?.message ?? e);
      setFejl('kunneIkkeGemme');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kort mt-6 space-y-4 p-6">
      <div>
        <label className="label" htmlFor="visningsnavn">
          {g.ditNavn}
        </label>
        <input
          id="visningsnavn"
          type="text"
          className="input"
          value={navn}
          maxLength={MAX}
          onChange={(e) => {
            setNavn(e.target.value);
            setGemt(false);
          }}
          placeholder={g.navnPh}
          autoComplete="off"
        />
      </div>
      <p className="text-xs text-grafit-500">{g.navnHjaelp}</p>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={busy || uaendret} onClick={gem}>
          {busy ? g.gemmer : g.gemNavn}
        </button>
        {gemt && <span className="text-sm text-loest">{g.gemt}</span>}
        {fejl && <span className="text-sm text-kobber-700">{fejl}</span>}
      </div>
    </div>
  );
}
