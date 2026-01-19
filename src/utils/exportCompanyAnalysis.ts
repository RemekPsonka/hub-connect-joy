import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import type { CompanyAnalysis, Brand, CollaborationOpportunity, MarketSignal, GeographicCoverage } from '@/components/company/types';

interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number };
}

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 14;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

// Polish character sanitization (fallback for fonts without full Unicode)
function sanitizePolish(text: string): string {
  if (!text) return '';
  return text
    .replace(/ą/g, 'a').replace(/Ą/g, 'A')
    .replace(/ć/g, 'c').replace(/Ć/g, 'C')
    .replace(/ę/g, 'e').replace(/Ę/g, 'E')
    .replace(/ł/g, 'l').replace(/Ł/g, 'L')
    .replace(/ń/g, 'n').replace(/Ń/g, 'N')
    .replace(/ó/g, 'o').replace(/Ó/g, 'O')
    .replace(/ś/g, 's').replace(/Ś/g, 'S')
    .replace(/ź/g, 'z').replace(/Ź/g, 'Z')
    .replace(/ż/g, 'z').replace(/Ż/g, 'Z');
}

function s(text: string | undefined | null): string {
  return sanitizePolish(text || '');
}

function checkPageBreak(doc: jsPDFWithAutoTable, requiredSpace: number = 60): number {
  const currentY = doc.lastAutoTable?.finalY || 20;
  if (currentY + requiredSpace > PAGE_HEIGHT - 20) {
    doc.addPage();
    return 20;
  }
  return currentY + 10;
}

function formatArray(value: string[] | string | undefined): string {
  if (!value) return '-';
  if (typeof value === 'string') return s(value);
  if (Array.isArray(value) && value.length > 0) return s(value.join(', '));
  return '-';
}

function formatBrands(brands: Brand[] | string[] | undefined): string {
  if (!brands) return '-';
  if (typeof brands === 'string') return s(brands);
  if (Array.isArray(brands) && brands.length > 0) {
    return brands.map(b => typeof b === 'string' ? s(b) : s(b.name)).join(', ');
  }
  return '-';
}

function formatMergers(mergers: any): string {
  if (!mergers) return '-';
  if (typeof mergers === 'string') return s(mergers);
  if (Array.isArray(mergers) && mergers.length > 0) {
    return mergers.map(m => 
      typeof m === 'string' ? s(m) : s(`${m.year || ''} - ${m.details || m.type || ''}`)
    ).join('; ');
  }
  return '-';
}

function formatGeographicCoverage(coverage: GeographicCoverage | undefined): string {
  if (!coverage) return '-';
  const parts: string[] = [];
  if (coverage.poland_cities?.length) parts.push(`Miasta: ${coverage.poland_cities.join(', ')}`);
  if (coverage.poland_regions?.length) parts.push(`Regiony: ${coverage.poland_regions.join(', ')}`);
  if (coverage.international_countries?.length) parts.push(`Kraje: ${coverage.international_countries.join(', ')}`);
  if (coverage.export_markets?.length) parts.push(`Eksport: ${coverage.export_markets.join(', ')}`);
  return s(parts.join(' | ') || '-');
}

function formatMarketSignals(signals: MarketSignal[] | string[] | string | undefined): string {
  if (!signals) return '-';
  if (typeof signals === 'string') return s(signals);
  if (Array.isArray(signals)) {
    return signals.map(sig => 
      typeof sig === 'string' ? s(sig) : s(sig.description || sig.type)
    ).join('; ');
  }
  return '-';
}

function formatCollaboration(collab: CollaborationOpportunity[] | string | undefined): string {
  if (!collab) return '-';
  if (typeof collab === 'string') return s(collab);
  if (Array.isArray(collab)) {
    return collab.map(c => s(c.area + ': ' + c.description)).slice(0, 3).join('; ');
  }
  return '-';
}

function formatSustainability(initiatives: string[] | undefined): string {
  if (!initiatives) return '-';
  if (Array.isArray(initiatives) && initiatives.length > 0) {
    return initiatives.map(s).join(', ');
  }
  return '-';
}

function truncate(text: string, maxLength: number): string {
  if (!text) return '-';
  const sanitized = s(text);
  if (sanitized.length <= maxLength) return sanitized;
  return sanitized.slice(0, maxLength - 3) + '...';
}

function parseProducts(products: any): Array<{ name: string; description?: string }> {
  if (!products) return [];
  if (typeof products === 'string') return [{ name: s(products) }];
  if (Array.isArray(products)) {
    return products.map(p => {
      if (typeof p === 'string') return { name: s(p) };
      return { name: s(p.name || ''), description: s(p.description) };
    });
  }
  return [];
}

function parseManagement(management: any): Array<{ name: string; position: string }> {
  if (!management) return [];
  if (typeof management === 'string') return [{ name: s(management), position: '' }];
  if (Array.isArray(management)) {
    return management.map(m => ({
      name: typeof m === 'string' ? s(m) : s(m.name || ''),
      position: typeof m === 'string' ? '' : s(m.position || m.role || '')
    }));
  }
  return [];
}

function parseCompetitors(competitors: any): Array<{ name: string; strength?: string; weakness?: string }> {
  if (!competitors) return [];
  if (Array.isArray(competitors)) {
    return competitors.map(c => {
      if (typeof c === 'string') return { name: s(c) };
      return {
        name: s(c.name || c.company_name || ''),
        strength: s(c.strength || c.strengths || ''),
        weakness: s(c.weakness || c.weaknesses || '')
      };
    });
  }
  return [];
}

function parseLocations(locations: any): Array<{ type: string; city: string; address?: string }> {
  if (!locations) return [];
  if (Array.isArray(locations)) {
    return locations.map(loc => {
      if (typeof loc === 'string') return { type: 'Lokalizacja', city: s(loc) };
      return {
        type: s(loc.type || loc.location_type || 'Biuro'),
        city: s(loc.city || ''),
        address: s(loc.address || '')
      };
    });
  }
  return [];
}

function parseNews(news: any): Array<{ date?: string; title: string; summary?: string }> {
  if (!news) return [];
  if (typeof news === 'string') return [{ title: s(news) }];
  if (Array.isArray(news)) {
    return news.map(n => {
      if (typeof n === 'string') return { title: s(n) };
      return {
        date: n.date || n.published_at || '',
        title: s(n.title || n.headline || ''),
        summary: s(n.summary || n.description || '')
      };
    });
  }
  return [];
}

function parseTimeline(timeline: any): Array<{ year: string; event: string }> {
  if (!timeline) return [];
  if (Array.isArray(timeline)) {
    return timeline.map(t => {
      if (typeof t === 'string') return { year: '', event: s(t) };
      return {
        year: String(t.year || t.date || ''),
        event: s(t.event || t.description || t.title || '')
      };
    });
  }
  return [];
}

const tableStyles = {
  styles: {
    fontSize: 9,
    cellPadding: 3,
    overflow: 'linebreak' as const,
    cellWidth: 'wrap' as const,
    font: 'helvetica'
  },
  columnStyles: {
    0: { cellWidth: 45, fontStyle: 'bold' as const },
    1: { cellWidth: 'auto' as const }
  },
  margin: { left: MARGIN, right: MARGIN },
  tableWidth: 'auto' as const
};

const SECTION_COLORS = {
  basic: [99, 102, 241] as [number, number, number],      // indigo
  history: [234, 179, 8] as [number, number, number],     // yellow
  financial: [16, 185, 129] as [number, number, number],  // green
  business: [59, 130, 246] as [number, number, number],   // blue
  products: [249, 115, 22] as [number, number, number],   // orange
  brands: [168, 85, 247] as [number, number, number],     // purple
  locations: [20, 184, 166] as [number, number, number],  // teal
  clients: [236, 72, 153] as [number, number, number],    // pink
  competition: [239, 68, 68] as [number, number, number], // red
  offer: [34, 197, 94] as [number, number, number],       // emerald
  seeking: [139, 92, 246] as [number, number, number],    // violet
  collaboration: [6, 182, 212] as [number, number, number], // cyan
  management: [244, 63, 94] as [number, number, number],  // rose
  news: [251, 146, 60] as [number, number, number],       // amber
  csr: [34, 211, 238] as [number, number, number],        // sky
  registry: [107, 114, 128] as [number, number, number],  // gray
};

export function exportCompanyAnalysisToPDF(analysis: CompanyAnalysis, logoUrl?: string) {
  const doc = new jsPDF() as jsPDFWithAutoTable;
  let yPos = 20;

  // ===== HEADER =====
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(s(analysis.name) || 'Analiza firmy', MARGIN, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  
  const headerInfo: string[] = [];
  if (analysis.industry) headerInfo.push(`Branza: ${s(analysis.industry)}`);
  if (analysis.legal_form) headerInfo.push(`Forma: ${s(analysis.legal_form)}`);
  headerInfo.push(`Wygenerowano: ${new Date().toLocaleDateString('pl-PL')}`);
  
  doc.text(headerInfo.join(' | '), MARGIN, yPos);
  yPos += 8;
  doc.setTextColor(0);

  // ===== SEKCJA 1: PODSTAWOWE INFORMACJE =====
  const basicData: [string, string][] = [];
  if (analysis.name) basicData.push(['Pelna nazwa', s(analysis.name)]);
  if (analysis.short_name) basicData.push(['Nazwa skrocona', s(analysis.short_name)]);
  if (analysis.legal_form) basicData.push(['Forma prawna', s(analysis.legal_form)]);
  if (analysis.year_founded || analysis.founding_year) {
    basicData.push(['Rok zalozenia', String(analysis.year_founded || analysis.founding_year)]);
  }
  if (analysis.industry) basicData.push(['Branza', s(analysis.industry)]);
  if (analysis.sub_industries) basicData.push(['Subbranize', formatArray(analysis.sub_industries)]);
  if (analysis.tagline) basicData.push(['Tagline', s(analysis.tagline)]);

  if (basicData.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['1. Podstawowe informacje', '']],
      body: basicData,
      theme: 'striped',
      headStyles: { fillColor: SECTION_COLORS.basic },
      ...tableStyles
    });
  }

  // Description
  if (analysis.description) {
    yPos = checkPageBreak(doc, 40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Opis dzialalnosci:', MARGIN, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const descLines = doc.splitTextToSize(s(analysis.description), CONTENT_WIDTH);
    doc.text(descLines.slice(0, 8), MARGIN, yPos);
    yPos += Math.min(descLines.length, 8) * 4 + 5;
  }

  // ===== SEKCJA 2: HISTORIA =====
  const timeline = parseTimeline(analysis.timeline);
  if (timeline.length > 0 || analysis.founding_story || analysis.mergers_acquisitions) {
    yPos = checkPageBreak(doc, 50);
    const historyData: [string, string][] = [];
    
    if (analysis.founding_story) {
      historyData.push(['Historia zalozenia', truncate(analysis.founding_story, 250)]);
    }
    timeline.slice(0, 6).forEach(event => {
      historyData.push([event.year || 'Wydarzenie', truncate(event.event, 150)]);
    });
    if (analysis.mergers_acquisitions) {
      historyData.push(['Fuzje/przejecia', formatMergers(analysis.mergers_acquisitions)]);
    }

    if (historyData.length > 0) {
      autoTable(doc, {
        startY: doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos,
        head: [['2. Historia firmy', '']],
        body: historyData,
        theme: 'striped',
        headStyles: { fillColor: SECTION_COLORS.history },
        ...tableStyles
      });
    }
  }

  // ===== SEKCJA 3: DANE FINANSOWE =====
  const financialData: [string, string][] = [];
  if (analysis.revenue?.amount) {
    const amount = analysis.revenue.amount >= 1_000_000 
      ? `${(analysis.revenue.amount / 1_000_000).toFixed(1)}M`
      : `${(analysis.revenue.amount / 1_000).toFixed(0)}K`;
    financialData.push(['Przychody', `${amount} ${analysis.revenue.currency || 'PLN'} (${analysis.revenue.year || 'b.d.'})`]);
  }
  if (analysis.employee_count) {
    financialData.push(['Zatrudnienie', String(analysis.employee_count)]);
  }
  if (analysis.market_position) {
    financialData.push(['Pozycja rynkowa', s(analysis.market_position)]);
  }
  if (analysis.growth_rate) {
    financialData.push(['Wzrost', `${analysis.growth_rate}% YoY`]);
  }
  if (analysis.market_share_info) {
    financialData.push(['Udzial w rynku', s(analysis.market_share_info)]);
  }

  if (financialData.length > 0) {
    yPos = checkPageBreak(doc, 50);
    autoTable(doc, {
      startY: doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos,
      head: [['3. Dane finansowe', '']],
      body: financialData,
      theme: 'striped',
      headStyles: { fillColor: SECTION_COLORS.financial },
      ...tableStyles
    });
  }

  // ===== SEKCJA 4: MODEL BIZNESOWY =====
  if (analysis.business_model || analysis.value_proposition || analysis.competitive_position) {
    yPos = checkPageBreak(doc, 50);
    const businessData: [string, string][] = [];
    if (analysis.business_model) {
      businessData.push(['Model biznesowy', truncate(analysis.business_model, 250)]);
    }
    if (analysis.value_proposition) {
      businessData.push(['Propozycja wartosci', truncate(analysis.value_proposition, 250)]);
    }
    if (analysis.competitive_position) {
      businessData.push(['Pozycja konkurencyjna', truncate(analysis.competitive_position, 200)]);
    }
    if (analysis.revenue_streams?.length) {
      businessData.push(['Zrodla przychodow', formatArray(analysis.revenue_streams)]);
    }

    autoTable(doc, {
      startY: doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos,
      head: [['4. Model biznesowy', '']],
      body: businessData,
      theme: 'striped',
      headStyles: { fillColor: SECTION_COLORS.business },
      ...tableStyles
    });
  }

  // ===== SEKCJA 5: PRODUKTY/USLUGI =====
  const products = parseProducts(analysis.products);
  if (products.length > 0 || analysis.services) {
    yPos = checkPageBreak(doc, 50);
    const productData: [string, string][] = [];
    
    products.slice(0, 8).forEach((p, i) => {
      productData.push([`Produkt ${i + 1}`, `${p.name}${p.description ? ' - ' + truncate(p.description, 80) : ''}`]);
    });
    
    if (analysis.services) {
      const servicesText = typeof analysis.services === 'string' 
        ? analysis.services 
        : Array.isArray(analysis.services) 
          ? analysis.services.map(svc => typeof svc === 'string' ? svc : svc.name).join(', ')
          : '';
      if (servicesText) productData.push(['Uslugi', truncate(servicesText, 200)]);
    }
    if (analysis.flagship_products?.length) {
      productData.push(['Flagowe produkty', formatArray(analysis.flagship_products)]);
    }

    if (productData.length > 0) {
      autoTable(doc, {
        startY: doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos,
        head: [['5. Produkty i uslugi', '']],
        body: productData,
        theme: 'striped',
        headStyles: { fillColor: SECTION_COLORS.products },
        ...tableStyles
      });
    }
  }

  // ===== SEKCJA 6: MARKI I PARTNERSTWA =====
  if (analysis.own_brands?.length || analysis.represented_brands?.length || analysis.partnerships) {
    yPos = checkPageBreak(doc, 50);
    const brandsData: [string, string][] = [];
    
    if (analysis.own_brands?.length) {
      brandsData.push(['Wlasne marki', formatBrands(analysis.own_brands)]);
    }
    if (analysis.represented_brands?.length) {
      brandsData.push(['Reprezentowane marki', formatBrands(analysis.represented_brands)]);
    }
    if (analysis.partnerships) {
      brandsData.push(['Partnerstwa', formatArray(analysis.partnerships)]);
    }
    if (analysis.certifications) {
      brandsData.push(['Certyfikaty', formatArray(analysis.certifications)]);
    }

    autoTable(doc, {
      startY: doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos,
      head: [['6. Marki i partnerstwa', '']],
      body: brandsData,
      theme: 'striped',
      headStyles: { fillColor: SECTION_COLORS.brands },
      ...tableStyles
    });
  }

  // ===== SEKCJA 7: LOKALIZACJE =====
  const locations = parseLocations(analysis.locations);
  if (locations.length > 0 || analysis.headquarters || analysis.geographic_coverage) {
    yPos = checkPageBreak(doc, 50);
    const locationData: [string, string][] = [];
    
    if (analysis.headquarters) {
      const hq = analysis.headquarters;
      const hqAddress = [hq.address, hq.city, hq.country].filter(Boolean).join(', ');
      if (hqAddress) locationData.push(['Siedziba glowna', s(hqAddress)]);
    }
    
    locations.slice(0, 5).forEach(loc => {
      locationData.push([s(loc.type), `${s(loc.city)}${loc.address ? ', ' + s(loc.address) : ''}`]);
    });
    
    if (analysis.geographic_coverage) {
      locationData.push(['Zasieg geograficzny', formatGeographicCoverage(analysis.geographic_coverage)]);
    }

    if (locationData.length > 0) {
      autoTable(doc, {
        startY: doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos,
        head: [['7. Lokalizacje i zasieg', '']],
        body: locationData,
        theme: 'striped',
        headStyles: { fillColor: SECTION_COLORS.locations },
        ...tableStyles
      });
    }
  }

  // ===== SEKCJA 8: KLIENCI I PROJEKTY =====
  if (analysis.key_clients?.length || analysis.reference_projects?.length || analysis.target_industries?.length) {
    yPos = checkPageBreak(doc, 50);
    const clientsData: [string, string][] = [];
    
    if (analysis.key_clients?.length) {
      const clientsList = analysis.key_clients.map(c => 
        typeof c === 'string' ? c : c.name
      ).slice(0, 8).join(', ');
      clientsData.push(['Kluczowi klienci', s(clientsList)]);
    }
    if (analysis.target_industries?.length) {
      clientsData.push(['Branize docelowe', formatArray(analysis.target_industries)]);
    }
    if (analysis.reference_projects?.length) {
      analysis.reference_projects.slice(0, 4).forEach((proj, i) => {
        const projName = typeof proj === 'string' ? proj : proj.name;
        clientsData.push([`Projekt ${i + 1}`, s(projName)]);
      });
    }
    if (analysis.target_clients) {
      clientsData.push(['Docelowi klienci', truncate(analysis.target_clients, 150)]);
    }

    autoTable(doc, {
      startY: doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos,
      head: [['8. Klienci i projekty referencyjne', '']],
      body: clientsData,
      theme: 'striped',
      headStyles: { fillColor: SECTION_COLORS.clients },
      ...tableStyles
    });
  }

  // ===== SEKCJA 9: KONKURENCJA =====
  const competitors = parseCompetitors(analysis.main_competitors);
  if (competitors.length > 0 || analysis.competitive_differentiation) {
    yPos = checkPageBreak(doc, 50);
    const competitionData: [string, string][] = [];
    
    competitors.slice(0, 5).forEach((c, i) => {
      let competitorInfo = c.name;
      if (c.strength) competitorInfo += ` (Sily: ${truncate(c.strength, 50)})`;
      competitionData.push([`Konkurent ${i + 1}`, competitorInfo]);
    });
    
    if (analysis.competitive_differentiation) {
      competitionData.push(['Wyrozniki', truncate(analysis.competitive_differentiation, 200)]);
    }
    if (analysis.market_challenges?.length) {
      competitionData.push(['Wyzwania rynkowe', formatArray(analysis.market_challenges)]);
    }

    if (competitionData.length > 0) {
      autoTable(doc, {
        startY: doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos,
        head: [['9. Konkurencja', '']],
        body: competitionData,
        theme: 'striped',
        headStyles: { fillColor: SECTION_COLORS.competition },
        ...tableStyles
      });
    }
  }

  // ===== SEKCJA 10: CO FIRMA OFERUJE =====
  if (analysis.offer_summary || analysis.what_company_offers || analysis.unique_selling_points) {
    yPos = checkPageBreak(doc, 50);
    const offerData: [string, string][] = [];
    
    if (analysis.offer_summary) {
      offerData.push(['Podsumowanie oferty', truncate(analysis.offer_summary, 250)]);
    }
    if (analysis.what_company_offers) {
      offerData.push(['Co oferuje', truncate(analysis.what_company_offers, 200)]);
    }
    if (analysis.unique_selling_points) {
      offerData.push(['USP', formatArray(analysis.unique_selling_points)]);
    }
    if (analysis.awards?.length) {
      offerData.push(['Nagrody', formatArray(analysis.awards)]);
    }

    if (offerData.length > 0) {
      autoTable(doc, {
        startY: doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos,
        head: [['10. Co firma moze zaoferowac', '']],
        body: offerData,
        theme: 'striped',
        headStyles: { fillColor: SECTION_COLORS.offer },
        ...tableStyles
      });
    }
  }

  // ===== SEKCJA 11: CZEGO FIRMA SZUKA =====
  if (analysis.seeking_clients || analysis.seeking_partners || analysis.expansion_plans || analysis.what_company_seeks) {
    yPos = checkPageBreak(doc, 50);
    const seekingData: [string, string][] = [];
    
    if (analysis.seeking_clients) {
      seekingData.push(['Szukani klienci', truncate(analysis.seeking_clients, 200)]);
    }
    if (analysis.seeking_partners) {
      seekingData.push(['Szukani partnerzy', truncate(analysis.seeking_partners, 200)]);
    }
    if (analysis.seeking_suppliers) {
      seekingData.push(['Szukani dostawcy', truncate(analysis.seeking_suppliers, 200)]);
    }
    if (analysis.expansion_plans) {
      seekingData.push(['Plany rozwoju', truncate(analysis.expansion_plans, 200)]);
    }
    if (analysis.what_company_seeks) {
      seekingData.push(['Czego szuka', truncate(analysis.what_company_seeks, 200)]);
    }
    if (analysis.hiring_positions) {
      seekingData.push(['Rekrutacja', formatArray(analysis.hiring_positions)]);
    }

    autoTable(doc, {
      startY: doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos,
      head: [['11. Czego firma szuka', '']],
      body: seekingData,
      theme: 'striped',
      headStyles: { fillColor: SECTION_COLORS.seeking },
      ...tableStyles
    });
  }

  // ===== SEKCJA 12: POTENCJAL WSPOLPRACY =====
  if (analysis.collaboration_opportunities || analysis.ideal_partner_profile || analysis.synergy_potential) {
    yPos = checkPageBreak(doc, 50);
    const collabData: [string, string][] = [];
    
    if (analysis.collaboration_opportunities) {
      collabData.push(['Mozliwosci wspolpracy', formatCollaboration(analysis.collaboration_opportunities)]);
    }
    if (analysis.ideal_partner_profile) {
      collabData.push(['Idealny partner', truncate(analysis.ideal_partner_profile, 200)]);
    }
    if (analysis.synergy_potential) {
      collabData.push(['Potencjal synergii', formatArray(analysis.synergy_potential)]);
    }
    if (analysis.collaboration_areas) {
      collabData.push(['Obszary wspolpracy', truncate(analysis.collaboration_areas, 150)]);
    }

    if (collabData.length > 0) {
      autoTable(doc, {
        startY: doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos,
        head: [['12. Potencjal wspolpracy', '']],
        body: collabData,
        theme: 'striped',
        headStyles: { fillColor: SECTION_COLORS.collaboration },
        ...tableStyles
      });
    }
  }

  // ===== SEKCJA 13: ZARZAD =====
  const management = parseManagement(analysis.management);
  if (management.length > 0 || analysis.founder_info || analysis.company_culture) {
    yPos = checkPageBreak(doc, 50);
    const managementData: [string, string][] = [];
    
    if (analysis.founder_info) {
      managementData.push(['Zalozyciel', truncate(analysis.founder_info, 150)]);
    }
    
    management.slice(0, 6).forEach(m => {
      managementData.push([s(m.position) || 'Czlonek zarzadu', s(m.name)]);
    });
    
    if (analysis.company_culture) {
      managementData.push(['Kultura organizacji', truncate(analysis.company_culture, 150)]);
    }
    if (analysis.organizational_structure) {
      managementData.push(['Struktura', truncate(analysis.organizational_structure, 150)]);
    }

    if (managementData.length > 0) {
      autoTable(doc, {
        startY: doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos,
        head: [['13. Zarzad i kierownictwo', '']],
        body: managementData,
        theme: 'striped',
        headStyles: { fillColor: SECTION_COLORS.management },
        ...tableStyles
      });
    }
  }

  // ===== SEKCJA 14: NEWSY I SYGNALY =====
  const news = parseNews(analysis.recent_news);
  if (news.length > 0 || analysis.market_signals) {
    yPos = checkPageBreak(doc, 50);
    const newsData: [string, string][] = [];
    
    news.slice(0, 5).forEach(n => {
      const datePrefix = n.date ? `[${n.date}] ` : '';
      newsData.push(['News', datePrefix + truncate(n.title, 120)]);
    });
    
    if (analysis.market_signals) {
      newsData.push(['Sygnaly rynkowe', formatMarketSignals(analysis.market_signals)]);
    }

    if (newsData.length > 0) {
      autoTable(doc, {
        startY: doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos,
        head: [['14. Aktualnosci i sygnaly rynkowe', '']],
        body: newsData,
        theme: 'striped',
        headStyles: { fillColor: SECTION_COLORS.news },
        ...tableStyles
      });
    }
  }

  // ===== SEKCJA 15: CSR I ZROWNOWAIZONY ROZWOJ =====
  if (analysis.csr_activities?.length || analysis.sustainability_initiatives || analysis.social_impact) {
    yPos = checkPageBreak(doc, 50);
    const csrData: [string, string][] = [];
    
    if (analysis.csr_activities?.length) {
      analysis.csr_activities.slice(0, 4).forEach(csr => {
        const csrName = typeof csr === 'string' ? csr : csr.area || '';
        const csrDesc = typeof csr === 'string' ? '' : csr.description || '';
        csrData.push(['Aktywnosc CSR', s(csrName + (csrDesc ? ': ' + csrDesc : ''))]);
      });
    }
    if (analysis.sustainability_initiatives?.length) {
      csrData.push(['Zrownowazony rozwoj', formatSustainability(analysis.sustainability_initiatives)]);
    }
    if (analysis.social_impact) {
      csrData.push(['Wplyw spoleczny', truncate(analysis.social_impact, 150)]);
    }
    if (analysis.awards?.length) {
      csrData.push(['Nagrody', formatArray(analysis.awards)]);
    }

    if (csrData.length > 0) {
      autoTable(doc, {
        startY: doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos,
        head: [['15. CSR i zrownowazony rozwoj', '']],
        body: csrData,
        theme: 'striped',
        headStyles: { fillColor: SECTION_COLORS.csr },
        ...tableStyles
      });
    }
  }

  // ===== SEKCJA 16: DANE REJESTROWE =====
  const registryData: [string, string][] = [];
  if (analysis.nip) registryData.push(['NIP', s(analysis.nip)]);
  if (analysis.regon) registryData.push(['REGON', s(analysis.regon)]);
  if (analysis.krs) registryData.push(['KRS', s(analysis.krs)]);
  if (analysis.address || analysis.city) {
    registryData.push(['Adres', s([analysis.address, analysis.postal_code, analysis.city].filter(Boolean).join(', '))]);
  }
  if (analysis.headquarters) {
    const hq = analysis.headquarters;
    if (hq.address || hq.city) {
      const fullAddr = [hq.address, hq.postal_code, hq.city, hq.country].filter(Boolean).join(', ');
      if (fullAddr && !registryData.some(r => r[0] === 'Adres')) {
        registryData.push(['Adres siedziby', s(fullAddr)]);
      }
    }
  }

  if (registryData.length > 0) {
    yPos = checkPageBreak(doc, 50);
    autoTable(doc, {
      startY: doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos,
      head: [['16. Dane rejestrowe i kontaktowe', '']],
      body: registryData,
      theme: 'striped',
      headStyles: { fillColor: SECTION_COLORS.registry },
      ...tableStyles
    });
  }

  // ===== FOOTER NA KAZDEJ STRONIE =====
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Strona ${i} z ${pageCount} | AI Network Assistant | ${s(analysis.name) || 'Analiza firmy'}`,
      PAGE_WIDTH / 2,
      PAGE_HEIGHT - 10,
      { align: 'center' }
    );
  }

  // ===== SAVE =====
  const filename = `analiza-${(s(analysis.name) || 'firma').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
  toast.success('Raport PDF wygenerowany', { description: filename });
}
