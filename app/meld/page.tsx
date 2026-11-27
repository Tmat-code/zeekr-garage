import { redirect } from 'next/navigation';
import {
  getModels,
  getIssues,
  getMyConfirmedCounts,
  getCurrentUser,
  getMyCars,
} from '@/lib/queries';
import type { IssueType } from '@/lib/config';
import MeldFlow from '@/components/MeldFlow';
import { hentOrdbog } from '@/lib/i18n/server';
import { medTitelOversaettelser } from '@/lib/titel-oversaet';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await hentOrdbog();
  return { title: t.meld.metaTitel };
}

export default async function MeldSide({
  searchParams,
}: {
  searchParams?: { type?: string; titel?: string; beskrivelse?: string; fra?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?naeste=/meld');

  const tp = searchParams?.type;
  const initialType: IssueType | null = tp === 'fejl' || tp === 'oenske' ? tp : null;
  const initialTitle = (searchParams?.titel ?? '').slice(0, 160);
  const initialBody = (searchParams?.beskrivelse ?? '').slice(0, 4000);
  // Kun interne stier accepteres som "fra" (undgå open-redirect i linket).
  const fraForum =
    searchParams?.fra && searchParams.fra.startsWith('/forum/') ? searchParams.fra : undefined;
  const [models, raaIssues, myCounts, userCars, t] = await Promise.all([
    getModels(),
    getIssues(),
    getMyConfirmedCounts(),
    getMyCars(),
    hentOrdbog(),
  ]);
  // U3b: dublet-tjekket matcher også titlernes oversættelser.
  const issues = await medTitelOversaettelser(raaIssues);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-grafit-900">{t.meld.titel}</h1>
      <p className="mt-1 text-grafit-600">{t.meld.intro}</p>
      <MeldFlow
        issues={issues}
        models={models}
        userCars={userCars}
        myCounts={myCounts}
        initialType={initialType}
        initialTitle={initialTitle}
        initialBody={initialBody}
        fraForum={fraForum}
      />
    </div>
  );
}
