'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { relativTid } from '@/lib/tid';
import type { ForumIndlaeg } from '@/lib/types';
import GarageBadge from '@/components/forum/GarageBadge';
import Avatar from '@/components/forum/Avatar';
import BilledeUpload from '@/components/forum/BilledeUpload';
import BilledeGalleri from '@/components/BilledeGalleri';
import { MAKS_ANTAL, forumBilledeUrl } from '@/lib/billeder';
import { svar, retIndlaeg, fjernIndlaeg, modFjernIndlaeg, modFjernAvatar } from '@/app/forum/actions';
import { startSamtaleMedBruger } from '@/app/beskeder/actions';
import GrundVaelger from '@/components/forum/GrundVaelger';
import RapporterKnap from '@/components/forum/RapporterKnap';

function IndlaegKort({
  p,
  kategoriSlug,
  traadSlug,
  megId,
  erModerator,
  isLoggedIn,
  kanSvare,
  koer,
  skrivTil,
  onSvar,
  pending,
}: {
  p: ForumIndlaeg;
  kategoriSlug: string;
  traadSlug: string;
  megId: string | null;
  erModerator: boolean;
  isLoggedIn: boolean;
  kanSvare: boolean;
  koer: (fn: () => Promise<void>) => void;
  skrivTil: (authorId: string) => void;
  onSvar: () => void;
  pending: boolean;
}) {
  const [redigerer, setRedigerer] = useState(false);
  const [modFjerner, setModFjerner] = useState(false);
  const [modFjernerAvatar, setModFjernerAvatar] = useState(false);
  const [tekst, setTekst] = useState(p.body);
  // Billed-redigering: paths markeret til fjernelse + netop uploadede nye paths.
  const [fjernede, setFjernede] = useState<string[]>([]);
  const [nyeBilleder, setNyeBilleder] = useState<string[]>([]);
  const [uploadNulstil, setUploadNulstil] = useState(0);
  const minEgen = !!megId && p.authorId === megId;
  const kanRette = minEgen || erModerator;
  // Åbnings-indlægget fjernes ikke her (brug "Fjern tråd" i moderering).
  // Egen sletning = plain (ingen grund/notif). Moderator-fjern af ANDRES indlæg
  // kræver grund + giver forfatteren en officiel notifikation (P21).
  const kanEgenFjern = minEgen && !p.isOpening;
  const kanModFjern = erModerator && !minEgen && !p.isOpening;
  // Skriv privat til forfatteren (ikke dig selv, kun indlogget).
  const kanSkrive = isLoggedIn && !!p.authorId && !minEgen;
  // Rapportér: almindelig indlogget bruger, ikke eget indhold, ikke moderator
  // (moderatorer handler direkte). Åbnings-indlæg rapporterer hele tråden.
  const kanRapportere = isLoggedIn && !!p.authorId && !minEgen && !erModerator;
  // Moderator: fjern en upassende avatar (handling-med-grund, notif til bruger).
  const kanFjernAvatar = erModerator && !minEgen && !!p.authorId && !!p.avatar;

  // Kun forfatteren kan tilføje NYE billeder (RLS: insert kræver eget indlæg).
  // Moderator kan stadig fjerne eksisterende (RLS: slet eget/moderator).
  const kanTilfoeje = minEgen;
  const beholdtePaths = p.billederPaths.filter((path) => !fjernede.includes(path));
  const restPlads = Math.max(0, MAKS_ANTAL - beholdtePaths.length);
  const harIndhold = tekst.trim().length > 0 || beholdtePaths.length + nyeBilleder.length > 0;
  const kanGemme = p.isOpening ? tekst.trim().length > 0 : harIndhold;

  function nulstilRedigering() {
    setTekst(p.body);
    setFjernede([]);
    setNyeBilleder([]);
    setUploadNulstil((n) => n + 1);
    setRedigerer(false);
  }

  return (
    <div
      className={`rounded-xl border p-4 ${
        p.isOpening ? 'border-grafit-200 bg-white' : 'border-grafit-200 bg-white'
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Avatar url={p.avatar} navn={p.forfatter} px={32} className="mr-0.5" />
        <span className="font-medium text-grafit-900">{p.forfatter || 'Ejer'}</span>
        <GarageBadge bil={p.bil} />
        <span className="text-xs text-grafit-400">
          {relativTid(p.createdAt)}
          {p.edited && ' · redigeret'}
        </span>
      </div>

      {/* "@Navn" når dette undersvar svarer et andet undersvar */}
      {p.svarTilNavn && !redigerer && (
        <p className="mt-1 text-xs text-grafit-400">
          svarer <span className="font-medium text-grafit-500">@{p.svarTilNavn}</span>
        </p>
      )}

      {redigerer ? (
        <div className="mt-2 space-y-2">
          <textarea
            className="input min-h-[100px]"
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            placeholder={p.isOpening ? 'Trådens tekst…' : 'Skriv et svar…'}
          />

          {/* Eksisterende billeder - klik × for at markere til fjernelse */}
          {p.billederPaths.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {p.billederPaths.map((path) => {
                const markeret = fjernede.includes(path);
                return (
                  <div key={path} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={forumBilledeUrl(path)}
                      alt="Vedhæftet billede"
                      className={`h-16 w-16 rounded-lg border border-grafit-200 object-cover transition ${
                        markeret ? 'opacity-30 grayscale' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFjernede((f) =>
                          markeret ? f.filter((x) => x !== path) : [...f, path],
                        )
                      }
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-grafit-900 text-xs leading-none text-white"
                      aria-label={markeret ? 'Fortryd fjern billede' : 'Fjern billede'}
                    >
                      {markeret ? '↺' : '×'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tilføj nye billeder (kun forfatteren; op til resterende plads) */}
          {kanTilfoeje &&
            (restPlads > 0 ? (
              <BilledeUpload
                key={uploadNulstil}
                onChange={setNyeBilleder}
                disabled={pending}
                maksAntal={restPlads}
              />
            ) : (
              <p className="text-xs text-grafit-400">Maks {MAKS_ANTAL} billeder pr. indlæg.</p>
            ))}

          <div className="flex items-center gap-2">
            <button
              className="btn-primary !py-1.5 text-sm"
              disabled={pending || !kanGemme}
              onClick={() =>
                koer(async () => {
                  await retIndlaeg(
                    p.id,
                    kategoriSlug,
                    traadSlug,
                    tekst,
                    fjernede,
                    nyeBilleder,
                  );
                  setFjernede([]);
                  setNyeBilleder([]);
                  setUploadNulstil((n) => n + 1);
                  setRedigerer(false);
                })
              }
            >
              Gem
            </button>
            <button className="btn-ghost !py-1.5 text-sm" onClick={nulstilRedigering}>
              Annullér
            </button>
          </div>
        </div>
      ) : (
        p.body && <p className="mt-2 whitespace-pre-line text-grafit-800">{p.body}</p>
      )}

      {!redigerer && p.billeder.length > 0 && (
        <div className="mt-2">
          <BilledeGalleri billeder={p.billeder} alt="Billede i indlæg" />
        </div>
      )}

      {!redigerer && (kanSvare || kanRette || kanSkrive || kanRapportere || kanFjernAvatar) && (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          {kanSvare && (
            <button
              className="font-medium text-kobber-700 hover:text-kobber-800"
              disabled={pending}
              onClick={onSvar}
            >
              ↩ Svar
            </button>
          )}
          {kanRette && (
            <button
              className="text-grafit-500 hover:text-kobber-700"
              onClick={() => setRedigerer(true)}
            >
              ✏️ Ret
            </button>
          )}
          {kanEgenFjern && (
            <button
              className="text-grafit-500 hover:text-kobber-700"
              disabled={pending}
              onClick={() => {
                if (confirm('Fjern dette indlæg?')) {
                  koer(() => fjernIndlaeg(p.id, kategoriSlug, traadSlug));
                }
              }}
            >
              🗑 Fjern
            </button>
          )}
          {kanModFjern && (
            <button
              className="text-grafit-500 hover:text-kobber-700"
              disabled={pending}
              onClick={() => setModFjerner((v) => !v)}
            >
              🗑 Fjern
            </button>
          )}
          {kanFjernAvatar && (
            <button
              className="text-grafit-500 hover:text-kobber-700"
              disabled={pending}
              onClick={() => setModFjernerAvatar((v) => !v)}
            >
              🧑 Fjern avatar
            </button>
          )}
          {kanSkrive && (
            <button
              className="text-grafit-500 hover:text-kobber-700"
              disabled={pending}
              onClick={() => skrivTil(p.authorId!)}
            >
              ✉️ Skriv
            </button>
          )}
          {kanRapportere && (
            <RapporterKnap
              threadId={p.isOpening ? p.threadId : null}
              postId={p.isOpening ? null : p.id}
            />
          )}
        </div>
      )}

      {/* Moderator fjerner ANDRES indlæg med grund -> forfatteren notificeres. */}
      {!redigerer && kanModFjern && modFjerner && (
        <GrundVaelger
          pending={pending}
          submitLabel="Fjern indlæg + giv besked"
          onCancel={() => setModFjerner(false)}
          onSubmit={(grund, fritekst) =>
            koer(async () => {
              await modFjernIndlaeg(p.id, kategoriSlug, traadSlug, grund, fritekst);
              setModFjerner(false);
            })
          }
        />
      )}

      {/* Moderator fjerner en upassende avatar med grund -> brugeren notificeres. */}
      {!redigerer && kanFjernAvatar && modFjernerAvatar && (
        <GrundVaelger
          pending={pending}
          submitLabel="Fjern avatar + giv besked"
          onCancel={() => setModFjernerAvatar(false)}
          onSubmit={(grund, fritekst) =>
            koer(async () => {
              await modFjernAvatar(p.authorId!, kategoriSlug, traadSlug, grund, fritekst);
              setModFjernerAvatar(false);
            })
          }
        />
      )}
    </div>
  );
}

export default function ForumTraad({
  threadId,
  kategoriSlug,
  traadSlug,
  indlaeg,
  megId,
  erModerator,
  isLoggedIn,
  isLocked,
  naeste,
}: {
  threadId: string;
  kategoriSlug: string;
  traadSlug: string;
  indlaeg: ForumIndlaeg[];
  megId: string | null;
  erModerator: boolean;
  isLoggedIn: boolean;
  isLocked: boolean;
  naeste: string;
}) {
  const [ny, setNy] = useState('');
  const [svarBilleder, setSvarBilleder] = useState<string[]>([]);
  const [billedNulstil, setBilledNulstil] = useState(0);
  const [fejl, setFejl] = useState<string | null>(null);
  // Hvilket indlæg svarer vi på? null = top-svar til tråden.
  const [svarTil, setSvarTil] = useState<{ id: string; navn: string } | null>(null);
  const [pending, start] = useTransition();
  const svarRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  function koer(fn: () => Promise<void>) {
    setFejl(null);
    start(async () => {
      try {
        await fn();
      } catch (e: any) {
        setFejl(e?.message ?? 'Noget gik galt.');
      }
    });
  }

  // Start (eller genåbn) en privat samtale med en forfatter og hop derhen.
  function skrivTil(authorId: string) {
    setFejl(null);
    start(async () => {
      try {
        const id = await startSamtaleMedBruger(authorId);
        router.push(`/beskeder/${id}`);
      } catch (e: any) {
        setFejl(e?.message ?? 'Kunne ikke starte samtalen.');
      }
    });
  }

  function send() {
    koer(async () => {
      await svar(threadId, kategoriSlug, traadSlug, ny, svarBilleder, svarTil?.id ?? null);
      setNy('');
      setSvarBilleder([]);
      setSvarTil(null);
      setBilledNulstil((n) => n + 1); // nulstil upload-komponenten
    });
  }

  // Sæt svar-mål og flyt fokus til skrivefeltet nederst.
  function startSvar(id: string, navn: string) {
    if (isLocked || !isLoggedIn) return;
    setSvarTil({ id, navn });
    requestAnimationFrame(() => {
      svarRef.current?.focus();
      svarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  const grundKanSvare = isLoggedIn && !isLocked;

  // Ét niveau (FB): åbning + top-svar, med undersvar grupperet under hvert top-svar.
  const aabning = indlaeg.find((p) => p.isOpening) ?? null;
  const topSvar = indlaeg
    .filter((p) => !p.isOpening && !p.parentId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const underSvarAf = (id: string) =>
    indlaeg
      .filter((p) => p.parentId === id && !p.isRemoved)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const antalSvar = indlaeg.filter((p) => !p.isOpening && !p.isRemoved).length;

  const kort = (p: ForumIndlaeg) => (
    <IndlaegKort
      key={p.id}
      p={p}
      kategoriSlug={kategoriSlug}
      traadSlug={traadSlug}
      megId={megId}
      erModerator={erModerator}
      isLoggedIn={isLoggedIn}
      kanSvare={grundKanSvare}
      koer={koer}
      skrivTil={skrivTil}
      onSvar={() => startSvar(p.id, p.forfatter || 'Ejer')}
      pending={pending}
    />
  );

  return (
    <div className="mt-6">
      <div className="space-y-3">
        {aabning && kort(aabning)}
        {topSvar.map((t) => {
          const boern = underSvarAf(t.id);
          if (t.isRemoved && boern.length === 0) return null; // fjernet uden undersvar: væk
          return (
            <div key={t.id} className="space-y-3">
              {t.isRemoved ? (
                <div className="rounded-xl border border-dashed border-grafit-200 bg-grafit-50 px-4 py-3 text-sm text-grafit-400">
                  🚫 Svar fjernet
                </div>
              ) : (
                kort(t)
              )}
              {boern.length > 0 && (
                <div className="ml-5 space-y-3 border-l-2 border-grafit-100 pl-3 sm:ml-8 sm:pl-4">
                  {boern.map((c) => kort(c))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Svar-felt */}
      <div className="mt-5">
        <h2 className="mb-2 text-sm font-semibold text-grafit-700">
          {antalSvar === 0 ? 'Vær den første der svarer' : `Svar (${antalSvar})`}
        </h2>
        {isLocked ? (
          <div className="rounded-xl border border-grafit-200 bg-grafit-50 px-4 py-3 text-sm text-grafit-500">
            🔒 Tråden er låst - der kan ikke skrives flere svar.
          </div>
        ) : isLoggedIn ? (
          <div className="space-y-2">
            {svarTil && (
              <div className="flex items-center gap-2 rounded-lg border border-kobber-200 bg-kobber-50 px-3 py-1.5 text-sm text-grafit-700">
                <span>
                  Svarer <span className="font-medium">{svarTil.navn}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSvarTil(null)}
                  className="ml-auto text-grafit-400 hover:text-kobber-700"
                  aria-label="Annullér svar-mål"
                >
                  × Svar til hele tråden
                </button>
              </div>
            )}
            <textarea
              ref={svarRef}
              className="input min-h-[100px]"
              value={ny}
              onChange={(e) => setNy(e.target.value)}
              placeholder={svarTil ? `Svar til ${svarTil.navn}…` : 'Skriv et svar…'}
            />
            <BilledeUpload key={billedNulstil} onChange={setSvarBilleder} disabled={pending} />
            <div className="flex items-center gap-3">
              <button
                className="btn-primary !py-2 text-sm"
                disabled={pending || (!ny.trim() && svarBilleder.length === 0)}
                onClick={send}
              >
                Send svar
              </button>
              {fejl && <span className="text-sm text-kobber-700">{fejl}</span>}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-grafit-200 bg-grafit-50 px-4 py-3 text-sm text-grafit-600">
            <Link
              href={`/login?naeste=${encodeURIComponent(naeste)}`}
              className="font-medium text-kobber-700 hover:underline"
            >
              Log ind
            </Link>{' '}
            for at svare.
          </div>
        )}
      </div>
    </div>
  );
}
