// Lille rund avatar: profilbillede hvis der er et, ellers initial-fallback
// (foerste bogstav af visningsnavnet). Genbrugt overalt hvor en forfatter vises
// (forum-traade/svar, traadliste, kommentarer, garage-badge-kontekst, beskeder).
// Rent praesentationelt - faar en faerdig offentlig URL (avatarUrl) eller null.
export default function Avatar({
  url,
  navn,
  px = 32,
  className = '',
}: {
  url: string | null;
  navn: string | null;
  px?: number;
  className?: string;
}) {
  const initial = (navn?.trim()?.[0] ?? '?').toUpperCase();
  const style = { width: px, height: px };

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={navn ? `${navn}s profilbillede` : 'Profilbillede'}
        style={style}
        className={`shrink-0 rounded-full border border-grafit-200 object-cover ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{ ...style, fontSize: Math.round(px * 0.45) }}
      className={`flex shrink-0 select-none items-center justify-center rounded-full border border-grafit-200 bg-grafit-100 font-semibold leading-none text-grafit-500 ${className}`}
    >
      {initial}
    </span>
  );
}
