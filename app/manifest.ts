import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/config';

// Web-app-manifest: giver bookmark/"installér app" et rigtigt ikon + navn +
// grafit-tema i stedet for browserens grå bogstav-fallback. Next serverer den
// på /manifest.webmanifest og linker den automatisk. Ikonerne ligger i public/.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} - uofficielt community for Zeekr-ejere`,
    short_name: SITE.name,
    description:
      'Uofficielt, uafhængigt community for Zeekr-ejere i Norden - meld, bekræft og stem på softwarefejl.',
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
