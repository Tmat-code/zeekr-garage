import { redirect } from 'next/navigation';
import {
  getModels,
  getIssues,
  getMyConfirmedIssueIds,
  getCurrentUser,
  getMyCar,
} from '@/lib/queries';
import type { IssueType } from '@/lib/config';
import MeldFlow from '@/components/MeldFlow';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meld ind' };

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
  const [models, issues, mineSet, userCar] = await Promise.all([
    getModels(),
    getIssues(),
    getMyConfirmedIssueIds(),
    getMyCar(),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-grafit-900">Meld ind</h1>
      <p className="mt-1 text-grafit-600">
        Søg først — så undgår vi dubletter, og de rigtige fejl får flere stemmer.
      </p>
      <MeldFlow
        issues={issues}
        models={models}
        userCar={userCar}
        myConfirmedIds={[...mineSet]}
        initialType={initialType}
        initialTitle={initialTitle}
        initialBody={initialBody}
        fraForum={fraForum}
      />
    </div>
  );
}
