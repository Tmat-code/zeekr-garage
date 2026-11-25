import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { adminKontekst, erModerator } from '@/lib/admin';
import {
  I18N,
  erGyldigtSprog,
  oversaetStatus,
  deltaTekst,
  erGyldigRapportType,
  rapportKategoriLabel,
} from '@/lib/rapport-i18n';
import { getRapportFejl, getRapportKommentarer, getRapportBilleder, grupperEfterKategori } from '@/lib/rapport';
import { oversaetFejl } from '@/lib/oversaet';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  if (!(await erModerator())) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const topParam = searchParams.get('top');
  const antal = topParam === 'alle' ? 1_000_000 : Math.min(Math.max(Number(topParam) || 20, 1), 200);
  const sprog = erGyldigtSprog(searchParams.get('sprog'));
  const kunAendrede = searchParams.get('kunAendrede') === '1';
  const medKommentarer = searchParams.get('kommentarer') === '1';
  const medBilleder = searchParams.get('billeder') === '1';
  const rapportType = erGyldigRapportType(searchParams.get('type'));
  const t = I18N[sprog];

  const raaFejl = await getRapportFejl(rapportType, kunAendrede, antal);
  const fejl = await oversaetFejl(raaFejl, sprog);
  const kommMap = medKommentarer ? await getRapportKommentarer(fejl.map((f) => f.id), sprog) : {};
  // Foto-bevis (P37): offentlige URL'er pr. melding, klikbare i Excel/Calc hvis
  // bucketen er offentligt nåelig. Kun når toggle er slået til (kolonnen udelades
  // ellers, så default-CSV'en er uændret).
  const billederMap = medBilleder ? await getRapportBilleder(fejl.map((f) => f.id)) : {};

  function esc(v: string | number): string {
    return `"${String(v).replace(/"/g, '""')}"`;
  }

  // Grupperet efter kategori-spand (samme rækkefølge som PDF'en); "Kategori"-
  // kolonnen gør grupperingen filtrerbar i Excel/Calc. Placering løber globalt.
  const grupper = grupperEfterKategori(fejl);
  let rang = 0;
  const raekker: string[] = [];
  for (const g of grupper) {
    const katLabel = rapportKategoriLabel(g.slug, sprog);
    for (const f of g.fejl) {
      rang += 1;
      const bilBekr = f.variant_fordeling.reduce((s, r) => s + r.n, 0);
      const varianter = f.variant_fordeling.map((r) => `${r.n}× ${r.variant}`).join(', ');
      const kommentarer = (kommMap[f.id] ?? []).map((k) => `${k.navn}: ${k.tekst}`).join('  |  ');
      const felter: (string | number)[] = [
        rang,
        f.stemmer,
        deltaTekst(f, sprog),
        bilBekr,
        varianter,
        f.antal_svar,
        f.title,
        f.modeller,
        katLabel,
        f.software_version ?? '',
        f.phone_model ?? '',
        f.phone_os ?? '',
        oversaetStatus(f.status, sprog),
        f.description,
        f.created_at,
        kommentarer,
      ];
      // Billeder-kolonnen (offentlige URL'er, mellemrums-joinet) tilføjes KUN når
      // toggle er slået til - matcher 'Billeder' sidst i t.csvKolonner nedenfor.
      if (medBilleder) felter.push((billederMap[f.id] ?? []).join(' '));
      raekker.push(felter.map(esc).join(';'));
    }
  }

  // BOM + semikolon → åbner korrekt i dansk Excel/LibreOffice Calc.
  // 'Billeder' er sidste kolonne i t.csvKolonner; udelades når toggle er slået fra.
  const kolonner = medBilleder ? t.csvKolonner : t.csvKolonner.slice(0, -1);
  const csv = '﻿' + [kolonner.map(esc).join(';'), ...raekker].join('\r\n');

  const { displayName, rolle } = await adminKontekst();
  await supabaseServer()
    .from('rapport_log')
    .insert({
      navn: displayName || 'admin',
      rolle: rolle || 'moderator',
      format: 'csv',
      type: rapportType,
      antal: topParam === 'alle' ? 'alle' : String(antal),
      kun_aendrede: kunAendrede,
      med_kommentarer: medKommentarer,
    });

  const dato = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="zeekr-garage-${t.filnavn}-top${antal}-${dato}.csv"`,
    },
  });
}
