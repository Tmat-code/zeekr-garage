import Link from 'next/link';
import { getAktivitet } from '@/lib/queries-admin';
import BarGraf, { type Soejle } from '@/components/admin/BarGraf';
import { hentVOrdbog } from '@/lib/i18n/vaerksted/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const v = await hentVOrdbog();
  return { title: v.metaTitel(v.nav.aktivitet) };
}

function Tile({ tal, label }: { tal: number; label: string }) {
  return (
    <div className="rounded-xl border border-grafit-200 bg-white px-4 py-4 text-center">
      <div className="text-2xl font-semibold tabular-nums text-grafit-900">{tal}</div>
      <div className="mt-0.5 text-xs font-medium text-grafit-500">{label}</div>
    </div>
  );
}

// 30 dagsøjler: dato-label ved start + hver 7. dag, "i dag" i enden.
function tilSoejler(serie: { dato: string; antal: number }[], iDag: string): Soejle[] {
  return serie.map((d, i) => ({
    antal: d.antal,
    label:
      i === serie.length - 1
        ? iDag
        : i % 7 === 0
          ? `${d.dato.slice(8, 10)}-${d.dato.slice(5, 7)}`
          : undefined,
  }));
}

export default async function AktivitetSide() {
  const [a, v] = await Promise.all([getAktivitet(), hentVOrdbog()]);
  const t = v.aktivitet;
  const aktiveSoejler = tilSoejler(a.aktive30dage, t.iDag);
  const nyeSoejler = tilSoejler(a.nye30dage, t.iDag);
  const timeTekst = (h: number) => String(h).padStart(2, '0');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-grafit-900">📈 {t.titel}</h2>
        <Link href="/admin" className="btn-ghost !py-1.5 text-sm">
          {v.ramme.tilbage}
        </Link>
      </div>
      <p className="-mt-3 text-sm text-grafit-500">{t.intro}</p>

      <div className="grid grid-cols-3 gap-3">
        <Tile tal={a.aktiveIAlt} label={t.aktive30} />
        <Tile tal={a.nyeIAlt} label={t.nye30} />
        <Tile tal={a.brugereIAlt} label={t.brugereIAlt} />
      </div>

      <section className="rounded-2xl border-2 border-kobber-200 bg-white p-5">
        <h3 className="mb-1 font-semibold text-grafit-900">{t.aktivePrDag}</h3>
        <p className="mb-3 text-xs text-grafit-400">{t.aktiveForklaring}</p>
        <BarGraf soejler={aktiveSoejler} visVaerdi />
        {!a.harData && <p className="mt-2 text-xs text-grafit-400">{t.ingenData}</p>}
      </section>

      <section className="rounded-2xl border-2 border-kobber-200 bg-white p-5">
        <h3 className="mb-1 font-semibold text-grafit-900">{t.nyePrDag}</h3>
        <p className="mb-3 text-xs text-grafit-400">{t.nyeForklaring}</p>
        <BarGraf soejler={nyeSoejler} visVaerdi />
      </section>

      {a.roligstTime !== null && (
        <div className="rounded-xl border border-kobber-200 bg-kobber-50 px-4 py-3 text-sm text-grafit-700">
          {t.deploy(
            timeTekst(a.roligstTime),
            a.travlestTime !== null ? timeTekst(a.travlestTime) : null,
          )}
        </div>
      )}

      <p className="text-xs text-grafit-400">{t.serverNote}</p>
    </div>
  );
}
