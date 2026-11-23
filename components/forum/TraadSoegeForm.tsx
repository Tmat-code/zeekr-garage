// Tvaergaaende traad-soegning: en ren GET-form -> /forum/soeg?q=...
// Server-renderbar (ingen state), virker uden JS, og URL'en er delbar/bogmaerkbar
// - i tråd med resten af sitets SSR-linje.
import Link from 'next/link';

export default function TraadSoegeForm({
  defaultValue = '',
  stor = false,
}: {
  defaultValue?: string;
  stor?: boolean;
}) {
  return (
    <form action="/forum/soeg" method="get" role="search" className="flex gap-2">
      <div className="relative flex-1">
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-grafit-400"
          aria-hidden="true"
        >
          🔎
        </span>
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder="Søg i alle tråde…"
          aria-label="Søg i alle forum-tråde"
          className={`input pl-9 ${stor ? 'py-3 text-base' : ''}`}
        />
      </div>
      <button type="submit" className="btn-primary shrink-0">
        Søg
      </button>
    </form>
  );
}

// Lille link-variant til brug i kategori-headers o.l.
export function SoegLink({ className = '' }: { className?: string }) {
  return (
    <Link href="/forum/soeg" className={className}>
      🔎 Søg i tråde
    </Link>
  );
}
