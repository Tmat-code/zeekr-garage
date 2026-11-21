import { SITE, DISCLAIMER } from '@/lib/config';

export const metadata = { title: 'Om' };

export default function OmSide() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-grafit-900">Om {SITE.name}</h1>

      <div className="prose mt-4 space-y-4 text-grafit-700">
        <p>
          {SITE.name} er et uofficielt, ikke-kommercielt community af og for Zeekr-ejere
          i Norden. Ingen annoncer, ingen affiliate - bare ejere der hjælper hinanden.
        </p>
        <p>
          Kernen er et <strong>fejl-board</strong>: meld softwarefejl, bekræft dem sammen,
          og stem de vigtigste op. Én fejl kan tagges til flere modeller, så vi kan se når
          noget rammer en hel platform. De bekræftede fejl samles i pæne, offentlige
          rapporter til Zeekr - som en konstruktiv medspiller, ikke en vred pressgruppe.
        </p>
        <p>
          Senere kommer et rigtigt <strong>forum</strong> med underfora pr. model, tråde og
          guides - med ét fælles login, så det hele føles som ét site.
        </p>
      </div>

      <div className="mt-8 rounded-xl border border-grafit-200 bg-white p-5 text-sm text-grafit-500">
        <p className="font-semibold text-grafit-700">Disclaimer</p>
        <p className="mt-1">{DISCLAIMER}</p>
      </div>
    </div>
  );
}
