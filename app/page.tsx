import Link from 'next/link';
import {
  getModels,
  getIssues,
  getCurrentUser,
  getForsideBesked,
} from '@/lib/queries';
import { TYPE_META } from '@/lib/config';

// Altid frisk fra databasen (offentlig læsning, ingen statisk caching).
export const dynamic = 'force-dynamic';

function kortModel(navn: string) {
  return navn.replace(/^Zeekr\s+/i, '');
}

export default async function Forside() {
  const [models, issues, user, besked] = await Promise.all([
    getModels(),
    getIssues(),
    getCurrentUser(),
    getForsideBesked(),
  ]);

  const tal = {
    meldinger: issues.length,
    bekraeftelser: issues.reduce((s, i) => s + i.confirmations, 0),
    modeller: models.length,
    sendt: issues.filter((i) => i.status === 'sendt_til_zeekr').length,
  };
  const seneste = issues.slice(0, 3);
  const forumModeller = models.length ? models : [];

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-grafit-950 text-white">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div
            className="absolute -right-32 -top-40 h-[32rem] w-[32rem] rounded-full"
            style={{ background: 'radial-gradient(closest-side, rgba(194,104,63,.38), rgba(194,104,63,0) 70%)' }}
          />
          <svg
            className="hero-streaks absolute inset-0 h-full w-full"
            viewBox="0 0 1200 560"
            preserveAspectRatio="xMidYMid slice"
            fill="none"
          >
            <defs>
              <linearGradient id="streak1" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#c2683f" stopOpacity="0" />
                <stop offset=".55" stopColor="#d67c4f" stopOpacity=".55" />
                <stop offset="1" stopColor="#e3a37e" stopOpacity=".95" />
              </linearGradient>
              <linearGradient id="streak2" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#8a4028" stopOpacity="0" />
                <stop offset="1" stopColor="#c2683f" stopOpacity=".7" />
              </linearGradient>
            </defs>
            <path d="M-50 150 L1250 60" stroke="url(#streak2)" strokeWidth="1.5" />
            <path d="M-50 250 L1250 150" stroke="url(#streak1)" strokeWidth="2.5" />
            <path d="M-50 330 L1250 250" stroke="url(#streak1)" strokeWidth="4" />
            <path d="M-50 430 L1250 360" stroke="url(#streak2)" strokeWidth="2" />
            <path d="M-50 520 L1250 470" stroke="url(#streak1)" strokeWidth="1.5" />
          </svg>
          <svg
            className="absolute bottom-0 right-0 h-40 w-[42rem] max-w-full text-grafit-900"
            viewBox="0 0 680 160"
            fill="currentColor"
            preserveAspectRatio="xMaxYMax meet"
          >
            <path d="M680 160 H0 V150 h40 v-28 h26 v28 h22 v-54 h30 v54 h18 v-82 h34 v82 h20 v-40 h24 v40 h22 v-96 h30 v96 h16 v-62 h28 v62 h22 v-34 h22 v34 h20 v-120 h34 v120 h18 v-70 h26 v70 h22 v-46 h24 v46 h20 v-150 h30 v150 h18 v-84 h28 v84 h20 v-52 h24 v52 Z" />
          </svg>
          <div
            className="absolute inset-x-0 bottom-0 h-24"
            style={{ background: 'linear-gradient(to bottom, rgba(14,15,18,0), #0e0f12)' }}
          />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 pt-16 pb-0 sm:pt-24">
          {besked && (
            <div className="mb-8 rounded-xl border border-kobber-500/30 bg-kobber-500/10 px-5 py-4 text-grafit-100">
              <p className="whitespace-pre-line">{besked}</p>
            </div>
          )}

          <div className="max-w-2xl">
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Garagen for
              <br />
              Zeekr-ejere i Norden
            </h1>
            <p className="mt-5 max-w-xl text-lg text-grafit-300">
              Et uofficielt fællesskab, hvor ejere mødes, deler erfaringer og hjælper hinanden.
              Vi samler fejl og ønsker som konstruktiv feedback til Zeekr — fordi vi vil se gode
              biler blive endnu bedre.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={user ? '/feedback' : '/login'}
                className="inline-flex items-center justify-center rounded-lg bg-kobber-500 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-kobber-600"
              >
                Vær med
              </Link>
              <Link
                href="/feedback"
                className="inline-flex items-center justify-center rounded-lg border border-grafit-600 px-5 py-2.5 font-semibold text-grafit-100 transition-colors hover:border-kobber-500 hover:text-white"
              >
                Se feedback
              </Link>
            </div>
            <p className="mt-5 text-sm text-grafit-500">
              Uofficielt ejer-community · ikke tilknyttet eller sponsoreret af Zeekr.
            </p>
          </div>

          {/* INSTRUMENT-STRIBE */}
          <div className="relative mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-t-xl border border-b-0 border-grafit-800 bg-grafit-800 sm:grid-cols-4">
            {[
              { v: tal.meldinger, l: 'Meldinger' },
              { v: tal.bekraeftelser, l: 'Bekræftelser' },
              { v: tal.modeller, l: 'Modeller' },
              { v: tal.sendt, l: 'Sendt til Zeekr' },
            ].map((t) => (
              <div key={t.l} className="bg-grafit-950 px-5 py-5">
                <div className="font-mono text-3xl font-bold tabular-nums text-kobber-400">{t.v}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-grafit-400">
                  {t.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FORUM — det bærende rum (åbner snart) */}
      <section className="mx-auto max-w-5xl px-4 pt-14">
        <div className="relative overflow-hidden rounded-2xl bg-grafit-900 p-6 text-white ring-1 ring-grafit-800 sm:p-9">
          <div
            className="absolute right-0 top-0 h-48 w-48"
            style={{ background: 'radial-gradient(closest-side, rgba(194,104,63,.22), rgba(194,104,63,0) 70%)' }}
            aria-hidden="true"
          />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-2xl font-bold tracking-tight">Forummet</h2>
              <span className="chip bg-kobber-500/15 text-kobber-300 ring-1 ring-inset ring-kobber-500/30">
                Åbner snart
              </span>
            </div>
            <p className="mt-3 max-w-xl text-grafit-300">
              Fællesskabets hjerte: hverdagssnak, spørgsmål og guides — med et eget underforum for
              hver model, så det hele bor ét sted med samme login som resten af siden.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {forumModeller.map((m) => (
                <span key={m.id} className="rounded-lg bg-grafit-800 px-3 py-1.5 text-sm text-grafit-200">
                  {m.name}
                </span>
              ))}
              <span className="rounded-lg bg-grafit-800 px-3 py-1.5 text-sm text-grafit-400">
                Generel snak
              </span>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg bg-kobber-500 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-kobber-600"
              >
                Opret din profil
              </Link>
              <span className="text-sm text-grafit-400">så er du med fra dag ét.</span>
            </div>
          </div>
        </div>
      </section>

      {/* FEEDBACK (sekundært, men live) + MIN GARAGE / OM */}
      <section className="mx-auto max-w-5xl px-4 py-14">
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="min-w-0 rounded-2xl border border-grafit-200 bg-white p-6 sm:p-7 lg:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <h2 className="font-display text-xl font-bold tracking-tight text-grafit-900">Feedback</h2>
                <span className="chip shrink-0 bg-loest/10 text-loest ring-1 ring-inset ring-loest/25">
                  ● Live nu
                </span>
              </div>
              <Link href="/feedback" className="shrink-0 whitespace-nowrap text-sm font-semibold text-kobber-700 hover:text-kobber-600">
                Åbn feedback
              </Link>
            </div>
            <p className="mt-2 text-grafit-600">
              Kører allerede: meld fejl og ønsker, bekræft dem sammen, og stem de vigtigste op.
              Vi samler dem i konstruktive rapporter til Zeekr.
            </p>

            {seneste.length > 0 ? (
              <div className="mt-5 divide-y divide-grafit-100 border-t border-grafit-100">
                {seneste.map((i) => {
                  const meta = TYPE_META[i.type];
                  const m = i.models[0];
                  return (
                    <Link
                      key={i.id}
                      href={`/melding/${i.id}`}
                      className="flex items-center gap-3 py-3 hover:bg-grafit-50"
                    >
                      <span className={`chip ${meta.chip}`}>{meta.badge}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-grafit-800">
                        {i.title}
                      </span>
                      {m && (
                        <span className="shrink-0 font-mono text-xs text-grafit-400">
                          {kortModel(m.name)}
                          {i.models.length > 1 ? ` +${i.models.length - 1}` : ''}
                        </span>
                      )}
                      <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-grafit-700">
                        ▲ {i.confirmations}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="mt-5 border-t border-grafit-100 pt-4 text-sm text-grafit-400">
                Ingen meldinger endnu — vær den første til at melde noget ind.
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1 border-t border-grafit-100 pt-4 text-xs text-grafit-500">
              <span>
                <span className="font-mono font-bold text-kobber-600">01</span> Søg først
              </span>
              <span>
                <span className="font-mono font-bold text-kobber-600">02</span> Bekræft sammen
              </span>
              <span>
                <span className="font-mono font-bold text-kobber-600">03</span> Send til Zeekr
              </span>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
            <div className="flex-1 rounded-2xl border border-grafit-200 bg-white p-6">
              <h3 className="font-display text-lg font-bold tracking-tight text-grafit-900">Min garage</h3>
              <p className="mt-2 text-sm text-grafit-600">
                Registrér din Zeekr, så du er klar når forummet åbner — og dine stemmer tæller for
                den rigtige model.
              </p>
              <Link
                href={user ? '/garage' : '/login'}
                className="mt-4 inline-flex text-sm font-semibold text-kobber-700 hover:text-kobber-600"
              >
                Registrér din bil
              </Link>
            </div>
            <div className="flex-1 rounded-2xl border border-grafit-200 bg-white p-6">
              <h3 className="font-display text-lg font-bold tracking-tight text-grafit-900">Nyttige links</h3>
              <p className="mt-2 text-sm text-grafit-600">
                Manualer, specs, test, tilbehør og lidt praktisk — samlet ét sted for Zeekr-ejere.
              </p>
              <Link href="/links" className="mt-4 inline-flex text-sm font-semibold text-kobber-700 hover:text-kobber-600">
                Se nyttige links
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
