import type { Metadata, Viewport } from 'next';
// Display-font Archivo via @fontsource (self-hosted, ingen Google-request ved build/runtime).
import '@fontsource/archivo/500.css';
import '@fontsource/archivo/600.css';
import '@fontsource/archivo/700.css';
import '@fontsource/archivo/800.css';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SITE } from '@/lib/config';
import { hentSprog } from '@/lib/i18n/server';
import { ordbog } from '@/lib/i18n';
import { SprogProvider } from '@/lib/i18n/klient';

// Metadata på læserens UI-sprog (U1). Stierne er de samme på alle sprog (intet
// URL-præfiks), så søgemaskiner (tom Accept-Language -> dansk) ser den danske.
export async function generateMetadata(): Promise<Metadata> {
  const t = ordbog(await hentSprog());
  const titel = t.meta.titelStandard(SITE.name);
  return {
    metadataBase: new URL(`https://${SITE.domain}`),
    title: {
      default: titel,
      template: `%s - ${SITE.name}`,
    },
    description: t.meta.beskrivelse,
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      locale: t.meta.ogLocale,
      siteName: SITE.name,
      title: titel,
      description: t.meta.beskrivelse,
      // Delings-/preview-billede (grafit+kobber-banner). metadataBase gør den absolut,
      // så Facebook/Messenger + vores egne forum-link-kort (P38) viser et billede.
      images: [
        {
          url: '/og-default.png',
          width: 1200,
          height: 630,
          alt: t.meta.ogAlt(SITE.name),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: titel,
      description: t.meta.beskrivelse,
      images: ['/og-default.png'],
    },
  };
}

// Grafit tema-farve (browser-UI/adresselinje + app-splash). Matcher ikonet.
export const viewport: Viewport = {
  themeColor: '#17191d',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sprog = await hentSprog();
  const t = ordbog(sprog);
  return (
    <html lang={sprog}>
      <body className="flex min-h-screen flex-col">
        <SprogProvider sprog={sprog}>
          <div className="bg-grafit-900 text-grafit-300">
            <div className="mx-auto flex max-w-5xl items-center justify-center gap-2 px-4 py-1.5 text-center text-xs">
              <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-kobber-500" aria-hidden="true" />
              <span>{t.ramme.underOpbygning(SITE.name)}</span>
            </div>
          </div>
          <Header />
          <main className="flex-1 overflow-x-clip">{children}</main>
          <Footer />
        </SprogProvider>
      </body>
    </html>
  );
}
