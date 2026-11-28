'use client';

import { useState, useTransition } from 'react';
import GrundVaelger from './GrundVaelger';
import { rapporterForum } from '@/app/forum/actions';
import { useOrdbog } from '@/lib/i18n/klient';

// Rapportér-knap for almindelige indloggede brugere. Vises IKKE på eget indhold
// (moderatorer handler direkte). Rapporterer en traad (threadId, typisk aabnings-
// indlaegget) eller et konkret indlaeg (postId). Brugeren vælger bare en grund -
// moderatoren lægger sin egen grund + evt. fritekst på, naar handlingen udføres.
export default function RapporterKnap({
  threadId = null,
  postId = null,
}: {
  threadId?: string | null;
  postId?: string | null;
}) {
  const f = useOrdbog().forum;
  const [aaben, setAaben] = useState(false);
  const [sendt, setSendt] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (sendt) {
    return <span className="text-sm text-grafit-400">{f.rapporteret}</span>;
  }

  if (!aaben) {
    return (
      <button
        type="button"
        className="text-sm text-grafit-400 hover:text-kobber-700"
        onClick={() => setAaben(true)}
      >
        {f.rapporter}
      </button>
    );
  }

  return (
    <div className="w-full max-w-md">
      <GrundVaelger
        pending={pending}
        submitLabel={f.sendRapport}
        visFritekst={false}
        onCancel={() => setAaben(false)}
        onSubmit={(grund) => {
          setFejl(null);
          start(async () => {
            try {
              await rapporterForum(threadId, postId, grund);
              setSendt(true);
              setAaben(false);
            } catch (e: any) {
              setFejl(e?.message ?? f.kunneIkkeSendeRapport);
            }
          });
        }}
      />
      {fejl && <p className="mt-1 text-sm text-kobber-700">{fejl}</p>}
    </div>
  );
}
