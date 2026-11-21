'use client';

import { useState } from 'react';
import Link from 'next/link';

type Props = {
  erModerator: boolean;
  indlogget: boolean;
};

const LINKS = [
  { href: '/forum', label: 'Forum' },
  { href: '/feedback', label: 'Feedback' },
  { href: '/links', label: 'Links' },
  { href: '/om', label: 'Om' },
];

export default function Nav({ erModerator, indlogget }: Props) {
  const [open, setOpen] = useState(false);
  const luk = () => setOpen(false);

  return (
    <>
      {/* Desktop-nav */}
      <nav className="hidden items-center gap-1.5 text-sm sm:flex [&_a]:whitespace-nowrap [&_button]:whitespace-nowrap">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-lg px-3 py-1.5 text-grafit-600 hover:bg-grafit-100"
          >
            {l.label}
          </Link>
        ))}
        {erModerator && (
          <Link
            href="/admin"
            className="rounded-lg px-3 py-1.5 font-medium text-kobber-700 hover:bg-kobber-100"
          >
            🔧 Værkstedet
          </Link>
        )}
        {indlogget ? (
          <div className="flex items-center gap-2 pl-1">
            <Link href="/garage" className="rounded-lg px-3 py-1.5 text-grafit-600 hover:bg-grafit-100">
              🚗 Min garage
            </Link>
            <form action="/logout" method="post">
              <button className="btn-ghost !py-1.5 text-sm" type="submit">
                Log ud
              </button>
            </form>
          </div>
        ) : (
          <Link href="/login" className="btn-primary !py-1.5 text-sm">
            Log ind
          </Link>
        )}
      </nav>

      {/* Mobil: burger-knap */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Luk menu' : 'Åbn menu'}
        aria-expanded={open}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-grafit-700 hover:bg-grafit-100 sm:hidden"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          {open ? (
            <>
              <path d="M5 5l10 10" />
              <path d="M15 5L5 15" />
            </>
          ) : (
            <>
              <path d="M3 6h14" />
              <path d="M3 10h14" />
              <path d="M3 14h14" />
            </>
          )}
        </svg>
      </button>

      {/* Mobil: udfoldet panel */}
      {open && (
        <div className="absolute inset-x-0 top-full border-b border-grafit-200 bg-white shadow-sm sm:hidden">
          <nav className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-3 text-sm">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={luk}
                className="rounded-lg px-3 py-2.5 text-grafit-700 hover:bg-grafit-100"
              >
                {l.label}
              </Link>
            ))}
            {erModerator && (
              <Link
                href="/admin"
                onClick={luk}
                className="rounded-lg px-3 py-2.5 font-medium text-kobber-700 hover:bg-kobber-100"
              >
                🔧 Værkstedet
              </Link>
            )}
            <div className="mt-1 border-t border-grafit-100 pt-2">
              {indlogget ? (
                <div className="flex flex-col gap-1">
                  <Link
                    href="/garage"
                    onClick={luk}
                    className="rounded-lg px-3 py-2.5 text-grafit-700 hover:bg-grafit-100"
                  >
                    🚗 Min garage
                  </Link>
                  <form action="/logout" method="post">
                    <button
                      type="submit"
                      className="w-full rounded-lg px-3 py-2.5 text-left text-grafit-700 hover:bg-grafit-100"
                    >
                      Log ud
                    </button>
                  </form>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={luk}
                  className="block rounded-lg bg-kobber-500 px-3 py-2.5 text-center font-semibold text-white hover:bg-kobber-600"
                >
                  Log ind
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
