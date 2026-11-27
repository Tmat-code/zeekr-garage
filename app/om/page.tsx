import type { Metadata } from 'next';
import { SITE } from '@/lib/config';
import { hentOrdbog } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await hentOrdbog();
  return { title: t.om.metaTitel };
}

export default async function OmSide() {
  const t = await hentOrdbog();
  const o = t.om;
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-grafit-900">{o.titel(SITE.name)}</h1>

      <div className="prose mt-4 space-y-4 text-grafit-700">
        <p>{o.afsnit1(SITE.name)}</p>
        <p>
          {o.afsnit2Foer}
          <strong>{o.afsnit2Fed}</strong>
          {o.afsnit2Efter}
        </p>
        <p>
          {o.afsnit3Foer}
          <strong>{o.afsnit3Fed}</strong>
          {o.afsnit3Efter}
        </p>
      </div>

      <div className="mt-8 rounded-xl border border-grafit-200 bg-white p-5 text-sm text-grafit-500">
        <p className="font-semibold text-grafit-700">{o.disclaimerTitel}</p>
        <p className="mt-1">{t.ramme.disclaimer(SITE.domain)}</p>
      </div>
    </div>
  );
}
