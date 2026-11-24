import Link from 'next/link';
import { getAktivitet } from '@/lib/queries-admin';
import BarGraf, { type Soejle } from '@/components/admin/BarGraf';

export const dynamic = 'force-dynamic';

function Tile({ tal, label }: { tal: number; label: string }) {
  return (
    <div className="rounded-xl border border-grafit-200 bg-white px-4 py-4 text-center">
      <div className="text-2xl font-semibold tabular-nums text-grafit-900">{tal}</div>
      <div className="mt-0.5 text-xs font-medium text-grafit-500">{label}</div>
    </div>
  );
}

// 30 dagsøjler: dato-label ved start + hver 7. dag, "i dag" i enden.
function tilSoejler(serie: { dato: string; antal: number }[]): Soejle[] {
  return serie.map((d, i) => ({
    antal: d.antal,
    label:
      i === serie.length - 1
        ? 'i dag'
        : i % 7 === 0
          ? `${d.dato.slice(8, 10)}-${d.dato.slice(5, 7)}`
          : undefined,
  }));
}

export default async function AktivitetSide() {
  const a = await getAktivitet();
  const aktiveSoejler = tilSoejler(a.aktive30dage);
  const nyeSoejler = tilSoejler(a.nye30dage);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-grafit-900">📈 Aktivitet</h2>
        <Link href="/admin" className="btn-ghost !py-1.5 text-sm">
          ← Tilbage til admin
        </Link>
      </div>
      <p className="-mt-3 text-sm text-grafit-500">
        Vækst og engagement - unikke aktive brugere og nye brugere pr. dag, sidste 30 dage (dansk
        tid).
      </p>

      <div className="grid grid-cols-3 gap-3">
        <Tile tal={a.aktiveIAlt} label="Aktive (30 dage)" />
        <Tile tal={a.nyeIAlt} label="Nye brugere (30 dage)" />
        <Tile tal={a.brugereIAlt} label="Brugere i alt" />
      </div>

      <section className="rounded-2xl border-2 border-kobber-200 bg-white p-5">
        <h3 className="mb-1 font-semibold text-grafit-900">Aktive brugere pr. dag</h3>
        <p className="mb-3 text-xs text-grafit-400">
          Unikke brugere der gjorde noget den dag: stemte, meldte, skrev i forummet (tråd eller
          svar) eller sendte en besked.
        </p>
        <BarGraf soejler={aktiveSoejler} visVaerdi />
        {!a.harData && (
          <p className="mt-2 text-xs text-grafit-400">Ingen registreret aktivitet i perioden endnu.</p>
        )}
      </section>

      <section className="rounded-2xl border-2 border-kobber-200 bg-white p-5">
        <h3 className="mb-1 font-semibold text-grafit-900">Nye brugere pr. dag</h3>
        <p className="mb-3 text-xs text-grafit-400">Tilmeldinger (oprettede profiler).</p>
        <BarGraf soejler={nyeSoejler} visVaerdi />
      </section>

      {a.roligstTime !== null && (
        <div className="rounded-xl border border-kobber-200 bg-kobber-50 px-4 py-3 text-sm text-grafit-700">
          🔧 Deploy-timing: roligst omkring kl. {String(a.roligstTime).padStart(2, '0')}
          {a.travlestTime !== null && <> (travlest kl. {String(a.travlestTime).padStart(2, '0')})</>}{' '}
          - de stille timer er tryggest at deploye (kort nedetid rammer færrest).
        </div>
      )}

      <p className="text-xs text-grafit-400">
        💡 Dette er fællesskabs-aktivitet (brugere der bruger sitet) - ikke serverens
        CPU/hukommelse. Den egentlige server-belastning kan du se i Coolifys egen overvågning på
        applikationen.
      </p>
    </div>
  );
}
