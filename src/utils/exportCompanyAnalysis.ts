import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import type { CompanyAnalysis } from '@/components/company/types';

interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number };
}

export function exportCompanyAnalysisToPDF(analysis: CompanyAnalysis) {
  const doc = new jsPDF() as jsPDFWithAutoTable;
  let yPos = 20;

  // Title
  doc.setFontSize(20);
  doc.text(analysis.name || 'Analiza firmy', 14, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setTextColor(100);
  if (analysis.industry) {
    doc.text(`Branża: ${analysis.industry}`, 14, yPos);
    yPos += 5;
  }
  doc.text(`Wygenerowano: ${new Date().toLocaleDateString('pl-PL')}`, 14, yPos);
  yPos += 10;
  doc.setTextColor(0);

  // SEKCJA 1: Podstawowe informacje
  autoTable(doc, {
    startY: yPos,
    head: [['Podstawowe informacje', '']],
    body: [
      ['Pełna nazwa', analysis.name || '-'],
      ['Forma prawna', analysis.legal_form || '-'],
      ['Rok założenia', analysis.year_founded?.toString() || analysis.founding_year || '-'],
      ['Branża', analysis.industry || '-'],
      ['Subbranże', formatArray(analysis.sub_industries)],
    ].filter(row => row[1] !== '-'),
    theme: 'striped',
    headStyles: { fillColor: [99, 102, 241] },
    styles: { fontSize: 9, cellPadding: 3 },
  });

  // Description
  if (analysis.description) {
    yPos = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(10);
    doc.text('Opis działalności:', 14, yPos);
    yPos += 5;
    doc.setFontSize(9);
    const descLines = doc.splitTextToSize(analysis.description, 180);
    doc.text(descLines.slice(0, 6), 14, yPos);
    yPos += descLines.slice(0, 6).length * 4;
  }

  // SEKCJA 3: Dane finansowe
  const financialData: [string, string][] = [];
  if (analysis.revenue?.amount) {
    financialData.push(['Przychody', `${(analysis.revenue.amount / 1_000_000).toFixed(1)}M PLN (${analysis.revenue.year})`]);
  }
  if (analysis.employee_count) {
    financialData.push(['Zatrudnienie', String(analysis.employee_count)]);
  }
  if (analysis.market_position) {
    financialData.push(['Pozycja rynkowa', analysis.market_position]);
  }
  if (analysis.growth_rate) {
    financialData.push(['Wzrost', `${analysis.growth_rate}% YoY`]);
  }

  if (financialData.length > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Dane finansowe', '']],
      body: financialData,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 9, cellPadding: 3 },
    });
  }

  // SEKCJA 4: Model biznesowy
  if (analysis.business_model || analysis.value_proposition) {
    const businessData: [string, string][] = [];
    if (analysis.business_model) {
      businessData.push(['Model biznesowy', truncate(analysis.business_model, 200)]);
    }
    if (analysis.value_proposition) {
      businessData.push(['Propozycja wartości', truncate(analysis.value_proposition, 200)]);
    }
    if (analysis.competitive_position) {
      businessData.push(['Pozycja konkurencyjna', truncate(analysis.competitive_position, 150)]);
    }

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Model biznesowy', '']],
      body: businessData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9, cellPadding: 3 },
    });
  }

  // SEKCJA 5: Produkty
  const products = parseProducts(analysis.products);
  if (products.length > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Produkty/Usługi', '']],
      body: products.slice(0, 8).map(p => [p.name, truncate(p.description || '', 100)]),
      theme: 'striped',
      headStyles: { fillColor: [249, 115, 22] },
      styles: { fontSize: 9, cellPadding: 3 },
    });
  }

  // SEKCJA 10 & 11: Oferta i potrzeby
  const offerNeedsData: [string, string][] = [];
  if (analysis.seeking_clients) {
    offerNeedsData.push(['Szukani klienci', truncate(analysis.seeking_clients, 150)]);
  }
  if (analysis.seeking_partners) {
    offerNeedsData.push(['Szukani partnerzy', truncate(analysis.seeking_partners, 150)]);
  }
  if (analysis.expansion_plans) {
    offerNeedsData.push(['Plany rozwoju', truncate(analysis.expansion_plans, 150)]);
  }

  if (offerNeedsData.length > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Potrzeby i plany', '']],
      body: offerNeedsData,
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246] },
      styles: { fontSize: 9, cellPadding: 3 },
    });
  }

  // SEKCJA 13: Zarząd
  const management = parseManagement(analysis.management);
  if (management.length > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Osoba', 'Stanowisko']],
      body: management.slice(0, 6).map(m => [m.name, m.position]),
      theme: 'striped',
      headStyles: { fillColor: [236, 72, 153] },
      styles: { fontSize: 9, cellPadding: 3 },
    });
  }

  // SEKCJA 16: Dane rejestrowe
  const registryData: [string, string][] = [];
  if (analysis.nip) registryData.push(['NIP', analysis.nip]);
  if (analysis.regon) registryData.push(['REGON', analysis.regon]);
  if (analysis.krs) registryData.push(['KRS', analysis.krs]);
  if (analysis.address || analysis.city) {
    registryData.push(['Adres', [analysis.address, analysis.postal_code, analysis.city].filter(Boolean).join(', ')]);
  }

  if (registryData.length > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Dane rejestrowe', '']],
      body: registryData,
      theme: 'striped',
      headStyles: { fillColor: [107, 114, 128] },
      styles: { fontSize: 9, cellPadding: 3 },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Strona ${i} z ${pageCount} | AI Network Assistant | Analiza: ${analysis.name || 'Firma'}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Save
  const filename = `analiza-${(analysis.name || 'firma').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
  toast.success('Raport PDF wygenerowany', { description: filename });
}

// Helper functions
function formatArray(value: string[] | string | undefined): string {
  if (!value) return '-';
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0) return value.join(', ');
  return '-';
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

function parseProducts(products: any): Array<{ name: string; description?: string }> {
  if (!products) return [];
  if (typeof products === 'string') return [{ name: products }];
  if (Array.isArray(products)) {
    return products.map(p => {
      if (typeof p === 'string') return { name: p };
      return { name: p.name || '', description: p.description };
    });
  }
  return [];
}

function parseManagement(management: any): Array<{ name: string; position: string }> {
  if (!management) return [];
  if (typeof management === 'string') return [{ name: management, position: '' }];
  if (Array.isArray(management)) {
    return management.map(m => ({
      name: typeof m === 'string' ? m : m.name || '',
      position: typeof m === 'string' ? '' : m.position || ''
    }));
  }
  return [];
}
