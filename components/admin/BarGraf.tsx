// Simpel søjlegraf - rene divs, ingen chart-lib. Grafit+kobber.
// visVaerdi: skriv tallet på toppen af hver søjle (aflæseligt), skjult ved 0.
export type Soejle = { label?: string; antal: number };

export default function BarGraf({
  soejler,
  hoejde = 130,
  visVaerdi = false,
}: {
  soejler: Soejle[];
  hoejde?: number;
  visVaerdi?: boolean;
}) {
  const max = Math.max(1, ...soejler.map((s) => s.antal));
  // Lidt luft i toppen når værdien rider på søjlen, så tallet ikke klippes.
  const skala = visVaerdi ? 0.82 : 1;

  return (
    <div>
      <div className="flex items-end gap-[3px]" style={{ height: hoejde }}>
        {soejler.map((s, i) => {
          const h = (s.antal / max) * 100 * skala;
          return (
            <div
              key={i}
              className="group relative flex-1"
              style={{ height: '100%' }}
              title={`${s.label ? s.label + ': ' : ''}${s.antal}`}
            >
              {visVaerdi && s.antal > 0 && (
                <div
                  className="absolute w-full text-center text-[9px] font-medium leading-none tabular-nums text-grafit-500"
                  style={{ bottom: `calc(${h}% + 2px)` }}
                >
                  {s.antal}
                </div>
              )}
              <div
                className="absolute bottom-0 w-full rounded-t bg-kobber-400"
                style={{ height: `${h}%`, minHeight: s.antal > 0 ? 2 : 0 }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-[3px]">
        {soejler.map((s, i) => (
          <div key={i} className="flex-1 text-center text-[10px] leading-tight text-grafit-400">
            {s.label ?? ''}
          </div>
        ))}
      </div>
    </div>
  );
}
