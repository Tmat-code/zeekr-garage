import { supabaseServer } from '@/lib/supabase/server';
import type { LinkGruppe, LinkModel, LinkPost } from '@/lib/types';

// Nyttige links (P19). Data'en bor i DB (link_groups + links + link_models,
// admin-styret via Vaerkstedet). Denne fallback spejler seed'en, saa links-
// siden stadig virker, hvis DB ikke kan naas - eller i vinduet mellem deploy og
// at migrationen er koert i Studio (samme princip som MODEL_FALLBACK). Tom
// modeller-liste => "gaelder alle".
const M: Record<string, LinkModel> = {
  '9x': { slug: 'zeekr-9x', name: 'Zeekr 9X' },
  '7x': { slug: 'zeekr-7x', name: 'Zeekr 7X' },
  '7gt': { slug: 'zeekr-7gt', name: 'Zeekr 7GT' },
  x: { slug: 'zeekr-x', name: 'Zeekr X' },
  '001': { slug: 'zeekr-001', name: 'Zeekr 001' },
};
const FB = (
  navn: string,
  kilde: string | null,
  url: string,
  modeller: LinkModel[],
  displayOrder: number,
): LinkPost => ({ id: `fb-${url}`, navn, kilde, url, modeller, displayOrder });

const FALLBACK: LinkGruppe[] = [
  {
    id: 'fb-officielt',
    titel: 'Officielt fra Zeekr',
    displayOrder: 10,
    links: [
      FB('Officiel modelside', 'zeekr.eu', 'https://www.zeekr.eu/da-dk/models/9x', [M['9x']], 10),
      FB('Officiel modelside', 'zeekr.eu', 'https://www.zeekr.eu/da-dk/models/7x', [M['7x']], 20),
      FB('Officiel modelside', 'zeekr.eu', 'https://www.zeekr.eu/da-dk/models/7gt', [M['7gt']], 30),
      FB('Officiel modelside', 'zeekr.eu', 'https://www.zeekr.eu/da-dk/models/x', [M.x], 40),
      FB('Officiel modelside', 'zeekr.eu', 'https://www.zeekr.eu/da-dk/models/001', [M['001']], 50),
      FB('Connected Services', 'zeekr.eu', 'https://www.zeekr.eu/da-dk/connected', [], 60),
      FB('Brugermanualer & kontakt', 'zeekr.eu · alle modeller', 'https://www.zeekr.eu/da-dk/contact', [], 70),
    ],
  },
  {
    id: 'fb-specs',
    titel: 'Specs & test',
    displayOrder: 20,
    links: [
      FB('Tekniske detaljer', 'evkx.net', 'https://evkx.net/da/models/zeekr/7gt/7gt_privilege_awd/specifications/', [M['7gt']], 10),
      FB('Anmeldelse & test', 'blog.bilbasen.dk', 'https://blog.bilbasen.dk/test-zeekr-7gt-kan-noget-kinesiske-elbiler-sjaeldent-mestrer', [M['7gt']], 20),
      FB('Test & anmeldelse', 'fdm.dk', 'https://fdm.dk/tests/biltest/zeekr-7x-europaeisk-dna-kinesisk-elbil', [M['7x']], 30),
      FB('Test & anmeldelse', 'fdm.dk', 'https://fdm.dk/tests/proevekoersel/2023-11-zeekr-x-vild-snusfornuftig-suv', [M.x], 40),
      FB('Test & anmeldelse', 'fdm.dk', 'https://fdm.dk/tests/biltest/zeekr-001-mere-komfort-end-teknik', [M['001']], 50),
    ],
  },
  {
    id: 'fb-koeb',
    titel: 'Køb, pris & leasing',
    displayOrder: 30,
    links: [
      FB('Pris & info', 'viabiler.dk', 'https://www.viabiler.dk/zeekr/nye-biler/7gt/', [M['7gt']], 10),
      FB('Pris & info', 'viabiler.dk', 'https://www.viabiler.dk/zeekr/nye-biler/7x/', [M['7x']], 20),
      FB('Pris & info', 'viabiler.dk', 'https://www.viabiler.dk/zeekr/nye-biler/x/', [M.x], 30),
      FB('Pris & info', 'viabiler.dk', 'https://www.viabiler.dk/zeekr/nye-biler/001/', [M['001']], 40),
      FB('Pris & info', 'viabiler.dk', 'https://www.viabiler.dk/zeekr/nye-biler/9x/', [M['9x']], 50),
      FB('Erhverv & leasing', 'viabiler.dk', 'https://www.viabiler.dk/fleet-info/zeekr-fleet/zeekr-7gt/', [M['7gt']], 60),
      FB('Privatleasing', 'autohus.dk', 'https://www.autohus.dk/vi-tilbyder/privatleasing/zeekr-privatleasing/', [], 70),
      FB('Nye biler', 'autohus.dk', 'https://www.autohus.dk/nye-biler/zeekr/#nye', [], 80),
      FB('Biler på markedet', 'bilbasen.dk', 'https://www.bilbasen.dk/brugt/bil/zeekr', [], 90),
    ],
  },
  {
    id: 'fb-tilbehoer',
    titel: 'Tilbehør & dele',
    displayOrder: 40,
    links: [
      FB('Eftermarkedsudstyr', 'evstitan.com', 'https://www.evstitan.com/collections/zeekr-accessories', [M['7gt'], M['7x'], M.x, M['001']], 10),
      FB('Eftermarkedsudstyr (globalt)', 'niceevs.com', 'https://niceevs.com/collections/zeekr-7gt-accessories', [M['7gt']], 20),
      FB('Fælge & dæk', 'keratech.dk', 'https://keratech.dk/', [], 30),
      FB('Vinduesviskere', 'viskerbladet.dk', 'https://www.viskerbladet.dk/a620s-bosch-aerotwin-viskerblade-fladblade-vinduesvisker-saet', [M['7gt']], 40),
    ],
  },
  {
    id: 'fb-praktisk',
    titel: 'Praktisk & fællesskab',
    displayOrder: 50,
    links: [
      FB('Fragt- & biltracking', 'hoeghautoliners.com', 'https://www.hoeghautoliners.com/my-cargo', [], 10),
      FB('Fællesskab & erfaringer', 'Facebook-gruppe', 'https://www.facebook.com/share/g/1DVmwAa8hR/?mibextid=wwXIfr', [], 20),
    ],
  },
];

// Hent alle link-grupper med deres links + model-tags (offentlig laesning).
// Sorteret paa display_order (gruppe + link); badges i models' display_order.
// Falder tilbage til FALLBACK hvis DB ikke kan naas eller tabellen endnu ikke
// findes - med mindre opts.fallback = false (admin-siden viser en tom DB aerligt).
export async function getLinkGrupper(opts?: { fallback?: boolean }): Promise<LinkGruppe[]> {
  const brugFallback = opts?.fallback ?? true;
  const sb = supabaseServer();
  const { data, error } = await sb
    .from('link_groups')
    .select(
      'id, titel, display_order, links ( id, navn, kilde, url, display_order, link_models ( model:models ( slug, name, display_order ) ) )',
    );

  if (error || !data) return brugFallback ? FALLBACK : [];

  const grupper: LinkGruppe[] = (data as any[])
    .map((g) => ({
      id: g.id,
      titel: g.titel,
      displayOrder: g.display_order ?? 0,
      links: ((g.links ?? []) as any[])
        .map((l): LinkPost => {
          const modeller: LinkModel[] = ((l.link_models ?? []) as any[])
            .map((lm) => lm.model)
            .filter(Boolean)
            .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
            .map((m: any) => ({ slug: m.slug, name: m.name }));
          return {
            id: l.id,
            navn: l.navn,
            kilde: l.kilde ?? null,
            url: l.url,
            modeller,
            displayOrder: l.display_order ?? 0,
          };
        })
        .sort((a, b) => a.displayOrder - b.displayOrder),
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder);

  if (grupper.length === 0) return brugFallback ? FALLBACK : [];
  return grupper;
}
