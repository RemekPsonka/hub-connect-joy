import jsPDF from 'jspdf';
import { toast } from 'sonner';
import type { MeetingProspect } from '@/hooks/useMeetingProspects';

// Polish character sanitization
const polishMap: Record<string, string> = {
  'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
  'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
  'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N',
  'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
};

function s(text: string | undefined | null): string {
  if (!text) return '';
  return text.split('').map(char => polishMap[char] || char).join('');
}

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 15;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

const COLORS = {
  primary: [41, 98, 255] as [number, number, number],
  person: [147, 51, 234] as [number, number, number],
  company: [59, 130, 246] as [number, number, number],
  insurance: [234, 88, 12] as [number, number, number],
  topics: [16, 185, 129] as [number, number, number],
  gray: [107, 114, 128] as [number, number, number],
  lightGray: [243, 244, 246] as [number, number, number],
  darkGray: [55, 65, 81] as [number, number, number],
};

function checkPageBreak(doc: jsPDF, currentY: number, neededSpace: number = 20): number {
  if (currentY + neededSpace > PAGE_HEIGHT - MARGIN) {
    doc.addPage();
    return MARGIN + 5;
  }
  return currentY;
}

function addSectionHeader(doc: jsPDF, title: string, y: number, color: [number, number, number]): number {
  y = checkPageBreak(doc, y, 15);
  doc.setFillColor(...color);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 7, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(s(title), MARGIN + 4, y + 5);
  doc.setTextColor(0, 0, 0);
  return y + 10;
}

interface MarkdownSection {
  title: string;
  lines: string[];
}

function parseMarkdownBrief(brief: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  const parts = brief.split(/^## /m).filter(Boolean);

  for (const part of parts) {
    const lines = part.split('\n');
    const title = lines[0].trim();
    const contentLines = lines.slice(1)
      .map(l => l.trim())
      .filter(l => l.length > 0);
    sections.push({ title, lines: contentLines });
  }

  return sections;
}

function getSectionColor(title: string): [number, number, number] {
  const lower = title.toLowerCase();
  if (lower.includes('osoba') || lower.includes('👤')) return COLORS.person;
  if (lower.includes('firma') || lower.includes('🏢')) return COLORS.company;
  if (lower.includes('ubezpiecz') || lower.includes('🛡')) return COLORS.insurance;
  if (lower.includes('temat') || lower.includes('💬')) return COLORS.topics;
  return COLORS.gray;
}

function renderLine(doc: jsPDF, line: string, y: number): number {
  const isBullet = line.startsWith('- ') || line.startsWith('• ');
  const isSubHeader = line.startsWith('### ');

  if (isSubHeader) {
    y = checkPageBreak(doc, y, 8);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.darkGray);
    const text = line.replace(/^###\s*/, '');
    doc.text(s(text), MARGIN + 2, y);
    doc.setTextColor(0, 0, 0);
    return y + 4.5;
  }

  if (isBullet) {
    const text = line.replace(/^[-•]\s*/, '');
    y = checkPageBreak(doc, y, 6);
    doc.setFillColor(...COLORS.gray);
    doc.circle(MARGIN + 3, y - 1.2, 0.8, 'F');

    doc.setFontSize(9);
    // Handle bold fragments: **text**
    const cleanText = text.replace(/\*\*(.*?)\*\*/g, '$1');
    const wrapped = doc.splitTextToSize(s(cleanText), CONTENT_WIDTH - 10);
    for (let i = 0; i < wrapped.length; i++) {
      if (i > 0) y = checkPageBreak(doc, y, 4);
      doc.setFont('helvetica', 'normal');
      doc.text(wrapped[i], MARGIN + 6, y);
      if (i < wrapped.length - 1) y += 3.8;
    }
    return y + 4.2;
  }

  // Regular paragraph
  y = checkPageBreak(doc, y, 6);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const cleanText = line.replace(/\*\*(.*?)\*\*/g, '$1');
  const wrapped = doc.splitTextToSize(s(cleanText), CONTENT_WIDTH - 4);
  for (let i = 0; i < wrapped.length; i++) {
    if (i > 0) y = checkPageBreak(doc, y, 4);
    doc.text(wrapped[i], MARGIN + 2, y);
    if (i < wrapped.length - 1) y += 3.8;
  }
  return y + 4.2;
}

const PRIORITY_LABELS: Record<string, string> = {
  high: 'Wazne',
  medium: 'Srednie',
  low: 'Mniej wazne',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'Nowy',
  contacted: 'Skontaktowany',
  interested: 'Zainteresowany',
  not_interested: 'Niezainteresowany',
  converted: 'Skonwertowany',
};

function renderProspectPage(doc: jsPDF, prospect: MeetingProspect, isFirst: boolean) {
  if (!isFirst) doc.addPage();
  let y = MARGIN;

  // Header bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, PAGE_WIDTH, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(s(`Brief do pierwszej rozmowy: ${prospect.full_name}`), MARGIN, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const meta: string[] = [];
  if (prospect.company) meta.push(prospect.company);
  if (prospect.position) meta.push(prospect.position);
  if (prospect.industry) meta.push(prospect.industry);
  if (meta.length) {
    doc.text(s(meta.join('  |  ')), MARGIN, 19);
  }

  if (prospect.ai_brief_generated_at) {
    const date = new Date(prospect.ai_brief_generated_at).toLocaleDateString('pl-PL', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    doc.text(s(`Wygenerowano: ${date}`), MARGIN, 25);
  }

  doc.setTextColor(0, 0, 0);
  y = 35;

  // Parse and render brief sections
  if (prospect.ai_brief) {
    const sections = parseMarkdownBrief(prospect.ai_brief);

    for (const section of sections) {
      const color = getSectionColor(section.title);
      // Strip emoji for cleaner PDF header
      const cleanTitle = section.title.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim();
      y = addSectionHeader(doc, cleanTitle.toUpperCase(), y, color);

      for (const line of section.lines) {
        y = renderLine(doc, line, y);
      }
      y += 3;
    }
  }

  // Footer
  y = checkPageBreak(doc, y, 15);
  doc.setDrawColor(...COLORS.lightGray);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 4;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.gray);

  const footerParts: string[] = [];
  if (prospect.source_event) footerParts.push(`Zrodlo: ${prospect.source_event}`);
  if (prospect.priority) footerParts.push(`Priorytet: ${PRIORITY_LABELS[prospect.priority] || prospect.priority}`);
  footerParts.push(`Status: ${STATUS_LABELS[prospect.prospecting_status] || prospect.prospecting_status}`);

  doc.text(s(footerParts.join('  |  ')), MARGIN, y);
  doc.setTextColor(0, 0, 0);
}

export function exportProspectBriefsPDF(prospects: MeetingProspect[]): void {
  const withBrief = prospects.filter(p => p.ai_brief);

  if (withBrief.length === 0) {
    toast.error('Brak wygenerowanych briefow do eksportu');
    return;
  }

  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    withBrief.forEach((prospect, index) => {
      renderProspectPage(doc, prospect, index === 0);
    });

    const date = new Date().toISOString().slice(0, 10);
    doc.save(`briefs-prospecting-${date}.pdf`);
    toast.success(`Wyeksportowano ${withBrief.length} brief(ow) do PDF`);
  } catch (err) {
    console.error('PDF export error:', err);
    toast.error('Blad podczas generowania PDF');
  }
}
