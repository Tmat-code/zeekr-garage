'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { Model, VariantMap } from '@/lib/types';
import BilVaelger, { type BilValg } from '@/components/BilVaelger';

type Mode = 'ind' | 'opret' | 'glemt';

export default function LoginForm({
  models,
  varianter,
}: {
  models: Model[];
  varianter: VariantMap;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const naeste = params.get('naeste') || '/';

  const [mode, setMode] = useState<Mode>('ind');
  const [email, setEmail] = useState('');
  const [kode, setKode] = useState('');
  const [navn, setNavn] = useState('');
  const [bil, setBil] = useState<BilValg>({ modelId: '', variantId: '', ejerIkke: false });
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
        // Neutral besked - afsloerer ikke om mailen findes.
        setInfo('Hvis der findes en konto på den mail, har vi sendt et nulstillingslink. Tjek din indbakke.');
        setBusy(false);
        return;
      }

      if (kode.length < 6) {
        setBusy(false);
        return setFejl('Adgangskode skal være mindst 6 tegn.');
      }

      if (mode === 'opret') {
        // Bil-valg skal udfyldes (medmindre "ejer ikke endnu").
        const varianterForModel = bil.modelId ? (varianter[bil.modelId] ?? []) : [];
        if (!bil.ejerIkke) {
          if (!bil.modelId) {
            setBusy(false);
            return setFejl('Vælg din model - eller markér "Ejer ikke en Zeekr endnu".');
          }
          if (varianterForModel.length > 1 && !bil.variantId) {
            setBusy(false);
            return setFejl('Vælg din variant.');
          }
        }

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
          setInfo('Konto oprettet - tjek din mail for at bekræfte, så er du klar.');
          setBusy(false);
          return;
        }
        // Gem bilen (hvis ejer): én raekke i cars (kilden til alle biler) +
        // samme bil som profilens primaere bil (den der vises i garage-badget).
        if (!bil.ejerIkke && bil.modelId && data.user) {
          const variantId = bil.variantId || varianterForModel[0]?.id || null;
          await sb
            .from('cars')
            .insert({ owner_id: data.user.id, model_id: bil.modelId, variant_id: variantId });
          await sb
            .from('profiles')
            .update({ car_model_id: bil.modelId, car_variant_id: variantId })
            .eq('id', data.user.id);
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
        <>
          <div>
            <label htmlFor="navn" className="label">Visningsnavn</label>
            <input id="navn" value={navn} onChange={(e) => setNavn(e.target.value)} placeholder="Sådan vises du i community'et" className="input" />
          </div>

          <div>
            <label className="label">Din bil</label>
            <BilVaelger models={models} varianter={varianter} value={bil} onChange={setBil} />
            <p className="mt-2 text-xs text-grafit-500">
              Hvorfor spørger vi? Din bil knytter dine &quot;mig med&quot;-stemmer til en rigtig
              model og variant, så fejl-rapporterne til Zeekr bliver præcise. Ejer du ikke en Zeekr
              endnu, kan du stadig læse og følge med - du kan bare ikke stemme, før din bil er
              registreret. Du kan altid rette den under Min garage.
            </p>
          </div>
        </>
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
