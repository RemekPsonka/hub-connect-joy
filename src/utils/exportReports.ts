import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { AnalyticsData } from '@/hooks/useAnalytics';
import { toast } from 'sonner';

interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number };
}

export const exportToPDF = (data: AnalyticsData, dateRangeLabel: string) => {
  const doc = new jsPDF() as jsPDFWithAutoTable;

  // Title
  doc.setFontSize(20);
  doc.text('Raport Analityczny', 14, 20);

  doc.setFontSize(10);
  doc.text(`Wygenerowano: ${new Date().toLocaleDateString('pl-PL')}`, 14, 28);
  doc.text(`Okres: ${dateRangeLabel}`, 14, 33);

  // Key metrics table
  autoTable(doc, {
    startY: 40,
    head: [['Metryka', 'Wartość']],
    body: [
      ['Łączna liczba kontaktów', String(data.metrics.totalContacts)],
      ['Zmiana vs poprzedni okres', `${data.metrics.contactsGrowth >= 0 ? '+' : ''}${data.metrics.contactsGrowth}%`],
      ['Aktywne potrzeby', String(data.metrics.activeNeeds)],
      ['Wskaźnik realizacji potrzeb', `${data.metrics.needsFulfillmentRate}%`],
      ['Aktywne oferty', String(data.metrics.activeOffers)],
      ['Liczba spotkań', String(data.metrics.totalMeetings)],
      ['Średnio spotkań na tydzień', String(data.metrics.avgMeetingsPerWeek)],
      ['Zrealizowane połączenia', String(data.metrics.successfulMatches)],
      ['Wskaźnik sukcesu dopasowań', `${data.metrics.matchSuccessRate}%`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [139, 92, 246] },
  });

  // Contacts by industry
  if (data.contactsByIndustry.length > 0) {
    doc.setFontSize(14);
    doc.text('Kontakty wg firm', 14, doc.lastAutoTable.finalY + 15);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Firma', 'Liczba kontaktów']],
      body: data.contactsByIndustry.map(c => [c.name, String(c.value)]),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });
  }

  // Meeting outcomes
  if (data.meetingOutcomes.length > 0) {
    doc.setFontSize(14);
    doc.text('Status spotkań', 14, doc.lastAutoTable.finalY + 15);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Status', 'Liczba']],
      body: data.meetingOutcomes.map(m => [m.outcome, String(m.count)]),
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
    });
  }

  // Network health
  doc.setFontSize(14);
  doc.text('Zdrowie sieci kontaktów', 14, doc.lastAutoTable.finalY + 15);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 20,
    head: [['Status', 'Liczba', 'Procent']],
    body: [
      ['Zdrowe (<30 dni)', String(data.networkHealth.healthy), `${data.networkHealth.healthyPercent}%`],
      ['Ostrzeżenie (30-90 dni)', String(data.networkHealth.warning), `${data.networkHealth.warningPercent}%`],
      ['Krytyczne (>90 dni)', String(data.networkHealth.critical), `${data.networkHealth.criticalPercent}%`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [245, 158, 11] },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Strona ${i} z ${pageCount} | AI Network Assistant`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Save
  const filename = `raport-analityczny-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
  toast.success('Raport PDF wygenerowany', { description: filename });
};

export const exportToExcel = (data: AnalyticsData, dateRangeLabel: string) => {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // Sheet 1: Metrics
  const metricsData = [
    ['Raport Analityczny'],
    [`Wygenerowano: ${new Date().toLocaleDateString('pl-PL')}`],
    [`Okres: ${dateRangeLabel}`],
    [''],
    ['Metryka', 'Wartość'],
    ['Łączna liczba kontaktów', data.metrics.totalContacts],
    ['Zmiana vs poprzedni okres', `${data.metrics.contactsGrowth >= 0 ? '+' : ''}${data.metrics.contactsGrowth}%`],
    ['Aktywne potrzeby', data.metrics.activeNeeds],
    ['Wskaźnik realizacji potrzeb', `${data.metrics.needsFulfillmentRate}%`],
    ['Aktywne oferty', data.metrics.activeOffers],
    ['Liczba spotkań', data.metrics.totalMeetings],
    ['Średnio spotkań na tydzień', data.metrics.avgMeetingsPerWeek],
    ['Zrealizowane połączenia', data.metrics.successfulMatches],
    ['Wskaźnik sukcesu dopasowań', `${data.metrics.matchSuccessRate}%`],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(metricsData);
  ws1['!cols'] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Metryki');

  // Sheet 2: Contacts by Industry
  const industryData = [
    ['Firma', 'Liczba kontaktów'],
    ...data.contactsByIndustry.map(c => [c.name, c.value])
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(industryData);
  ws2['!cols'] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Firmy');

  // Sheet 3: Meeting Outcomes
  const meetingData = [
    ['Status spotkania', 'Liczba'],
    ...data.meetingOutcomes.map(m => [m.outcome, m.count])
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(meetingData);
  ws3['!cols'] = [{ wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Spotkania');

  // Sheet 4: Network Health
  const healthData = [
    ['Status', 'Liczba', 'Procent'],
    ['Zdrowe (<30 dni)', data.networkHealth.healthy, `${data.networkHealth.healthyPercent}%`],
    ['Ostrzeżenie (30-90 dni)', data.networkHealth.warning, `${data.networkHealth.warningPercent}%`],
    ['Krytyczne (>90 dni)', data.networkHealth.critical, `${data.networkHealth.criticalPercent}%`],
  ];
  const ws4 = XLSX.utils.aoa_to_sheet(healthData);
  ws4['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws4, 'Zdrowie sieci');

  // Sheet 5: Activity Timeline
  const timelineData = [
    ['Data', 'Nowe kontakty', 'Spotkania', 'Zadania'],
    ...data.activityTimeline.map(t => [t.date, t.contacts, t.meetings, t.tasks])
  ];
  const ws5 = XLSX.utils.aoa_to_sheet(timelineData);
  ws5['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws5, 'Timeline');

  // Sheet 6: Top Categories
  const categoriesData = [
    ['Kategoria', 'Liczba'],
    ...data.topCategories.map(c => [c.category, c.matches])
  ];
  const ws6 = XLSX.utils.aoa_to_sheet(categoriesData);
  ws6['!cols'] = [{ wch: 25 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws6, 'Kategorie');

  // Save
  const filename = `raport-analityczny-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
  toast.success('Raport Excel wygenerowany', { description: filename });
};
