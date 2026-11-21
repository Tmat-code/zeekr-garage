// Lille garage-badge: viser forfatterens bil ("🚗 Zeekr 7GT · Long Range RWD").
// Det er forummets differentiering — indlæg kender ejer-grafen. Ingen bil => intet.
export default function GarageBadge({ bil }: { bil: string | null }) {
  if (!bil) return null;
  return (
    <span className="chip bg-grafit-100 text-grafit-600">
      <span aria-hidden="true">🚗</span>
      <span className="truncate">{bil}</span>
    </span>
  );
}
