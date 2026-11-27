import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { supabaseServer } from '@/lib/supabase/server';
import { adminKontekst, erModerator } from '@/lib/admin';
import {
  I18N,
  erGyldigtSprog,
  oversaetStatus,
  deltaTekst,
  DATO_LOCALE,
  RAPPORT_RAMME,
  erGyldigRapportType,
  TYPE_FILNAVN,
  rapportKategoriLabel,
} from '@/lib/rapport-i18n';
import { getRapportFejl, getRapportKommentarer, getRapportBilleder, grupperEfterKategori } from '@/lib/rapport';
import { oversaetFejl } from '@/lib/oversaet';
import { forberedPdfFont, PDF_FONT, PDF_FONT_FED, PDF_FONT_KURSIV } from '@/lib/pdf-font';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // pdfkit kræver Node + filsystem til font-data.

const GRAFIT = '#17191d';
const KOBBER = '#c2683f';
const GRAA = '#656e7a';
const GROEN = '#4f6f4a';

// Foto-bevis (P37): billed-mål i PDF'en.
const BILLED_HOEJDE = 90; // fast højde pr. thumbnail (px)
const BILLED_SLOT = 120; // bredde pr. plads (fit holder billedet inde, bevarer aspekt)
const BILLED_GAP = 10; // mellemrum mellem thumbnails

// Hent ét billede server-side til en Buffer. Best-effort: en fejlet download
// (netværk, 404, bucket ikke nået) giver null, så rapporten aldrig crasher.
async function hentBillede(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  if (!(await erModerator())) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const topParam = searchParams.get('top');
  const antal = topParam === 'alle' ? 1_000_000 : Math.min(Math.max(Number(topParam) || 20, 1), 100);
  const sprog = erGyldigtSprog(searchParams.get('sprog'));
  const kunAendrede = searchParams.get('kunAendrede') === '1';
  const medKommentarer = searchParams.get('kommentarer') === '1';
  const medBilleder = searchParams.get('billeder') === '1';
  const rapportType = erGyldigRapportType(searchParams.get('type'));
  const t = I18N[sprog];
  const ramme = RAPPORT_RAMME[sprog][rapportType];

  const raaFejl = await getRapportFejl(rapportType, kunAendrede, antal);
  const fejl = await oversaetFejl(raaFejl, sprog);
  const kommMap = medKommentarer
    ? await getRapportKommentarer(fejl.map((f) => f.id), sprog)
    : {};

  // Foto-bevis (P37): download alle billed-bytes server-side FØR PDF-genereringen,
  // fordi pdfkit-tegningen nedenfor er synkron (doc.image kræver en Buffer i hånden).
  // Best-effort pr. billede; en fejlet download springes bare over. Kun når toggle
  // er slået til (embedding gør PDF'en tung, især ved top=alle).
  const billedBufMap: Record<string, Buffer[]> = {};
  if (medBilleder) {
    const urlMap = await getRapportBilleder(fejl.map((f) => f.id));
    await Promise.all(
      Object.entries(urlMap).map(async ([id, urls]) => {
        const bufs = (await Promise.all(urls.map(hentBillede))).filter(
          (b): b is Buffer => b !== null,
        );
        if (bufs.length > 0) billedBufMap[id] = bufs;
      }),
    );
  }

  const pdfBytes: Buffer = await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    // P40: Unicode-font (Liberation Sans, metrisk = Helvetica) + sanitering af
    // tegn fonten ikke kan tegne (emoji), så intet bliver til skrald.
    forberedPdfFont(doc);

    const sideBredde = doc.page.width - 100;
    const dato = new Date().toLocaleDateString(DATO_LOCALE[sprog], {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Header
    doc.rect(0, 0, doc.page.width, 110).fill(GRAFIT);
    for (let x = 0; x < doc.page.width; x += 40) doc.rect(x, 110, 20, 6).fill(KOBBER);
    doc.fillColor(KOBBER).fontSize(20).font(PDF_FONT_FED).text(ramme.titel, 50, 36);
    doc.fillColor('#ffffff').fontSize(11).font(PDF_FONT).text(t.undertitel, 50, 66);
    doc.fillColor('#a3a3ac').fontSize(9).text(t.genereret(dato, fejl.length), 50, 84);

    doc.y = 140;
    doc.x = 50;
    doc.fillColor(GRAFIT).fontSize(10).font(PDF_FONT).text(ramme.intro, { width: sideBredde });
    doc.moveDown(0.4);
    doc.fillColor(GRAA).fontSize(9).font(PDF_FONT_KURSIV).text(t.grupperetNote, { width: sideBredde });
    doc.moveDown(1);

    const grupper = grupperEfterKategori(fejl);

    const tegnFejl = (f: (typeof fejl)[number], i: number) => {
      if (doc.y > doc.page.height - 160) {
        doc.addPage();
        doc.y = 50;
      }
      const startY = doc.y;

      doc.rect(50, startY, sideBredde, 26).fill('#f6f6f7');
      doc.fillColor(GRAFIT).fontSize(12).font(PDF_FONT_FED).text(`#${i + 1}`, 58, startY + 7);
      doc
        .fillColor(GRAA)
        .fontSize(9)
        .font(PDF_FONT_FED)
        .text(`${f.stemmer} ${f.stemmer === 1 ? t.stemme : t.stemmer}`, doc.page.width - 150, startY + 8, {
          width: 92,
          align: 'right',
        });
      doc
        .fillColor(GRAFIT)
        .fontSize(13)
        .font(PDF_FONT_FED)
        .text(f.title, 90, startY + 4, { width: doc.page.width - 260 });
      doc.y = Math.max(doc.y, startY + 30);

      const delta = deltaTekst(f, sprog);
      if (delta) {
        doc.fontSize(9).font(PDF_FONT_FED).fillColor('#8a4028').text(`>> ${delta}`, 58, doc.y + 2, { width: sideBredde });
        doc.moveDown(0.2);
      }

      const bilBekr = f.variant_fordeling.reduce((s, r) => s + r.n, 0);
      if (bilBekr > 0) {
        const br = f.variant_fordeling.map((r) => `${r.n}× ${r.variant}`).join(', ');
        doc
          .fontSize(10)
          .font(PDF_FONT_FED)
          .fillColor(GROEN)
          .text(`${t.metaLabels.bilBekraeftet}: ${bilBekr}  -  ${br}`, 58, doc.y + 2, { width: sideBredde });
        doc.moveDown(0.2);
      }

      const metaDele = [`${t.metaLabels.model}: ${f.modeller || '-'}`];
      if (f.software_version) metaDele.push(`${t.metaLabels.software}: ${f.software_version}`);
      if (f.phone_model || f.phone_os) {
        metaDele.push(`${t.metaLabels.telefon}: ${[f.phone_model, f.phone_os].filter(Boolean).join(' / ')}`);
      }
      if (f.antal_svar > 0) metaDele.push(`${f.antal_svar} ${t.svar}`);
      metaDele.push(`${t.metaLabels.status}: ${oversaetStatus(f.status, sprog)}`);
      doc.fontSize(9).font(PDF_FONT_FED).fillColor(GRAA).text(metaDele.join('    |    '), 58, doc.y + 2, { width: sideBredde });
      doc.moveDown(0.5);

      doc.fontSize(10).font(PDF_FONT).fillColor('#2a2a2e').text(f.description, 58, doc.y, { width: sideBredde });

      const komm = kommMap[f.id] ?? [];
      if (medKommentarer && komm.length > 0) {
        doc.moveDown(0.5);
        doc.fontSize(9).font(PDF_FONT_FED).fillColor(GRAA).text(`${t.kommentarerOverskrift}:`, 58, doc.y, { width: sideBredde });
        doc.moveDown(0.2);
        for (const k of komm) {
          doc
            .fontSize(9)
            .font(PDF_FONT_KURSIV)
            .fillColor('#555')
            .text(`•  ${k.navn}: `, 66, doc.y, { width: sideBredde - 8, continued: true })
            .font(PDF_FONT)
            .fillColor('#2a2a2e')
            .text(k.tekst);
          doc.moveDown(0.15);
        }
      }

      // Foto-bevis (P37): indlejrede thumbnails, side om side, fast højde. pdfkit
      // kan kun JPEG/PNG - en WebP/GIF (eller korrupt fil) får doc.image til at
      // kaste, og fanges, så rapporten ikke crasher (billedet springes over).
      const bufs = medBilleder ? (billedBufMap[f.id] ?? []) : [];
      if (bufs.length > 0) {
        doc.moveDown(0.3);
        // Sidebryd-guard: hele billedrækken skal kunne være på siden (samme
        // doc.y-tjek som resten af koden).
        if (doc.y + BILLED_HOEJDE > doc.page.height - 70) {
          doc.addPage();
          doc.y = 50;
        }
        const raekkeY = doc.y;
        let x = 58;
        for (const buf of bufs) {
          try {
            doc.image(buf, x, raekkeY, {
              fit: [BILLED_SLOT, BILLED_HOEJDE],
              align: 'center',
              valign: 'center',
            });
          } catch {
            // Uunderstøttet format/korrupt billede - spring over, rapporten står.
          }
          x += BILLED_SLOT + BILLED_GAP;
        }
        doc.y = raekkeY + BILLED_HOEJDE;
        doc.moveDown(0.3);
      }

      doc.moveDown(0.6);
      doc.strokeColor('#e3e3e6').lineWidth(1).moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
      doc.moveDown(0.8);
    };

    grupper.forEach((g) => {
      // Sektions-overskrift pr. spand - undgå forældreløs header nederst.
      if (doc.y > doc.page.height - 200) {
        doc.addPage();
        doc.y = 50;
      }
      const gy = doc.y;
      const aggr =
        `${g.antal} ${g.antal === 1 ? t.post : t.poster}` +
        `  -  ${g.stemmer} ${g.stemmer === 1 ? t.stemme : t.stemmer}`;
      doc.rect(50, gy, sideBredde, 30).fill(GRAFIT);
      doc.rect(50, gy, 5, 30).fill(KOBBER);
      doc
        .fillColor('#ffffff')
        .fontSize(13)
        .font(PDF_FONT_FED)
        .text(rapportKategoriLabel(g.slug, sprog), 64, gy + 6, { width: sideBredde - 200, lineBreak: false });
      doc
        .fillColor(KOBBER)
        .fontSize(9)
        .font(PDF_FONT_FED)
        .text(aggr, doc.page.width - 250, gy + 10, { width: 192, align: 'right', lineBreak: false });
      doc.y = gy + 40;

      g.fejl.forEach((f, i) => tegnFejl(f, i));
    });

    // Footer på alle sider (uden at skabe nye tomme sider)
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      const gemtBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      const bundY = doc.page.height - 56;
      doc.strokeColor(KOBBER).lineWidth(2).moveTo(50, bundY).lineTo(doc.page.width - 50, bundY).stroke();
      doc
        .fontSize(8)
        .fillColor(GRAFIT)
        .font(PDF_FONT_FED)
        .text(t.sideAf(i + 1, range.count), doc.page.width - 150, bundY + 6, { width: 100, align: 'right', lineBreak: false });
      doc.fillColor(GRAA).fontSize(7).font(PDF_FONT).text(t.disclaimer, 50, bundY + 6, { width: sideBredde - 110, height: 44 });
      doc.page.margins.bottom = gemtBottom;
    }

    doc.end();
  });

  // Revisionslog
  const { displayName, rolle } = await adminKontekst();
  await supabaseServer()
    .from('rapport_log')
    .insert({
      navn: displayName || 'admin',
      rolle: rolle || 'moderator',
      format: 'pdf',
      type: rapportType,
      antal: topParam === 'alle' ? 'alle' : String(antal),
      kun_aendrede: kunAendrede,
      med_kommentarer: medKommentarer,
    });

  const datoFil = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="zeekr-garage-${TYPE_FILNAVN[sprog][rapportType]}-${t.filnavn}-${datoFil}.pdf"`,
    },
  });
}
