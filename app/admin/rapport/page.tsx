import Link from 'next/link';
import { adminKontekst } from '@/lib/admin';
import { getRapportOverblik, getRapportLog, getRapportFejl } from '@/lib/rapport';
import RapportPanel from '@/components/admin/RapportPanel';

export const dynamic = 'force-dynamic';

function daTid(iso: string): string {
  return new Date(iso).toLocaleString('da-DK', { dateStyle: 'short', timeStyle: 'short' });
}

export default async function RapportSide() {
  const [{ rolle }, overblik, log, aendrede] = await Promise.all([
    adminKontekst(),
    getRapportOverblik(),
    getRapportLog(15),
    getRapportFejl('begge', true, 15),
  ]);
  const erAdmin = rolle === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-grafit-900">📮 Zeekr-rapport</h2>
        <Link href="/admin" className="btn-ghost !py-1.5 text-sm">
          ← Tilbage til admin
        </Link>
      </div>

      {/* Siden sidste rapport */}
      <section className="rounded-2xl border-2 border-kobber-200 bg-white p-5 sm:p-6">
        <h3 className="font-semibold text-grafit-900">Siden sidste rapport</h3>
        <p className="mt-0.5 text-sm text-grafit-500">
          {overblik.sidst
            ? `Sidst sendt til Zeekr ${daTid(overblik.sidst.dato)} af ${overblik.sidst.navn} · ${overblik.sidst.antal} opslag.`
            : 'Der er endnu ikke dannet en officiel rapport.'}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-grafit-200 px-4 py-4 text-center">
            <div className="text-2xl font-semibold tabular-nums text-grafit-900">{overblik.nye}</div>
            <div className="mt-0.5 text-xs text-grafit-500">aldrig sendt</div>
          </div>
          <div className="rounded-xl border border-grafit-200 px-4 py-4 text-center">
            <div className="text-2xl font-semibold tabular-nums text-grafit-900">{overblik.eskaleret}</div>
            <div className="mt-0.5 text-xs text-grafit-500">med flere stemmer</div>
          </div>
          <div className="rounded-xl border border-grafit-200 px-4 py-4 text-center">
            <div className="text-2xl font-semibold tabular-nums text-grafit-900">+{overblik.ekstra_stemmer}</div>
            <div className="mt-0.5 text-xs text-grafit-500">nye stemmer i alt</div>
          </div>
        </div>

        {aendrede.length > 0 && (
          <ul className="mt-4 divide-y divide-grafit-100">
            {aendrede.map((f) => {
              const vaekst = f.stemmer - (f.sidst_sendt_stemmer ?? 0);
              const ny = !f.sidst_sendt_dato;
              return (
                <li key={f.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="chip bg-kobber-100 text-kobber-800">{ny ? 'NY' : `+${vaekst}`}</span>
                  <Link href={`/melding/${f.id}`} className="min-w-0 flex-1 truncate font-medium text-grafit-800 hover:text-kobber-700">
                    {f.title}
                  </Link>
                  <span className="shrink-0 tabular-nums text-grafit-400">▲ {f.stemmer}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <RapportPanel erAdmin={erAdmin} />

      {/* Rapport-log */}
      <section className="rounded-2xl border border-grafit-200 bg-white p-5 sm:p-6">
        <h3 className="font-semibold text-grafit-900">Rapport-log</h3>
        <p className="mt-0.5 mb-3 text-sm text-grafit-500">Hvem har downloadet rapporter — med dato og tidspunkt.</p>
        {log.length === 0 ? (
          <p className="text-sm text-grafit-500">Ingen downloads endnu.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-grafit-200 text-left text-xs uppercase tracking-wide text-grafit-400">
                  <th className="py-2 pr-4 font-semibold">Tidspunkt</th>
                  <th className="py-2 pr-4 font-semibold">Hvem</th>
                  <th className="py-2 pr-4 font-semibold">Format</th>
                  <th className="py-2 font-semibold">Indhold</th>
                </tr>
              </thead>
              <tbody>
                {log.map((l) => (
                  <tr key={l.id} className="border-b border-grafit-100">
                    <td className="py-2 pr-4 text-grafit-500">{daTid(l.created_at)}</td>
                    <td className="py-2 pr-4 font-medium text-grafit-800">
                      {l.navn} <span className="text-xs text-grafit-400">({l.rolle})</span>
                    </td>
                    <td className="py-2 pr-4 uppercase text-grafit-600">{l.format}</td>
                    <td className="py-2 text-grafit-600">
                      {l.type} · top {l.antal}
                      {l.kun_aendrede ? ' · kun ændrede' : ''}
                      {l.med_kommentarer ? ' · m. kommentarer' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
