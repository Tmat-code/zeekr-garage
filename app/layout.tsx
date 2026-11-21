import type { Metadata } from 'next';
// Display-font Archivo via @fontsource (self-hosted, ingen Google-request ved build/runtime).
import '@fontsource/archivo/500.css';
import '@fontsource/archivo/600.css';
import '@fontsource/archivo/700.css';
import '@fontsource/archivo/800.css';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SITE } from '@/lib/config';

const BESKRIVELSE =
  'Uofficielt, uafhængigt community for Zeekr-ejere i Norden. Meld, bekræft og stem på softwarefejl på tværs af modeller - og saml dem i rapporter til Zeekr.';

export const metadata: Metadata = {
  metadataBase: new URL(`https://${SITE.domain}`),
  title: {
    default: `${SITE.name} - Uofficielt community for Zeekr-ejere`,
    template: `%s - ${SITE.name}`,
  },
  description: BESKRIVELSE,
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'da_DK',
    siteName: SITE.name,
    title: `${SITE.name} - Uofficielt community for Zeekr-ejere`,
    description: BESKRIVELSE,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da">
      <body className="flex min-h-screen flex-col">
        <div className="bg-grafit-900 text-grafit-300">
          <div className="mx-auto flex max-w-5xl items-center justify-center gap-2 px-4 py-1.5 text-center text-xs">
            <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-kobber-500" aria-hidden="true" />
            <span>Zeekr Garage er under opbygning - nyt indhold og funktioner kommer løbende.</span>
          </div>
        </div>
        <Header />
        <main className="flex-1 overflow-x-clip">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
