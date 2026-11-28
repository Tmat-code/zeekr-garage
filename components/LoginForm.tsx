'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { Model, VariantMap } from '@/lib/types';
import BilVaelger, { type BilValg } from '@/components/BilVaelger';
import { useOrdbog, useSprog } from '@/lib/i18n/klient';
import { gotrueFejl } from '@/lib/gotrue-fejl';
import { synkSprogVedLogin } from '@/app/sprog-actions';

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
  const sprog = useSprog();
  const t = useOrdbog();
  const k = t.konto;

  // Udloebet/brugt mail-link lander paa /login?fejl=... (fra /auth/confirm og
  // /auth/callback) - vis en venlig besked. Kun kendte koder; alt andet ignoreres.
  const fejlParam = params.get('fejl');
  const fejlKode =
    fejlParam === 'bekraeft' || fejlParam === 'reset' || fejlParam === 'mail' || fejlParam === 'link'
      ? fejlParam
      : null;

  const [mode, setMode] = useState<Mode>('ind');
  const [email, setEmail] = useState('');
  const [kode, setKode] = useState('');
  const [navn, setNavn] = useState('');
  const [bil, setBil] = useState<BilValg>({ modelId: '', variantId: '', ejerIkke: false });
  // Fejl gemmes som en "sprog-loes" vaelger, saa en synlig fejl skifter med,
  // hvis brugeren skifter sprog midt i formularen.
  const [fejlFn, setFejlFn] = useState<((o: typeof k) => string) | null>(() =>
    fejlKode ? (o: typeof k) => o.linkFejl[fejlKode] : null,
  );
  const [infoFn, setInfoFn] = useState<((o: typeof k) => string) | null>(null);
  const fejl = fejlFn ? fejlFn(k) : '';
  const info = infoFn ? infoFn(k) : '';
  const setFejl = (f: ((o: typeof k) => string) | null) => setFejlFn(() => f);
  const setInfo = (f: ((o: typeof k) => string) | null) => setInfoFn(() => f);
  const [busy, setBusy] = useState(false);

  function skift(m: Mode) {
    setMode(m);
    setFejl(null);
    setInfo(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFejl(null);
    setInfo(null);
    if (!email.includes('@')) return setFejl((o) => o.ugyldigMail);

    setBusy(true);
    try {
      const sb = supabaseBrowser();

      if (mode === 'glemt') {
        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?naeste=/nulstil`,
        });
        if (error) throw error;
        // Neutral besked - afsloerer ikke om mailen findes.
        setInfo((o) => o.nulstilSendt);
        setBusy(false);
        return;
      }

      if (kode.length < 6) {
        setBusy(false);
        return setFejl((o) => o.kodeForKort);
      }

      if (mode === 'opret') {
        // Bil-valg skal udfyldes (medmindre "ejer ikke endnu").
        const varianterForModel = bil.modelId ? (varianter[bil.modelId] ?? []) : [];
        if (!bil.ejerIkke) {
          if (!bil.modelId) {
            setBusy(false);
            return setFejl((o) => o.vaelgModelEllerEjerIkke);
          }
          if (varianterForModel.length > 1 && !bil.variantId) {
            setBusy(false);
            return setFejl((o) => o.vaelgVariant);
          }
        }

        // Bil-valget baeres i user-metadata, saa handle_new_user-triggeren kan
        // oprette bilen - ogsaa ved double opt-in, hvor der ingen session er.
        const bilModelId = !bil.ejerIkke && bil.modelId ? bil.modelId : null;
        const bilVariantId = bilModelId
          ? bil.variantId || varianterForModel[0]?.id || null
          : null;

        const { data, error } = await sb.auth.signUp({
          email,
          password: kode,
          options: {
            data: {
              // UI-sproget følger med fra første mail (U8 vælger skabelon ud fra det).
              sprog,
              display_name: navn.trim() || email.split('@')[0],
              car_model_id: bilModelId,
              car_variant_id: bilVariantId,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?naeste=${encodeURIComponent(naeste)}`,
          },
        });
        if (error) throw error;
        if (!data.session) {
          // Double opt-in: ingen session. Bilen gemmes af triggeren ud fra
          // metadata ovenfor.
          setInfo((o) => o.kontoOprettet);
          setBusy(false);
          return;
        }
        // Session findes (autoconfirm stadig slået til, eller endnu ikke
        // migreret trigger). Faldback: gem bilen klient-side, men KUN hvis
        // triggeren ikke allerede har gjort det - undgaar dobbelt bil.
        if (bilModelId && data.user) {
          const { data: eksisterende } = await sb
            .from('cars')
            .select('id')
            .eq('owner_id', data.user.id)
            .limit(1);
          if (!eksisterende || eksisterende.length === 0) {
            await sb
              .from('cars')
              .insert({ owner_id: data.user.id, model_id: bilModelId, variant_id: bilVariantId });
            await sb
              .from('profiles')
              .update({ car_model_id: bilModelId, car_variant_id: bilVariantId })
              .eq('id', data.user.id);
          }
        }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password: kode });
        if (error) throw error;
      }
      // Sprog-synk: profilens sprog -> cookien, eller (tom profil) cookien -> profilen.
      await synkSprogVedLogin().catch(() => {});
      router.push(naeste);
      router.refresh();
    } catch (err: any) {
      // GoTrue svarer paa engelsk -> stabil noegle -> ordbogen. Ukendt fejl:
      // kontekst-fallback (aldrig den raa engelske tekst).
      const noegle = gotrueFejl(err);
      setFejl((o) =>
        noegle
          ? o.gotrue[noegle]
          : mode === 'glemt'
            ? o.kunneIkkeSendeNulstil
            : mode === 'opret'
              ? o.kunneIkkeOprette
              : o.kunneIkkeLogge,
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
            {k.fanLogInd}
          </button>
          <button
            type="button"
            onClick={() => skift('opret')}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${mode === 'opret' ? 'bg-white text-grafit-900 shadow-sm' : 'text-grafit-500'}`}
          >
            {k.fanOpret}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => skift('ind')}
          className="self-start text-sm font-medium text-grafit-500 hover:text-kobber-700"
        >
          {k.tilbageTilLogin}
        </button>
      )}

      {mode === 'opret' && (
        <>
          <div>
            <label htmlFor="navn" className="label">{k.visningsnavn}</label>
            <input id="navn" value={navn} onChange={(e) => setNavn(e.target.value)} placeholder={k.visningsnavnPh} className="input" />
          </div>

          <div>
            <label className="label">{k.dinBil}</label>
            <BilVaelger models={models} varianter={varianter} value={bil} onChange={setBil} />
            <p className="mt-2 text-xs text-grafit-500">{k.hvorforBil}</p>
          </div>
        </>
      )}

      <div>
        <label htmlFor="email" className="label">{k.email}</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={k.emailPh} className="input" />
      </div>

      {mode !== 'glemt' && (
        <div>
          <label htmlFor="kode" className="label">{k.adgangskode}</label>
          <input id="kode" type="password" value={kode} onChange={(e) => setKode(e.target.value)} placeholder={k.adgangskodePh} className="input" />
          {mode === 'ind' && (
            <button
              type="button"
              onClick={() => skift('glemt')}
              className="mt-2 text-xs font-medium text-grafit-500 hover:text-kobber-700"
            >
              {k.glemt}
            </button>
          )}
        </div>
      )}

      {fejl && <p className="text-sm font-medium text-kobber-700">{fejl}</p>}
      {info && <p className="text-sm font-medium text-loest">{info}</p>}

      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? k.vent : mode === 'opret' ? k.opretKonto : mode === 'glemt' ? k.sendNulstil : k.logInd}
      </button>
      {mode !== 'glemt' && (
        <p className="text-xs text-grafit-400">{k.kunForAtBidrage}</p>
      )}
    </form>
  );
}
