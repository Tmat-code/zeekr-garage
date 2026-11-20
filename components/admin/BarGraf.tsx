// Simpel søjlegraf — rene divs, ingen chart-lib. Grafit+kobber.
export type Soejle = { label?: string; antal: number };

export default function BarGraf({
  soejler,
  hoejde = 130,
}: {
  soejler: Soejle[];
  hoejde?: number;
}) {
  const max = Math.max(1, ...soejler.map((s) => s.antal));

  return (
    <div>
      <div className="flex items-end gap-[3px]" style={{ height: hoejde }}>
        {soejler.map((s, i) => (
          <div
            key={i}
            className="group relative flex-1"
            style={{ height: '100%' }}
            title={`${s.label ? s.label + ': ' : ''}${s.antal}`}
          >
            <div
              className="absolute bottom-0 w-full rounded-t bg-kobber-400"
              style={{ height: `${(s.antal / max) * 100}%`, minHeight: s.antal > 0 ? 2 : 0 }}
            />
          </div>
        ))}
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
