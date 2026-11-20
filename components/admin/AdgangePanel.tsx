'use client';

import { useState, useTransition } from 'react';
import { relativTid } from '@/lib/tid';
import type { AdgangBruger, AdgangInvitation } from '@/lib/queries-admin';
import { inviterBruger, saetRolle, fjernInvitation } from '@/app/admin/actions';

function RolleBadge({ rolle }: { rolle: string }) {
  return (
    <span
      className={`chip ${
        rolle === 'admin' ? 'bg-kobber-500 text-white' : 'bg-grafit-200 text-grafit-700'
      }`}
    >
      {rolle}
    </span>
  );
}

export default function AdgangePanel({
  brugere,
  invitationer,
  megId,
}: {
  brugere: AdgangBruger[];
  invitationer: AdgangInvitation[];
  megId: string;
}) {
  const [email, setEmail] = useState('');
  const [rolle, setRolle] = useState('moderator');
  const [besked, setBesked] = useState<string | null>(null);
  const [fejl, setFejl] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function koer(fn: () => Promise<void>) {
    setFejl(null);
    start(async () => {
      try {
        await fn();
      } catch (e: any) {
        setFejl(e?.message ?? 'Noget gik galt.');
      }
    });
  }

  function giv() {
    setBesked(null);
    setFejl(null);
    start(async () => {
      try {
        const r = await inviterBruger(email, rolle);
        setBesked(
          r === 'sat'
            ? `${email} har nu rollen ${rolle}.`
            : `Invitation gemt. ${email} får rollen ${rolle}, så snart de opretter en konto med den email.`,
        );
        setEmail('');
      } catch (e: any) {
        setFejl(e?.message ?? 'Kunne ikke give adgang.');
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Giv adgang */}
      <section className="rounded-2xl border-2 border-kobber-200 bg-white p-5 sm:p-6">
        <div className="mb-1 flex items-center gap-2">
          <span aria-hidden>👥</span>
          <h2 className="text-lg font-semibold text-grafit-900">Adgange</h2>
        </div>
        <p className="mb-3 text-sm text-grafit-500">
          Giv andre adgang til at moderere. Du inviterer på email — har personen allerede en konto,
          får de rollen med det samme; ellers tildeles den automatisk, når de opretter en konto med
          den email. Din egen konto er altid admin.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="fx mette@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Rolle</label>
            <select
              className="rounded-lg border border-grafit-300 bg-white px-3 py-2.5 text-grafit-900"
              value={rolle}
              onChange={(e) => setRolle(e.target.value)}
            >
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            className="btn-primary !py-2.5"
            disabled={pending || !email.trim()}
            onClick={giv}
          >
            Giv adgang
          </button>
        </div>

        {besked && <p className="mt-2 text-sm text-loest">{besked}</p>}
        {fejl && <p className="mt-2 text-sm text-kobber-700">{fejl}</p>}
      </section>

      {/* Personer med adgang */}
      <section className="rounded-2xl border border-grafit-200 bg-white p-5 sm:p-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-grafit-400">
          Personer med adgang
        </h3>
        {brugere.length === 0 ? (
          <p className="text-sm text-grafit-500">Ingen med en rolle endnu.</p>
        ) : (
          <div className="space-y-2">
            {brugere.map((b) => {
              const erMig = b.id === megId;
              return (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-grafit-100 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-grafit-900">
                        {b.display_name || b.email}
                      </span>
                      <RolleBadge rolle={b.role} />
                      {erMig && <span className="text-xs text-grafit-400">(dig)</span>}
                    </div>
                    <p className="text-xs text-grafit-400">
                      {b.email}
                      {' · '}
                      {b.sidst_logget ? `sidst logget ind ${relativTid(b.sidst_logget)}` : 'aldrig logget ind'}
                    </p>
                  </div>

                  {erMig ? (
                    <span className="text-xs text-grafit-400">kan ikke ændre egen adgang</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select
                        className="rounded-lg border border-grafit-300 bg-white px-2 py-1 text-sm"
                        value={b.role}
                        disabled={pending}
                        onChange={(e) => koer(() => saetRolle(b.id, e.target.value))}
                      >
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        className="rounded-lg border border-grafit-200 px-2.5 py-1 text-sm text-grafit-500 hover:border-kobber-500 hover:text-kobber-700"
                        disabled={pending}
                        onClick={() => koer(() => saetRolle(b.id, null))}
                      >
                        Fjern adgang
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Afventende invitationer */}
      {invitationer.length > 0 && (
        <section className="rounded-2xl border border-grafit-200 bg-white p-5 sm:p-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-grafit-400">
            Afventende invitationer
          </h3>
          <div className="space-y-2">
            {invitationer.map((inv) => (
              <div
                key={inv.email}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-grafit-100 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-grafit-900">{inv.email}</span>
                    <RolleBadge rolle={inv.role} />
                  </div>
                  <p className="text-xs text-grafit-400">
                    inviteret {relativTid(inv.created_at)} · afventer oprettelse af konto
                  </p>
                </div>
                <button
                  className="rounded-lg border border-grafit-200 px-2.5 py-1 text-sm text-grafit-500 hover:border-kobber-500 hover:text-kobber-700"
                  disabled={pending}
                  onClick={() => koer(() => fjernInvitation(inv.email))}
                >
                  Fjern
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
