import Link from 'next/link';
import { getAktivitet } from '@/lib/queries-admin';
import BarGraf from '@/components/admin/BarGraf';

export const dynamic = 'force-dynamic';

function Tile({ tal, label }: { tal: number; label: string }) {
  return (
    <div className="rounded-xl border border-grafit-200 bg-white px-4 py-4 text-center">
      <div className="text-2xl font-semibold tabular-nums text-grafit-900">{tal}</div>
      <div className="mt-0.5 text-xs font-medium text-grafit-500">{label}</div>
    </div>
  );
}

export default async function AktivitetSide() {
  const a = await getAktivitet();

  const timeSoejler = a.perTime.map((antal, i) => ({
    antal,
    label: i % 3 === 0 ? String(i).padStart(2, '0') : undefined,
  }));

  const dagSoejler = a.per30dage.map((d, i) => ({
    antal: d.antal,
    label:
      i === 0
        ? `${d.dato.slice(8, 10)}-${d.dato.slice(5, 7)}`
        : i === a.per30dage.length - 1
          ? 'i dag'
          : undefined,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-grafit-900">📈 Aktivitet</h2>
        <Link href="/admin" className="btn-ghost !py-1.5 text-sm">
          ← Tilbage til admin
        </Link>
      </div>
      <p className="-mt-3 text-sm text-grafit-500">
        Stemmer og nye meldinger - vist i dansk tid.
      </p>

      <div className="grid grid-cols-3 gap-3">
        <Tile tal={a.total} label="Hændelser i alt" />
        <Tile tal={a.stemmer} label="Stemmer" />
        <Tile tal={a.nyeMeldinger} label="Nye meldinger" />
      </div>

      {a.travlestTime !== null && (
        <div className="rounded-xl border border-kobber-200 bg-kobber-50 px-4 py-3 text-sm text-grafit-700">
          🔧 Travlest: omkring kl. {String(a.travlestTime).padStart(2, '0')} · Roligst: omkring kl.{' '}
          {String(a.roligstTime ?? 0).padStart(2, '0')}. De stille timer er det tryggeste
          tidspunkt at deploye (kort nedetid rammer færrest).
        </div>
      )}

      <section className="rounded-2xl border-2 border-kobber-200 bg-white p-5">
        <h3 className="mb-1 font-semibold text-grafit-900">Hen over døgnet</h3>
        <p className="mb-3 text-xs text-grafit-400">Hændelser pr. klokkeslæt (0-23).</p>
        <BarGraf soejler={timeSoejler} />
      </section>

      <section className="rounded-2xl border-2 border-kobber-200 bg-white p-5">
        <h3 className="mb-1 font-semibold text-grafit-900">Hen over ugen</h3>
        <p className="mb-3 text-xs text-grafit-400">Hændelser pr. ugedag.</p>
        <div className="flex items-end gap-2" style={{ height: 130 }}>
          {a.perUgedag.map((u) => {
            const max = Math.max(1, ...a.perUgedag.map((x) => x.antal));
            return (
              <div key={u.label} className="flex flex-1 flex-col items-center justify-end">
                <div
                  className="w-full rounded-t bg-kobber-400"
                  style={{ height: `${(u.antal / max) * 100}%`, minHeight: u.antal > 0 ? 2 : 0 }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex gap-2">
          {a.perUgedag.map((u) => (
            <div key={u.label} className="flex-1 text-center text-xs text-grafit-500">
              <div>{u.label}</div>
              <div className="tabular-nums text-grafit-400">{u.antal}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border-2 border-kobber-200 bg-white p-5">
        <h3 className="mb-1 font-semibold text-grafit-900">Sidste 30 dage</h3>
        <p className="mb-3 text-xs text-grafit-400">Hændelser pr. dag.</p>
        <BarGraf soejler={dagSoejler} />
      </section>

      <p className="text-xs text-grafit-400">
        💡 Dette er fællesskabs-aktivitet (stemmer/meldinger) - ikke serverens CPU/hukommelse.
        Den egentlige server-belastning kan du se i Coolifys egen overvågning på applikationen.
      </p>
    </div>
  );
}
