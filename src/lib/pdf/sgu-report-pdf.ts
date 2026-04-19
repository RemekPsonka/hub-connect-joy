import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SGUReportSnapshot } from '@/types/sgu-report-snapshot';
import { PERIOD_TYPE_LABELS, SEVERITY_LABELS } from '@/types/sgu-report-snapshot';

interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number };
}

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 15;

const PL_MAP: Record<string, string> = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ź: 'z',
  ż: 'z',
  Ą: 'A',
  Ć: 'C',
  Ę: 'E',
  Ł: 'L',
  Ń: 'N',
  Ó: 'O',
  Ś: 'S',
  Ź: 'Z',
  Ż: 'Z',
};

/**
 * jsPDF helvetica nie obsługuje polskich znaków diakrytycznych.
 * Stosujemy transliterację (zgodnie z patternem w innych modułach CRM,
 * np. exportInsuranceBrief / exportProspectBriefs).
 */
const tx = (input: string | number | null | undefined): string => {
  if (input === null || input === undefined) return '';
  const s = String(input);
  return s.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, (m) => PL_MAP[m] ?? m);
};

const fmtPLN = (gr: number): string => {
  const value = (gr / 100).toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value} PLN`.replace(/\u00a0/g, ' ');
};

const fmtPct = (n: number): string => `${n.toFixed(1).replace('.', ',')}%`;

const fmtDate = (iso: string): string => {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
};

const COVER_BG: [number, number, number] = [15, 27, 61];

function drawCover(doc: JsPDFWithAutoTable, snapshot: SGUReportSnapshot) {
  doc.setFillColor(...COVER_BG);
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.text(tx('Raport SGU'), MARGIN, 90);

  doc.setFontSize(20);
  doc.setFont('helvetica', 'normal');
  doc.text(tx(PERIOD_TYPE_LABELS[snapshot.period_type]), MARGIN, 110);

  doc.setFontSize(14);
  doc.text(
    tx(`Okres: ${fmtDate(snapshot.period_start)} - ${fmtDate(snapshot.period_end)}`),
    MARGIN,
    130,
  );

  doc.setFontSize(11);
  doc.text(
    tx(`Wygenerowano: ${new Date(snapshot.generated_at).toLocaleString('pl-PL')}`),
    MARGIN,
    145,
  );
  doc.text(
    tx(`Tryb: ${snapshot.generated_by === 'cron' ? 'automatyczny' : 'reczny'}`),
    MARGIN,
    155,
  );

  doc.setTextColor(0, 0, 0);
}

function sectionHeader(doc: jsPDF, title: string, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...COVER_BG);
  doc.text(tx(title), MARGIN, y);
  doc.setTextColor(0, 0, 0);
  return y + 6;
}

function renderKPI(doc: JsPDFWithAutoTable, snapshot: SGUReportSnapshot, startY: number): number {
  const kpi = snapshot.data.kpi;
  const deltas = snapshot.data.comparison_previous_period?.deltas ?? [];
  const deltaFor = (m: string) => {
    const d = deltas.find((x) => x.metric === m);
    if (!d || d.delta_pct === null) return '-';
    const sign = d.delta_pct > 0 ? '+' : '';
    return `${sign}${d.delta_pct.toFixed(1).replace('.', ',')}%`;
  };

  const y = sectionHeader(doc, 'Kluczowe wskazniki', startY);
  autoTable(doc, {
    startY: y,
    head: [['Wskaznik', 'Wartosc', 'Zmiana vs poprzedni']],
    body: [
      [tx('Sprzedane polisy'), String(kpi.policies_sold_count), deltaFor('policies_sold_count')],
      [tx('GWP'), fmtPLN(kpi.gwp_pln), deltaFor('gwp_pln')],
      [tx('Prowizje'), fmtPLN(kpi.commission_pln), deltaFor('commission_pln')],
      [tx('Zadania zakonczone'), String(kpi.completed_tasks_count), deltaFor('completed_tasks_count')],
      [tx('Nowe leady'), String(kpi.new_leads_count), deltaFor('new_leads_count')],
      [tx('Konwersja'), fmtPct(kpi.conversion_rate_pct), deltaFor('conversion_rate_pct')],
    ],
    theme: 'striped',
    headStyles: { fillColor: COVER_BG, textColor: [255, 255, 255] },
    margin: { left: MARGIN, right: MARGIN },
  });
  return doc.lastAutoTable.finalY + 8;
}

function renderTopProducts(doc: JsPDFWithAutoTable, snapshot: SGUReportSnapshot, startY: number): number {
  const rows = snapshot.data.top_products ?? [];
  if (rows.length === 0) return startY;
  const y = sectionHeader(doc, 'Top produkty', startY);
  autoTable(doc, {
    startY: y,
    head: [['Produkt', 'Polisy', 'GWP', 'Prowizja']],
    body: rows.map((p) => [
      tx(p.product_name),
      String(p.policies_count),
      fmtPLN(p.gwp_pln),
      fmtPLN(p.commission_pln),
    ]),
    theme: 'striped',
    headStyles: { fillColor: COVER_BG, textColor: [255, 255, 255] },
    margin: { left: MARGIN, right: MARGIN },
  });
  return doc.lastAutoTable.finalY + 8;
}

function renderTeamPerf(doc: JsPDFWithAutoTable, snapshot: SGUReportSnapshot, startY: number): number {
  const rows = snapshot.data.team_performance ?? [];
  if (rows.length === 0) return startY;
  const y = sectionHeader(doc, 'Wyniki zespolu', startY);
  autoTable(doc, {
    startY: y,
    head: [['Osoba', 'Polisy', 'GWP', 'Prowizja']],
    body: rows.map((r) => [tx(r.full_name), String(r.policies_count), fmtPLN(r.gwp_pln), fmtPLN(r.commission_pln)]),
    theme: 'striped',
    headStyles: { fillColor: COVER_BG, textColor: [255, 255, 255] },
    margin: { left: MARGIN, right: MARGIN },
  });
  return doc.lastAutoTable.finalY + 8;
}

function renderCommissionBreakdown(
  doc: JsPDFWithAutoTable,
  snapshot: SGUReportSnapshot,
  startY: number,
): number {
  const rows = snapshot.data.commission_breakdown ?? [];
  if (rows.length === 0) return startY;
  const y = sectionHeader(doc, 'Podzial prowizji', startY);
  autoTable(doc, {
    startY: y,
    head: [['Odbiorca', 'Kwota', 'Udzial']],
    body: rows.map((r) => [tx(r.recipient_label), fmtPLN(r.amount_pln), fmtPct(r.share_pct)]),
    theme: 'striped',
    headStyles: { fillColor: COVER_BG, textColor: [255, 255, 255] },
    margin: { left: MARGIN, right: MARGIN },
  });
  return doc.lastAutoTable.finalY + 8;
}

function renderAlerts(doc: JsPDFWithAutoTable, snapshot: SGUReportSnapshot, startY: number): number {
  const alerts = snapshot.data.alerts ?? [];
  if (alerts.length === 0) return startY;
  const y = sectionHeader(doc, 'Alerty', startY);
  autoTable(doc, {
    startY: y,
    head: [['Poziom', 'Kod', 'Komunikat']],
    body: alerts.map((a) => [tx(SEVERITY_LABELS[a.severity]), tx(a.code), tx(a.message)]),
    theme: 'grid',
    headStyles: { fillColor: COVER_BG, textColor: [255, 255, 255] },
    margin: { left: MARGIN, right: MARGIN },
  });
  return doc.lastAutoTable.finalY + 8;
}

function addFooters(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    if (i === 1) continue; // cover bez footera
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(tx(`Strona ${i} / ${pageCount}`), PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 8, {
      align: 'right',
    });
    doc.text(tx('Sieć Generacji Ubezpieczeń — raport'), MARGIN, PAGE_HEIGHT - 8);
  }
}

export function generateSGUReportPDF(snapshot: SGUReportSnapshot): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as JsPDFWithAutoTable;
  drawCover(doc, snapshot);

  doc.addPage();
  let y = MARGIN + 5;
  y = renderKPI(doc, snapshot, y);
  y = renderTopProducts(doc, snapshot, y);
  if (y > PAGE_HEIGHT - 60) {
    doc.addPage();
    y = MARGIN + 5;
  }
  y = renderTeamPerf(doc, snapshot, y);
  if (y > PAGE_HEIGHT - 60) {
    doc.addPage();
    y = MARGIN + 5;
  }
  y = renderCommissionBreakdown(doc, snapshot, y);
  if (y > PAGE_HEIGHT - 60) {
    doc.addPage();
    y = MARGIN + 5;
  }
  renderAlerts(doc, snapshot, y);

  addFooters(doc);
  return doc.output('blob');
}

export function buildSGUReportFilename(snapshot: SGUReportSnapshot): string {
  const period = PERIOD_TYPE_LABELS[snapshot.period_type].toLowerCase();
  return `SGU_raport_${tx(period)}_${snapshot.period_start}.pdf`;
}
