import { redirect } from 'next/navigation';
import {
  getCurrentUser,
  getModels,
  getVarianter,
  getMyCars,
  getMitNavn,
  getMitAvatar,
} from '@/lib/queries';
import MinGarageForm from '@/components/MinGarageForm';
import VisningsnavnForm from '@/components/VisningsnavnForm';
import AvatarUpload from '@/components/AvatarUpload';
import SkiftMailForm from '@/components/SkiftMailForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Min garage' };

export default async function GarageSide() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?naeste=/garage');

  const [models, varianter, biler, mitNavn, mitAvatar] = await Promise.all([
    getModels(),
    getVarianter(),
    getMyCars(),
    getMitNavn(),
    getMitAvatar(),
  ]);

  // Layout: på mobil én kolonne (kortene stakker i rækkefølgen avatar -> navn
  // -> biler -> mail, som før). På md+ et 2-kolonne-gitter inden for en
  // fornuftig max-bredde - venstre = profil, højre = garage + konto - så siden
  // ikke står som en smal strimmel i tomt rum. Den lodrette afstand mellem
  // kortene kommer fra kortenes egne mt-6, så gitteret kun styrer den vandrette
  // gap (ingen dobbelt-margin); items-start holder kolonnerne top-justeret.
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-grafit-900">🚗 Min garage</h1>
      <p className="mt-1 max-w-2xl text-grafit-600">
        Dit navn og dine Zeekr - navnet vises som forfatter, bilerne bruges til &quot;mig
        med&quot;. Ejer du flere, kan du tilføje dem alle.
      </p>

      <div className="grid gap-x-6 md:grid-cols-2 md:items-start">
        <div>
          <AvatarUpload initialPath={mitAvatar} navn={mitNavn} />
          <VisningsnavnForm initial={mitNavn} />
        </div>
        <div>
          <MinGarageForm models={models} varianter={varianter} initialCars={biler} />
          <SkiftMailForm nuvaerende={user.email ?? ''} />
        </div>
      </div>
    </div>
  );
}
