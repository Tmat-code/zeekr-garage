export const metadata = {
  title: 'Nyttige links',
  description:
    'Nyttige links for Zeekr-ejere: officielt fra Zeekr, test og specs, køb, tilbehør og praktisk.',
};

type LinkPost = { navn: string; kilde: string; url: string };
type LinkGruppe = { titel: string; links: LinkPost[] };

// Porteret fra bugherrer.dk/links. Mest 7GT endnu — udvides pr. model efterhånden.
const LINK_GRUPPER: LinkGruppe[] = [
  {
    titel: 'Officielt fra Zeekr',
    links: [
      { navn: 'Officiel modelside', kilde: 'zeekr.eu', url: 'https://www.zeekr.eu/models/7gt' },
      { navn: 'Connected Services', kilde: 'zeekr.eu', url: 'https://www.zeekr.eu/models/7gt' },
      {
        navn: 'Brugermanual (7GT)',
        kilde: 'zeekr.eu · dansk',
        url: 'https://www.zeekr.eu/manual-result?vk=AAF9&yk=MZ18&lk=da_DK&ln=Dansk&vn=7GT&yn=2026&ven=Long+Range+RWD',
      },
      {
        navn: 'Brugermanualer — vælg din model',
        kilde: 'zeekr.eu · alle modeller',
        url: 'https://www.zeekr.eu/contact',
      },
    ],
  },
  {
    titel: 'Specs & test',
    links: [
      {
        navn: 'Tekniske detaljer',
        kilde: 'evkx.net',
        url: 'https://evkx.net/da/models/zeekr/7gt/7gt_privilege_awd/specifications/',
      },
      {
        navn: 'Anmeldelse & test',
        kilde: 'blog.bilbasen.dk',
        url: 'https://blog.bilbasen.dk/test-zeekr-7gt-kan-noget-kinesiske-elbiler-sjaeldent-mestrer',
      },
    ],
  },
  {
    titel: 'Køb, pris & leasing',
    links: [
      { navn: 'Pris & info', kilde: 'viabiler.dk', url: 'https://www.viabiler.dk/zeekr/nye-biler/7gt/' },
      {
        navn: 'Erhverv & leasing',
        kilde: 'viabiler.dk',
        url: 'https://www.viabiler.dk/fleet-info/zeekr-fleet/zeekr-7gt/',
      },
      { navn: 'Biler på markedet', kilde: 'bilbasen.dk', url: 'https://www.bilbasen.dk/brugt/bil/zeekr/7gt' },
    ],
  },
  {
    titel: 'Tilbehør & dele',
    links: [
      {
        navn: 'Eftermarkedsudstyr (EU)',
        kilde: 'evstitan.com',
        url: 'https://www.evstitan.com/collections/zeekr-7-gt-accessories',
      },
      {
        navn: 'Eftermarkedsudstyr (globalt)',
        kilde: 'niceevs.com',
        url: 'https://niceevs.com/collections/zeekr-7gt-accessories',
      },
      { navn: 'Fælge & dæk', kilde: 'keratech.dk', url: 'https://keratech.dk/' },
      {
        navn: 'Vinduesviskere',
        kilde: 'viskerbladet.dk',
        url: 'https://www.viskerbladet.dk/a620s-bosch-aerotwin-viskerblade-fladblade-vinduesvisker-saet',
      },
    ],
  },
  {
    titel: 'Praktisk & fællesskab',
    links: [
      {
        navn: 'Fragt- & biltracking',
        kilde: 'hoeghautoliners.com',
        url: 'https://www.hoeghautoliners.com/my-cargo',
      },
      {
        navn: 'Fællesskab & erfaringer',
        kilde: 'Facebook-gruppe',
        url: 'https://www.facebook.com/share/g/1DVmwAa8hR/?mibextid=wwXIfr',
      },
    ],
  },
];

export default function LinksSide() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-grafit-900 sm:text-4xl">
        Nyttige links
      </h1>
      <p className="mt-3 max-w-2xl text-grafit-600">
        Ting vi selv bruger som Zeekr-ejere: officielt fra Zeekr, test og specs, køb og tilbehør,
        og lidt praktisk. Mest 7GT lige nu — flere modeller følger, efterhånden som ejerne bidrager.
      </p>
      <p className="mt-2 text-sm text-grafit-400">
        Vi tjener ikke på nogen af linkene. Eksterne sider åbner i et nyt faneblad.
      </p>

      {LINK_GRUPPER.map((gruppe) => (
        <section key={gruppe.titel} className="mt-8">
          <h2 className="font-display text-sm font-bold tracking-wide text-kobber-700">{gruppe.titel}</h2>
          <div className="mt-3 divide-y divide-grafit-100 overflow-hidden rounded-xl border border-grafit-200 bg-white">
            {gruppe.links.map((l) => (
              <a
                key={l.navn + l.url}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-grafit-50"
              >
                <div>
                  <div className="font-medium text-grafit-900">{l.navn}</div>
                  <div className="text-xs text-grafit-400">{l.kilde}</div>
                </div>
                <span className="text-grafit-300" aria-hidden="true">
                  ↗
                </span>
              </a>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
