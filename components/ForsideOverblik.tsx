// Offentligt overblik øverst på forsiden: nøgletal + "sådan virker det".
export type ForsideTal = {
  meldinger: number;
  bekraeftet: number;
  sendtTilZeekr: number;
  loest: number;
};

function Tal({ tal, label }: { tal: number; label: string }) {
  return (
    <div className="rounded-xl border border-grafit-200 bg-white px-4 py-4 text-center">
      <div className="text-2xl font-semibold tabular-nums text-grafit-900">{tal}</div>
      <div className="mt-0.5 text-xs font-medium uppercase tracking-wide text-grafit-500">
        {label}
      </div>
    </div>
  );
}

function TrinKort({ ikon, titel, tekst }: { ikon: string; titel: string; tekst: string }) {
  return (
    <div className="rounded-xl border border-grafit-200 bg-white px-4 py-4">
      <div className="flex items-start gap-3">
        <span className="text-lg" aria-hidden>
          {ikon}
        </span>
        <div>
          <p className="font-semibold text-grafit-900">{titel}</p>
          <p className="mt-0.5 text-sm text-grafit-500">{tekst}</p>
        </div>
      </div>
    </div>
  );
}

export default function ForsideOverblik({ tal }: { tal: ForsideTal }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tal tal={tal.meldinger} label="Meldinger" />
        <Tal tal={tal.bekraeftet} label="Bekræftet af ejere" />
        <Tal tal={tal.sendtTilZeekr} label="Sendt til Zeekr" />
        <Tal tal={tal.loest} label="Løst" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <TrinKort
          ikon="🔍"
          titel="Søg først"
          tekst="Findes din fejl allerede? Giv den en stemme i stedet for at melde den igen."
        />
        <TrinKort
          ikon="🤝"
          titel="Bekræft sammen"
          tekst="Jo flere ejere der bekræfter, jo tungere vejer fejlen."
        />
        <TrinKort
          ikon="📮"
          titel="Send til Zeekr"
          tekst="De bekræftede fejl samles i rapporter til Zeekr."
        />
      </div>
    </div>
  );
}
