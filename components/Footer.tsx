import Link from 'next/link';
import { SITE } from '@/lib/config';
import { hentOrdbog } from '@/lib/i18n/server';
import SprogVaelger from './SprogVaelger';

export default async function Footer() {
  const t = await hentOrdbog();
  return (
    <footer className="mt-16 border-t border-grafit-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-grafit-500">
        <p className="max-w-2xl">{t.ramme.disclaimer(SITE.domain)}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-grafit-400">
          <span className="font-semibold text-grafit-600">{SITE.name}</span>
          <Link href="/forum" className="hover:text-kobber-700">{t.nav.forum}</Link>
          <Link href="/feedback" className="hover:text-kobber-700">{t.nav.feedback}</Link>
          <Link href="/events" className="hover:text-kobber-700">{t.nav.events}</Link>
          <Link href="/software" className="hover:text-kobber-700">{t.nav.ota}</Link>
          <Link href="/links" className="hover:text-kobber-700">{t.nav.links}</Link>
          <Link href="/om" className="hover:text-kobber-700">{t.nav.om}</Link>
          <Link href="/kontakt" className="hover:text-kobber-700">{t.nav.kontakt}</Link>
        </div>
        <div className="mt-4 border-t border-grafit-100 pt-4">
          <SprogVaelger />
        </div>
      </div>
    </footer>
  );
}
