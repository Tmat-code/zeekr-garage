import { redirect } from 'next/navigation';
import {
  getModels,
  getIssues,
  getMyConfirmedIssueIds,
  getCurrentUser,
  getVarianter,
} from '@/lib/queries';
import type { IssueType } from '@/lib/config';
import MeldFlow from '@/components/MeldFlow';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meld ind' };

export default async function MeldSide({
  searchParams,
}: {
  searchParams?: { type?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?naeste=/meld');

  const tp = searchParams?.type;
  const initialType: IssueType | null = tp === 'fejl' || tp === 'oenske' ? tp : null;
  const [models, issues, mineSet, varianter] = await Promise.all([
    getModels(),
    getIssues(),
    getMyConfirmedIssueIds(),
    getVarianter(),
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
        varianter={varianter}
        myConfirmedIds={[...mineSet]}
        initialType={initialType}
      />
    </div>
  );
}
