import { modelBadge } from '@/lib/model-badge';

// Delt typografisk model-badge (grafit-chip, kobber-tekst) brugt baade i
// forum-oversigten, paa kategori-siden og i Vaerkstedet - saa de matcher.
// Boksen vokser i BREDDEN efter indholdet (min-bredde = hoejden, saa korte
// betegnelser er kvadratiske) og skriften skrumper ved lange betegnelser,
// saa fx "MODEL7" eller en lang model-betegnelse ikke flyder ud af boksen.

type Size = 'sm' | 'md' | 'lg';

const BOKS: Record<Size, string> = {
  sm: 'h-8 min-w-[2rem] rounded-lg',
  md: 'h-10 min-w-[2.5rem] rounded-xl',
  lg: 'h-12 min-w-[3rem] rounded-2xl',
};

function skrift(len: number, size: Size): string {
  if (size === 'lg') return len <= 4 ? 'text-base' : len <= 6 ? 'text-sm' : 'text-xs';
  if (size === 'sm') return len <= 4 ? 'text-[11px]' : 'text-[9px]';
  return len <= 4 ? 'text-[13px]' : len <= 6 ? 'text-[11px]' : 'text-[9px]'; // md
}

export default function ModelBadge({ slug, size = 'md' }: { slug: string; size?: Size }) {
  const b = modelBadge(slug);
  return (
    <span
      className={`inline-grid shrink-0 place-items-center bg-grafit-100 px-1.5 font-display font-semibold leading-none tracking-tight tabular-nums text-kobber-700 ${BOKS[size]} ${skrift(b.length, size)}`}
      title={b}
      aria-hidden="true"
    >
      {b}
    </span>
  );
}
