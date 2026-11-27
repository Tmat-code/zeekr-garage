import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/config';
import { hentSprog } from '@/lib/i18n/server';
import { ordbog } from '@/lib/i18n';

// Web-app-manifest: giver bookmark/"installér app" et rigtigt ikon + navn +
// grafit-tema i stedet for browserens grå bogstav-fallback. Next serverer den
// på /manifest.webmanifest og linker den automatisk. Ikonerne ligger i public/.
// Navn/beskrivelse på læserens UI-sprog (U1; samme opløsning som sitet).
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const sprog = await hentSprog();
  const t = ordbog(sprog);
  return {
    name: t.meta.manifestNavn(SITE.name),
    short_name: SITE.name,
    description: t.meta.manifestBeskrivelse,
    lang: sprog,
    start_url: '/',
    display: 'standalone',
    background_color: '#17191d',
    theme_color: '#17191d',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
