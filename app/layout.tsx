import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SITE } from '@/lib/config';

const BESKRIVELSE =
  'Uofficielt, uafhaengigt community for Zeekr-ejere i Norden. Meld, bekraeft og stem paa softwarefejl paa tvaers af modeller — og saml dem i rapporter til Zeekr.';

export const metadata: Metadata = {
  metadataBase: new URL(`https://${SITE.domain}`),
  title: {
    default: `${SITE.name} – Uofficielt community for Zeekr-ejere`,
    template: `%s – ${SITE.name}`,
  },
  description: BESKRIVELSE,
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'da_DK',
    siteName: SITE.name,
    title: `${SITE.name} – Uofficielt community for Zeekr-ejere`,
    description: BESKRIVELSE,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da">
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
