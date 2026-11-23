import { supabaseServer } from '@/lib/supabase/server';
import type { LinkGruppe, LinkPost } from '@/lib/types';

// Nyttige links (P19). Data'en bor i DB (link_groups + links, admin-styret via
// Vaerkstedet). Denne fallback spejler seed'en, saa links-siden stadig virker,
// hvis DB ikke kan naas - eller i vinduet mellem deploy og at migrationen er
// koert i Studio (samme princip som MODEL_FALLBACK). Blank modelSlug => "alle".
const FB = (
  navn: string,
  kilde: string | null,
  url: string,
  modelSlug: string | null,
  modelNavn: string | null,
  displayOrder: number,
): LinkPost => ({ id: `fb-${url}`, navn, kilde, url, modelSlug, modelNavn, displayOrder });

const FALLBACK: LinkGruppe[] = [
  {
    id: 'fb-officielt',
    titel: 'Officielt fra Zeekr',
    displayOrder: 10,
    links: [
      FB('Officiel modelside', 'zeekr.eu', 'https://www.zeekr.eu/da-dk/models/9x', 'zeekr-9x', 'Zeekr 9X', 10),
      FB('Officiel modelside', 'zeekr.eu', 'https://www.zeekr.eu/da-dk/models/7x', 'zeekr-7x', 'Zeekr 7X', 20),
      FB('Officiel modelside', 'zeekr.eu', 'https://www.zeekr.eu/da-dk/models/7gt', 'zeekr-7gt', 'Zeekr 7GT', 30),
      FB('Officiel modelside', 'zeekr.eu', 'https://www.zeekr.eu/da-dk/models/x', 'zeekr-x', 'Zeekr X', 40),
      FB('Officiel modelside', 'zeekr.eu', 'https://www.zeekr.eu/da-dk/models/001', 'zeekr-001', 'Zeekr 001', 50),
      FB('Connected Services', 'zeekr.eu', 'https://www.zeekr.eu/da-dk/connected', null, null, 60),
      FB('Brugermanualer & kontakt', 'zeekr.eu · alle modeller', 'https://www.zeekr.eu/da-dk/contact', null, null, 70),
    ],
  },
  {
    id: 'fb-specs',
    titel: 'Specs & test',
    displayOrder: 20,
    links: [
      FB('Tekniske detaljer', 'evkx.net', 'https://evkx.net/da/models/zeekr/7gt/7gt_privilege_awd/specifications/', 'zeekr-7gt', 'Zeekr 7GT', 10),
      FB('Anmeldelse & test', 'blog.bilbasen.dk', 'https://blog.bilbasen.dk/test-zeekr-7gt-kan-noget-kinesiske-elbiler-sjaeldent-mestrer', 'zeekr-7gt', 'Zeekr 7GT', 20),
      FB('Test & anmeldelse', 'fdm.dk', 'https://fdm.dk/tests/biltest/zeekr-7x-europaeisk-dna-kinesisk-elbil', 'zeekr-7x', 'Zeekr 7X', 30),
      FB('Test & anmeldelse', 'fdm.dk', 'https://fdm.dk/tests/proevekoersel/2023-11-zeekr-x-vild-snusfornuftig-suv', 'zeekr-x', 'Zeekr X', 40),
      FB('Test & anmeldelse', 'fdm.dk', 'https://fdm.dk/tests/biltest/zeekr-001-mere-komfort-end-teknik', 'zeekr-001', 'Zeekr 001', 50),
    ],
  },
  {
    id: 'fb-koeb',
    titel: 'Køb, pris & leasing',
    displayOrder: 30,
    links: [
      FB('Pris & info', 'viabiler.dk', 'https://www.viabiler.dk/zeekr/nye-biler/7gt/', 'zeekr-7gt', 'Zeekr 7GT', 10),
      FB('Pris & info', 'viabiler.dk', 'https://www.viabiler.dk/zeekr/nye-biler/7x/', 'zeekr-7x', 'Zeekr 7X', 20),
      FB('Pris & info', 'viabiler.dk', 'https://www.viabiler.dk/zeekr/nye-biler/x/', 'zeekr-x', 'Zeekr X', 30),
      FB('Pris & info', 'viabiler.dk', 'https://www.viabiler.dk/zeekr/nye-biler/001/', 'zeekr-001', 'Zeekr 001', 40),
      FB('Pris & info', 'viabiler.dk', 'https://www.viabiler.dk/zeekr/nye-biler/9x/', 'zeekr-9x', 'Zeekr 9X', 50),
      FB('Erhverv & leasing', 'viabiler.dk', 'https://www.viabiler.dk/fleet-info/zeekr-fleet/zeekr-7gt/', 'zeekr-7gt', 'Zeekr 7GT', 60),
      FB('Privatleasing', 'autohus.dk', 'https://www.autohus.dk/vi-tilbyder/privatleasing/zeekr-privatleasing/', null, null, 70),
      FB('Nye biler', 'autohus.dk', 'https://www.autohus.dk/nye-biler/zeekr/#nye', null, null, 80),
      FB('Biler på markedet', 'bilbasen.dk', 'https://www.bilbasen.dk/brugt/bil/zeekr/7gt', 'zeekr-7gt', 'Zeekr 7GT', 90),
    ],
  },
  {
    id: 'fb-tilbehoer',
    titel: 'Tilbehør & dele',
    displayOrder: 40,
    links: [
      FB('Eftermarkedsudstyr (EU)', 'evstitan.com', 'https://www.evstitan.com/collections/zeekr-7-gt-accessories', 'zeekr-7gt', 'Zeekr 7GT', 10),
      FB('Eftermarkedsudstyr (globalt)', 'niceevs.com', 'https://niceevs.com/collections/zeekr-7gt-accessories', 'zeekr-7gt', 'Zeekr 7GT', 20),
      FB('Eftermarkedsudstyr', 'evstitan.com', 'https://www.evstitan.com/collections/zeekr-7x-accessories', 'zeekr-7x', 'Zeekr 7X', 30),
      FB('Eftermarkedsudstyr', 'evstitan.com', 'https://www.evstitan.com/collections/zeekr-x-accessories', 'zeekr-x', 'Zeekr X', 40),
      FB('Eftermarkedsudstyr', 'evstitan.com', 'https://www.evstitan.com/collections/zeekr-001-accessories', 'zeekr-001', 'Zeekr 001', 50),
      FB('Fælge & dæk', 'keratech.dk', 'https://keratech.dk/', null, null, 60),
      FB('Vinduesviskere', 'viskerbladet.dk', 'https://www.viskerbladet.dk/a620s-bosch-aerotwin-viskerblade-fladblade-vinduesvisker-saet', 'zeekr-7gt', 'Zeekr 7GT', 70),
    ],
  },
  {
    id: 'fb-praktisk',
    titel: 'Praktisk & fællesskab',
    displayOrder: 50,
    links: [
      FB('Fragt- & biltracking', 'hoeghautoliners.com', 'https://www.hoeghautoliners.com/my-cargo', null, null, 10),
      FB('Fællesskab & erfaringer', 'Facebook-gruppe', 'https://www.facebook.com/share/g/1DVmwAa8hR/?mibextid=wwXIfr', null, null, 20),
    ],
  },
];

// Hent alle link-grupper med deres links (offentlig laesning). Sorteret paa
// display_order (gruppe + link). Falder tilbage til FALLBACK hvis DB ikke kan
// naas eller tabellen endnu ikke findes (foer migrationen er koert) - med mindre
// opts.fallback = false (bruges af admin-siden, hvor en tom DB skal vises aerligt).
export async function getLinkGrupper(opts?: { fallback?: boolean }): Promise<LinkGruppe[]> {
  const brugFallback = opts?.fallback ?? true;
  const sb = supabaseServer();
  const { data, error } = await sb
    .from('link_groups')
    .select(
      'id, titel, display_order, links ( id, navn, kilde, url, display_order, model:models ( slug, name ) )',
    );

  if (error || !data) return brugFallback ? FALLBACK : [];

  const grupper: LinkGruppe[] = (data as any[])
    .map((g) => ({
      id: g.id,
      titel: g.titel,
      displayOrder: g.display_order ?? 0,
      links: ((g.links ?? []) as any[])
        .map(
          (l): LinkPost => ({
            id: l.id,
            navn: l.navn,
            kilde: l.kilde ?? null,
            url: l.url,
            modelSlug: l.model?.slug ?? null,
            modelNavn: l.model?.name ?? null,
            displayOrder: l.display_order ?? 0,
          }),
        )
        .sort((a, b) => a.displayOrder - b.displayOrder),
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder);

  if (grupper.length === 0) return brugFallback ? FALLBACK : [];
  return grupper;
}
