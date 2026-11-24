import Link from 'next/link';
import { SITE, DISCLAIMER } from '@/lib/config';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-grafit-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-grafit-500">
        <p className="max-w-2xl">{DISCLAIMER}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-grafit-400">
          <span className="font-semibold text-grafit-600">{SITE.name}</span>
          <Link href="/forum" className="hover:text-kobber-700">Forum</Link>
          <Link href="/feedback" className="hover:text-kobber-700">Feedback</Link>
          <Link href="/events" className="hover:text-kobber-700">Events</Link>
          <Link href="/software" className="hover:text-kobber-700">OTA</Link>
          <Link href="/links" className="hover:text-kobber-700">Links</Link>
          <Link href="/om" className="hover:text-kobber-700">Om</Link>
        </div>
      </div>
    </footer>
  );
}
