import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type {
  TypDzialnosci,
  RyzykoMajatkowe,
  RyzykoOC,
  RyzykoFlota,
  RyzykoSpecjalistyczne,
  RyzykoPracownicy,
  RyzykoFinansowe,
  StatusUbezpieczenia,
} from '@/components/insurance/types';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: unknown) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

export interface InsuranceBriefExportData {
  companyName: string;
  companyNip?: string | null;
  industry?: string | null;
  revenue?: number | null;
  employeeCount?: string | null;
  meetingDate?: string;
  directorName?: string;
  operationalTypes: TypDzialnosci[];
  majatek: RyzykoMajatkowe;
  oc: RyzykoOC;
  flota: RyzykoFlota;
  specjalistyczne: RyzykoSpecjalistyczne;
  pracownicy: RyzykoPracownicy;
  finansowe: RyzykoFinansowe;
  aiBrief?: string;
}

const COLORS = {
  primary: [30, 58, 138] as [number, number, number], // Navy blue
  ubezpieczone: [34, 197, 94] as [number, number, number], // Green
  luka: [239, 68, 68] as [number, number, number], // Red
  nie_dotyczy: [107, 114, 128] as [number, number, number], // Gray
  sectionHeader: [241, 245, 249] as [number, number, number], // Slate-100
  text: [30, 41, 59] as [number, number, number], // Slate-800
  muted: [100, 116, 139] as [number, number, number], // Slate-500
};

const OPERATIONAL_TYPE_LABELS: Record<TypDzialnosci, string> = {
  produkcja: 'Produkcja',
  uslugi: 'Usługi',
  handel: 'Handel',
  import_export: 'Import/Eksport',
  ecommerce: 'e-Commerce',
};

function formatStatus(status: StatusUbezpieczenia): string {
  switch (status) {
    case 'ubezpieczone':
      return '✓ UBEZPIECZONE';
    case 'luka':
      return '✗ LUKA';
    case 'nie_dotyczy':
      return '○ N/D';
    default:
      return '—';
  }
}

function getStatusColor(status: StatusUbezpieczenia): [number, number, number] {
  switch (status) {
    case 'ubezpieczone':
      return COLORS.ubezpieczone;
    case 'luka':
      return COLORS.luka;
    case 'nie_dotyczy':
      return COLORS.nie_dotyczy;
    default:
      return COLORS.muted;
  }
}

function formatCurrency(amount: number | undefined | null): string {
  if (!amount) return '—';
  if (amount >= 1000000000) {
    return `${(amount / 1000000000).toFixed(1)} mld PLN`;
  }
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)} mln PLN`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)} tys. PLN`;
  }
  return `${amount} PLN`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return new Date().toLocaleDateString('pl-PL');
  return new Date(dateStr).toLocaleDateString('pl-PL');
}

function formatBoolean(value: boolean | undefined): string {
  return value ? 'TAK' : 'NIE';
}

export function exportInsuranceBriefToPDF(data: InsuranceBriefExportData): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = 20;

  // Header
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 45, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('BRIEF BROKERSKI', margin, yPos);

  yPos += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Klient: ${data.companyName}`, margin, yPos);

  yPos += 6;
  if (data.companyNip) {
    doc.text(`NIP: ${data.companyNip}`, margin, yPos);
    yPos += 6;
  }

  doc.text(`Data spotkania: ${formatDate(data.meetingDate)}`, margin, yPos);

  if (data.directorName) {
    doc.text(`Przygotował: ${data.directorName}`, pageWidth - margin - 60, yPos);
  }

  yPos = 55;

  // Section 1: Profil Klienta
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. PROFIL KLIENTA', margin, yPos);
  yPos += 2;

  const clientProfileData = [
    ['Branża', data.industry || '—'],
    ['Przychody', formatCurrency(data.revenue)],
    ['Zatrudnienie', data.employeeCount || '—'],
    ['DNA Operacyjne', data.operationalTypes.map((t) => OPERATIONAL_TYPE_LABELS[t]).join(', ') || '—'],
  ];

  doc.autoTable({
    startY: yPos,
    head: [],
    body: clientProfileData,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: 2,
      textColor: COLORS.text,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { cellWidth: 'auto' },
    },
    theme: 'plain',
  });

  yPos = doc.lastAutoTable.finalY + 8;

  // Section 2: Majątek i Przerwy w Działalności
  doc.setFont('helvetica', 'bold');
  doc.text('2. MAJĄTEK I PRZERWY W DZIAŁALNOŚCI', margin, yPos);
  yPos += 2;

  const statusMajatek = data.majatek.status || 'nie_dotyczy';
  doc.setTextColor(...getStatusColor(statusMajatek));
  doc.setFont('helvetica', 'bold');
  doc.text(`Status: ${formatStatus(statusMajatek)}`, margin + 2, yPos + 6);
  doc.setTextColor(...COLORS.text);

  const majatekData = [
    ['Lokalizacje', data.majatek.liczba_lokalizacji?.toString() || '—'],
    ['Typ własności', data.majatek.typ_wlasnosci === 'wlasnosc' ? 'Własność' : data.majatek.typ_wlasnosci === 'najem' ? 'Najem' : data.majatek.typ_wlasnosci === 'mieszane' ? 'Mieszana' : '—'],
    ['Suma ubezp. majątek', formatCurrency(data.majatek.suma_ubezp_majatek)],
    ['Suma ubezp. BI', formatCurrency(data.majatek.suma_ubezp_bi)],
    ['Materiały łatwopalne', formatBoolean(data.majatek.materialy_latwopalne)],
    ['Awaria maszyn', formatBoolean(data.majatek.awaria_maszyn)],
  ];

  if (data.majatek.uwagi) {
    majatekData.push(['Uwagi', data.majatek.uwagi]);
  }

  doc.autoTable({
    startY: yPos + 8,
    head: [],
    body: majatekData,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 2, textColor: COLORS.text },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
    theme: 'plain',
  });

  yPos = doc.lastAutoTable.finalY + 8;

  // Section 3: Odpowiedzialność Cywilna (OC)
  doc.setFont('helvetica', 'bold');
  doc.text('3. ODPOWIEDZIALNOŚĆ CYWILNA (OC)', margin, yPos);
  yPos += 2;

  const statusOC = data.oc.status || 'nie_dotyczy';
  doc.setTextColor(...getStatusColor(statusOC));
  doc.setFont('helvetica', 'bold');
  doc.text(`Status: ${formatStatus(statusOC)}`, margin + 2, yPos + 6);
  doc.setTextColor(...COLORS.text);

  const ocData = [
    ['OC produktowe', formatBoolean(data.oc.oc_produktowe)],
    ['OC zawodowe', formatBoolean(data.oc.oc_zawodowe)],
    ['Zakres terytorialny', data.oc.zakres_terytorialny?.join(', ') || '—'],
    ['Jurysdykcja USA', data.oc.jurysdykcja_usa ? '⚠️ TAK' : 'NIE'],
  ];

  if (data.oc.obroty_usa_procent && data.oc.obroty_usa_procent > 0) {
    ocData.push(['Obroty USA', `${data.oc.obroty_usa_procent}%`]);
  }

  if (data.oc.uwagi) {
    ocData.push(['Uwagi', data.oc.uwagi]);
  }

  doc.autoTable({
    startY: yPos + 8,
    head: [],
    body: ocData,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 2, textColor: COLORS.text },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
    theme: 'plain',
  });

  yPos = doc.lastAutoTable.finalY + 8;

  // Section 4: Flota i Logistyka
  doc.setFont('helvetica', 'bold');
  doc.text('4. FLOTA I LOGISTYKA', margin, yPos);
  yPos += 2;

  const statusFlota = data.flota.status || 'nie_dotyczy';
  doc.setTextColor(...getStatusColor(statusFlota));
  doc.setFont('helvetica', 'bold');
  doc.text(`Status: ${formatStatus(statusFlota)}`, margin + 2, yPos + 6);
  doc.setTextColor(...COLORS.text);

  const flotaData = [
    ['Pojazdy', data.flota.liczba_pojazdow ? `${data.flota.liczba_pojazdow} szt.` : '—'],
    ['Wartość floty', formatCurrency(data.flota.wartosc_floty)],
    ['Cargo', formatBoolean(data.flota.cargo_ubezpieczone)],
    ['CPM', formatBoolean(data.flota.cpm_ubezpieczone)],
  ];

  if (data.flota.uwagi) {
    flotaData.push(['Uwagi', data.flota.uwagi]);
  }

  doc.autoTable({
    startY: yPos + 8,
    head: [],
    body: flotaData,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 2, textColor: COLORS.text },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
    theme: 'plain',
  });

  yPos = doc.lastAutoTable.finalY + 8;

  // Check if we need a new page
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }

  // Section 5: Ryzyka Specjalistyczne
  doc.setFont('helvetica', 'bold');
  doc.text('5. RYZYKA SPECJALISTYCZNE', margin, yPos);
  yPos += 6;

  const specData = [
    ['Cyber', formatStatus(data.specjalistyczne.cyber_status || 'nie_dotyczy'), data.specjalistyczne.cyber_suma ? formatCurrency(data.specjalistyczne.cyber_suma) : '—'],
    ['D&O', formatStatus(data.specjalistyczne.do_status || 'nie_dotyczy'), data.specjalistyczne.do_suma ? formatCurrency(data.specjalistyczne.do_suma) : '—'],
    ['CAR/EAR', formatStatus(data.specjalistyczne.car_ear_status || 'nie_dotyczy'), data.specjalistyczne.car_ear_projekty || '—'],
  ];

  doc.autoTable({
    startY: yPos,
    head: [['Ryzyko', 'Status', 'Szczegóły']],
    body: specData,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 2, textColor: COLORS.text },
    headStyles: { fillColor: COLORS.sectionHeader, textColor: COLORS.text, fontStyle: 'bold' },
    theme: 'grid',
  });

  yPos = doc.lastAutoTable.finalY + 8;

  // Section 6: Ubezpieczenia Finansowe
  doc.setFont('helvetica', 'bold');
  doc.text('6. UBEZPIECZENIA FINANSOWE', margin, yPos);
  yPos += 6;

  const finansoweData = [
    ['Gwarancje kontraktowe', formatStatus(data.finansowe.gwarancje_kontraktowe_status || 'nie_dotyczy'), data.finansowe.gwarancje_limit_roczny ? formatCurrency(data.finansowe.gwarancje_limit_roczny) : '—'],
    ['Gwarancje celne', formatStatus(data.finansowe.gwarancje_celne_status || 'nie_dotyczy'), data.finansowe.gwarancje_celne_limit ? formatCurrency(data.finansowe.gwarancje_celne_limit) : '—'],
    ['Kredyt kupiecki', formatStatus(data.finansowe.kredyt_kupiecki_status || 'nie_dotyczy'), data.finansowe.kredyt_kupiecki_obroty_ubezpieczone ? formatCurrency(data.finansowe.kredyt_kupiecki_obroty_ubezpieczone) : '—'],
    ['Ochrona prawna', formatStatus(data.finansowe.ochrona_prawna_status || 'nie_dotyczy'), data.finansowe.ochrona_prawna_zakres || '—'],
  ];

  doc.autoTable({
    startY: yPos,
    head: [['Produkt', 'Status', 'Szczegóły']],
    body: finansoweData,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 2, textColor: COLORS.text },
    headStyles: { fillColor: COLORS.sectionHeader, textColor: COLORS.text, fontStyle: 'bold' },
    theme: 'grid',
  });

  yPos = doc.lastAutoTable.finalY + 8;

  // Section 7: Pracownicy
  doc.setFont('helvetica', 'bold');
  doc.text('7. PRACOWNICY', margin, yPos);
  yPos += 6;

  const pracData = [
    ['Życie', formatStatus(data.pracownicy.zycie_status || 'nie_dotyczy'), data.pracownicy.zycie_liczba_pracownikow ? `${data.pracownicy.zycie_liczba_pracownikow} os.` : '—'],
    ['Zdrowie', formatStatus(data.pracownicy.zdrowie_status || 'nie_dotyczy'), data.pracownicy.zdrowie_typ_pakietu || '—'],
    ['Podróże', formatStatus(data.pracownicy.podroze_status || 'nie_dotyczy'), '—'],
  ];

  doc.autoTable({
    startY: yPos,
    head: [['Ubezpieczenie', 'Status', 'Szczegóły']],
    body: pracData,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 2, textColor: COLORS.text },
    headStyles: { fillColor: COLORS.sectionHeader, textColor: COLORS.text, fontStyle: 'bold' },
    theme: 'grid',
  });

  yPos = doc.lastAutoTable.finalY + 8;

  // Section 8: Zidentyfikowane Luki
  const luki: string[] = [];
  if (data.majatek.status === 'luka') luki.push('Majątek - brak pokrycia');
  if (data.oc.status === 'luka') luki.push('OC - brak aktualnej polisy');
  if (data.flota.status === 'luka') luki.push('Flota - brak pokrycia');
  if (data.specjalistyczne.cyber_status === 'luka') luki.push('Cyber - ekspozycja bez ochrony');
  if (data.specjalistyczne.do_status === 'luka') luki.push('D&O - brak polisy');
  if (data.specjalistyczne.car_ear_status === 'luka') luki.push('CAR/EAR - brak pokrycia projektów');
  if (data.finansowe.gwarancje_kontraktowe_status === 'luka') luki.push('Gwarancje kontraktowe - brak limitu');
  if (data.finansowe.gwarancje_celne_status === 'luka') luki.push('Gwarancje celne - brak zabezpieczenia');
  if (data.finansowe.kredyt_kupiecki_status === 'luka') luki.push('Kredyt kupiecki - brak ochrony należności');
  if (data.finansowe.ochrona_prawna_status === 'luka') luki.push('Ochrona prawna - brak polisy');
  if (data.pracownicy.zycie_status === 'luka') luki.push('Życie pracowników - brak grupowego');
  if (data.pracownicy.zdrowie_status === 'luka') luki.push('Zdrowie pracowników - brak pakietu');
  if (data.pracownicy.podroze_status === 'luka') luki.push('Podróże służbowe - brak polisy');

  if (luki.length > 0) {
    // Check if we need a new page
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setTextColor(...COLORS.luka);
    doc.setFont('helvetica', 'bold');
    doc.text('8. ZIDENTYFIKOWANE LUKI', margin, yPos);
    yPos += 6;

    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    luki.forEach((luka) => {
      doc.text(`• ${luka}`, margin + 2, yPos);
      yPos += 5;
    });

    yPos += 4;
  }

  // Section 8: Analiza AI
  if (data.aiBrief) {
    // Check if we need a new page
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    doc.setTextColor(...COLORS.text);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${luki.length > 0 ? '9' : '8'}. ANALIZA AI`, margin, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const splitText = doc.splitTextToSize(data.aiBrief, pageWidth - margin * 2);
    doc.text(splitText, margin, yPos);
    yPos += splitText.length * 4 + 8;
  }

  // Footer
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(
      `Wygenerowano: ${new Date().toLocaleString('pl-PL')} | Strona ${i} z ${pageCount}`,
      margin,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  // Save PDF
  const fileName = `Brief_Brokerski_${data.companyName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
