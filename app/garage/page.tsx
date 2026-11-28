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
import SprogFelt from '@/components/SprogFelt';
import { hentOrdbog, hentProfilSprog } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  const t = await hentOrdbog();
  return { title: t.garage.metaTitel };
}

export default async function GarageSide() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?naeste=/garage');

  const [models, varianter, biler, mitNavn, mitAvatar, profilSprog, t] = await Promise.all([
    getModels(),
    getVarianter(),
    getMyCars(),
    getMitNavn(),
    getMitAvatar(),
    hentProfilSprog(),
    hentOrdbog(),
  ]);

  // Layout: på mobil én kolonne (kortene stakker i rækkefølgen avatar -> navn
  // -> biler -> mail, som før). På md+ et 2-kolonne-gitter inden for en
  // fornuftig max-bredde - venstre = profil, højre = garage + konto - så siden
  // ikke står som en smal strimmel i tomt rum. Den lodrette afstand mellem
  // kortene kommer fra kortenes egne mt-6, så gitteret kun styrer den vandrette
  // gap (ingen dobbelt-margin); items-start holder kolonnerne top-justeret.
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-grafit-900">{t.garage.titel}</h1>
      <p className="mt-1 max-w-2xl text-grafit-600">{t.garage.intro}</p>

      <div className="grid gap-x-6 md:grid-cols-2 md:items-start">
        <div>
          <AvatarUpload initialPath={mitAvatar} navn={mitNavn} />
          <VisningsnavnForm initial={mitNavn} />
          <SprogFelt gemtSprog={profilSprog} />
        </div>
        <div>
          <MinGarageForm models={models} varianter={varianter} initialCars={biler} />
          <SkiftMailForm nuvaerende={user.email ?? ''} />
        </div>
      </div>
    </div>
  );
}
