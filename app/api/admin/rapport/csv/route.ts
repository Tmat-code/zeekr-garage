import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { adminKontekst, erModerator } from '@/lib/admin';
import {
  I18N,
  erGyldigtSprog,
  oversaetStatus,
  deltaTekst,
  erGyldigRapportType,
} from '@/lib/rapport-i18n';
import { getRapportFejl, getRapportKommentarer } from '@/lib/rapport';
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
  const rapportType = erGyldigRapportType(searchParams.get('type'));
  const t = I18N[sprog];

  const raaFejl = await getRapportFejl(rapportType, kunAendrede, antal);
  const fejl = await oversaetFejl(raaFejl, sprog);
  const kommMap = medKommentarer ? await getRapportKommentarer(fejl.map((f) => f.id), sprog) : {};

  function esc(v: string | number): string {
    return `"${String(v).replace(/"/g, '""')}"`;
  }

  const raekker = fejl.map((f, i) => {
    const bilBekr = f.variant_fordeling.reduce((s, r) => s + r.n, 0);
    const varianter = f.variant_fordeling.map((r) => `${r.n}× ${r.variant}`).join(', ');
    const kommentarer = (kommMap[f.id] ?? []).map((k) => `${k.navn}: ${k.tekst}`).join('  |  ');
    return [
      i + 1,
      f.stemmer,
      deltaTekst(f, sprog),
      bilBekr,
      varianter,
      f.antal_svar,
      f.title,
      f.modeller,
      f.software_version ?? '',
      f.phone_model ?? '',
      f.phone_os ?? '',
      oversaetStatus(f.status, sprog),
      f.description,
      f.created_at,
      kommentarer,
    ]
      .map(esc)
      .join(';');
  });

  // BOM + semikolon → åbner korrekt i dansk Excel/LibreOffice Calc.
  const csv = '﻿' + [t.csvKolonner.map(esc).join(';'), ...raekker].join('\r\n');

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
