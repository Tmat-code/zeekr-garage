'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

const MIN = 2;
const MAX = 40;

export default function VisningsnavnForm({ initial }: { initial: string }) {
  const router = useRouter();
  const [navn, setNavn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [gemt, setGemt] = useState(false);
  const [fejl, setFejl] = useState('');

  const renset = navn.trim();
  const uaendret = renset === initial.trim();

  async function gem() {
    setFejl('');
    setGemt(false);
    if (renset.length < MIN) return setFejl(`Navnet skal være mindst ${MIN} tegn.`);
    if (renset.length > MAX) return setFejl(`Navnet må højst være ${MAX} tegn.`);
    setBusy(true);
    try {
      const sb = supabaseBrowser();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) throw new Error('ingen bruger');
      const { error } = await sb
        .from('profiles')
        .update({ display_name: renset })
        .eq('id', user.id);
      if (error) throw error;
      setNavn(renset);
      setGemt(true);
      router.refresh();
    } catch (e: any) {
      setFejl(e?.message ?? 'Kunne ikke gemme.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kort mt-6 space-y-4 p-6">
      <div>
        <label className="label" htmlFor="visningsnavn">
          Dit navn
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
          placeholder="Fx Venø"
          autoComplete="off"
        />
      </div>
      <p className="text-xs text-grafit-500">
        Sådan vises du overalt - på tråde, svar og meldinger. Din mail vises aldrig offentligt.
        Ændrer du navnet, slår det igennem alle steder med det samme.
      </p>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={busy || uaendret} onClick={gem}>
          {busy ? 'Gemmer…' : 'Gem navn'}
        </button>
        {gemt && <span className="text-sm text-loest">Gemt.</span>}
        {fejl && <span className="text-sm text-kobber-700">{fejl}</span>}
      </div>
    </div>
  );
}
