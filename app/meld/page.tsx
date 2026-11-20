import { redirect } from 'next/navigation';
import { getModels, getCurrentUser } from '@/lib/queries';
import MeldForm from '@/components/MeldForm';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Meld en fejl' };

export default async function MeldSide() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?naeste=/meld');

  const models = await getModels();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-grafit-900">Meld en fejl</h1>
      <p className="mt-1 text-grafit-600">
        Tjek gerne først om den allerede er meldt — så kan du bekræfte den i stedet.
      </p>
      <MeldForm models={models} />
    </div>
  );
}
