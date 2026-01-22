import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

// Polish character sanitization for PDF compatibility
const polishMap: Record<string, string> = {
  'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
  'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
  'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N',
  'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
};

function sanitizePolish(text: string): string {
  if (!text) return '';
  return text.split('').map(char => polishMap[char] || char).join('');
}

function s(text: string | undefined | null): string {
  return sanitizePolish(text || '');
}

interface MeetingBrief {
  one_liner?: string;
  what_to_know?: string[];
  do?: string[];
  dont?: string[];
  opening_topics?: string[];
}

interface PersonProfile {
  summary?: string;
  role_in_company?: string;
  decision_making_style?: string;
  communication_preferences?: string;
}

interface ChallengeDetailed {
  challenge: string;
  context?: string;
  why_it_matters?: string;
  potential_approach?: string;
}

interface GoalDetailed {
  goal: string;
  timeline?: string;
  priority?: string;
  how_we_can_help?: string;
}

interface TopicToDiscuss {
  topic: string;
  why_relevant?: string;
  suggested_angle?: string;
}

interface CompanyContext {
  key_facts?: string;
  current_situation?: string;
  opportunities?: string;
}

interface BusinessValueDetailed {
  summary?: string;
  strategic_importance?: string;
  risks?: string;
}

interface AgentInsight {
  text: string;
  source?: string;
  importance?: string;
}

export interface AgentProfileExportData {
  contactName: string;
  agentPersona?: string;
  lastRefreshAt?: string;
  meetingBrief?: MeetingBrief;
  personProfile?: PersonProfile;
  challengesDetailed?: ChallengeDetailed[];
  goalsDetailed?: GoalDetailed[];
  topicsToDiscuss?: TopicToDiscuss[];
  companyContext?: CompanyContext;
  businessValueDetailed?: BusinessValueDetailed;
  insights?: AgentInsight[];
}

// Color definitions for sections
const COLORS = {
  primary: [59, 130, 246] as [number, number, number],      // Blue
  purple: [147, 51, 234] as [number, number, number],       // Purple
  red: [239, 68, 68] as [number, number, number],           // Red
  green: [34, 197, 94] as [number, number, number],         // Green
  orange: [249, 115, 22] as [number, number, number],       // Orange
  gray: [107, 114, 128] as [number, number, number],        // Gray
  amber: [245, 158, 11] as [number, number, number],        // Amber/Gold
  cyan: [6, 182, 212] as [number, number, number],          // Cyan
  darkGray: [55, 65, 81] as [number, number, number],       // Dark Gray
  lightGray: [243, 244, 246] as [number, number, number],   // Light Gray bg
};

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 15;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

function checkPageBreak(doc: jsPDF, currentY: number, neededSpace: number = 30): number {
  if (currentY + neededSpace > PAGE_HEIGHT - MARGIN) {
    doc.addPage();
    return MARGIN + 10;
  }
  return currentY;
}

function addSectionHeader(doc: jsPDF, title: string, y: number, color: [number, number, number]): number {
  y = checkPageBreak(doc, y, 20);
  
  // Section header background
  doc.setFillColor(...color);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 8, 2, 2, 'F');
  
  // Section title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(s(title), MARGIN + 4, y + 5.5);
  
  doc.setTextColor(0, 0, 0);
  return y + 12;
}

function addParagraph(doc: jsPDF, text: string, y: number, options?: { bold?: boolean; fontSize?: number; maxWidth?: number }): number {
  const fontSize = options?.fontSize || 10;
  const maxWidth = options?.maxWidth || CONTENT_WIDTH;
  
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', options?.bold ? 'bold' : 'normal');
  
  const lines = doc.splitTextToSize(s(text), maxWidth);
  const lineHeight = fontSize * 0.4;
  
  for (const line of lines) {
    y = checkPageBreak(doc, y, lineHeight + 2);
    doc.text(line, MARGIN, y);
    y += lineHeight;
  }
  
  return y + 2;
}

function addBulletList(doc: jsPDF, items: string[], y: number, color?: [number, number, number]): number {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  for (const item of items) {
    y = checkPageBreak(doc, y, 8);
    
    // Bullet point
    if (color) {
      doc.setFillColor(...color);
    } else {
      doc.setFillColor(...COLORS.primary);
    }
    doc.circle(MARGIN + 2, y - 1.5, 1.2, 'F');
    
    // Text
    doc.setTextColor(0, 0, 0);
    const lines = doc.splitTextToSize(s(item), CONTENT_WIDTH - 10);
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) y = checkPageBreak(doc, y, 5);
      doc.text(lines[i], MARGIN + 6, y);
      if (i < lines.length - 1) y += 4;
    }
    y += 5;
  }
  
  return y;
}

export function exportAgentProfileToPDF(data: AgentProfileExportData): void {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    let y = MARGIN;

    // === HEADER ===
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, PAGE_WIDTH, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(s(`Profil Agenta AI: ${data.contactName}`), MARGIN, 15);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dateStr = data.lastRefreshAt 
      ? new Date(data.lastRefreshAt).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    doc.text(s(`Wygenerowano: ${dateStr}`), MARGIN, 22);
    
    // Agent persona as subtitle
    if (data.agentPersona) {
      doc.setFontSize(9);
      const personaLines = doc.splitTextToSize(s(data.agentPersona), CONTENT_WIDTH);
      doc.text(personaLines.slice(0, 2).join(' '), MARGIN, 30);
    }
    
    doc.setTextColor(0, 0, 0);
    y = 45;

    // === MEETING BRIEF ===
    if (data.meetingBrief) {
      y = addSectionHeader(doc, 'BRIEF POD SPOTKANIE', y, COLORS.primary);
      
      // One-liner highlight
      if (data.meetingBrief.one_liner) {
        y = checkPageBreak(doc, y, 15);
        doc.setFillColor(...COLORS.lightGray);
        doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 12, 2, 2, 'F');
        doc.setFillColor(...COLORS.primary);
        doc.rect(MARGIN, y, 3, 12, 'F');
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bolditalic');
        doc.setTextColor(...COLORS.darkGray);
        const oneLinerLines = doc.splitTextToSize(s(data.meetingBrief.one_liner), CONTENT_WIDTH - 12);
        doc.text(oneLinerLines[0], MARGIN + 6, y + 7);
        doc.setTextColor(0, 0, 0);
        y += 16;
      }
      
      // What to know
      if (data.meetingBrief.what_to_know?.length) {
        y = checkPageBreak(doc, y, 10);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(s('Co musisz wiedziec:'), MARGIN, y);
        y += 5;
        y = addBulletList(doc, data.meetingBrief.what_to_know, y, COLORS.primary);
      }
      
      // DO / DON'T table
      if (data.meetingBrief.do?.length || data.meetingBrief.dont?.length) {
        y = checkPageBreak(doc, y, 30);
        
        const doItems = data.meetingBrief.do || [];
        const dontItems = data.meetingBrief.dont || [];
        const maxRows = Math.max(doItems.length, dontItems.length);
        
        const tableData: string[][] = [];
        for (let i = 0; i < maxRows; i++) {
          tableData.push([
            doItems[i] ? `✓ ${s(doItems[i])}` : '',
            dontItems[i] ? `✗ ${s(dontItems[i])}` : ''
          ]);
        }
        
        autoTable(doc, {
          startY: y,
          head: [[s('TAK - Rob to'), s('NIE - Unikaj')]],
          body: tableData,
          theme: 'grid',
          headStyles: { 
            fillColor: [34, 197, 94],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
          },
          columnStyles: {
            0: { cellWidth: CONTENT_WIDTH / 2, fillColor: [240, 253, 244] },
            1: { cellWidth: CONTENT_WIDTH / 2, fillColor: [254, 242, 242], textColor: [127, 29, 29] }
          },
          styles: { fontSize: 9, cellPadding: 3 },
          margin: { left: MARGIN, right: MARGIN },
          didParseCell: (data) => {
            if (data.section === 'head' && data.column.index === 1) {
              data.cell.styles.fillColor = [239, 68, 68];
            }
          }
        });
        
        y = (doc as any).lastAutoTable.finalY + 5;
      }
      
      // Opening topics
      if (data.meetingBrief.opening_topics?.length) {
        y = checkPageBreak(doc, y, 10);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(s('Tematy na otwarcie rozmowy:'), MARGIN, y);
        y += 5;
        y = addBulletList(doc, data.meetingBrief.opening_topics, y, COLORS.orange);
      }
      
      y += 5;
    }

    // === PERSON PROFILE ===
    if (data.personProfile) {
      y = addSectionHeader(doc, 'PROFIL OSOBY', y, COLORS.purple);
      
      if (data.personProfile.summary) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(s('Kim jest:'), MARGIN, y);
        y += 4;
        y = addParagraph(doc, data.personProfile.summary, y);
        y += 2;
      }
      
      const profileFields = [
        { label: 'Rola w firmie', value: data.personProfile.role_in_company },
        { label: 'Styl podejmowania decyzji', value: data.personProfile.decision_making_style },
        { label: 'Preferencje komunikacji', value: data.personProfile.communication_preferences }
      ].filter(f => f.value);
      
      if (profileFields.length) {
        const profileTableData = profileFields.map(f => [s(f.label), s(f.value!)]);
        
        autoTable(doc, {
          startY: y,
          body: profileTableData,
          theme: 'plain',
          columnStyles: {
            0: { cellWidth: 50, fontStyle: 'bold', textColor: COLORS.purple },
            1: { cellWidth: CONTENT_WIDTH - 50 }
          },
          styles: { fontSize: 9, cellPadding: 2 },
          margin: { left: MARGIN, right: MARGIN }
        });
        
        y = (doc as any).lastAutoTable.finalY + 5;
      }
    }

    // === CHALLENGES ===
    if (data.challengesDetailed?.length) {
      y = addSectionHeader(doc, 'WYZWANIA', y, COLORS.red);
      
      const challengeData = data.challengesDetailed.map(c => [
        s(c.challenge),
        s(c.context || '-'),
        s(c.why_it_matters || '-'),
        s(c.potential_approach || '-')
      ]);
      
      autoTable(doc, {
        startY: y,
        head: [[s('Wyzwanie'), s('Kontekst'), s('Dlaczego wazne'), s('Podejscie')]],
        body: challengeData,
        theme: 'striped',
        headStyles: { fillColor: COLORS.red, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 35, fontStyle: 'bold' },
          1: { cellWidth: 45 },
          2: { cellWidth: 45 },
          3: { cellWidth: 45 }
        },
        margin: { left: MARGIN, right: MARGIN }
      });
      
      y = (doc as any).lastAutoTable.finalY + 5;
    }

    // === GOALS ===
    if (data.goalsDetailed?.length) {
      y = addSectionHeader(doc, 'CELE', y, COLORS.green);
      
      const goalData = data.goalsDetailed.map(g => [
        s(g.goal),
        s(g.timeline || '-'),
        s(g.priority || '-'),
        s(g.how_we_can_help || '-')
      ]);
      
      autoTable(doc, {
        startY: y,
        head: [[s('Cel'), s('Horyzont'), s('Priorytet'), s('Jak mozemy pomoc')]],
        body: goalData,
        theme: 'striped',
        headStyles: { fillColor: COLORS.green, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 45, fontStyle: 'bold' },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 75 }
        },
        margin: { left: MARGIN, right: MARGIN }
      });
      
      y = (doc as any).lastAutoTable.finalY + 5;
    }

    // === TOPICS TO DISCUSS ===
    if (data.topicsToDiscuss?.length) {
      y = addSectionHeader(doc, 'TEMATY DO ROZMOWY', y, COLORS.orange);
      
      const topicData = data.topicsToDiscuss.map(t => [
        s(t.topic),
        s(t.why_relevant || '-'),
        s(t.suggested_angle || '-')
      ]);
      
      autoTable(doc, {
        startY: y,
        head: [[s('Temat'), s('Dlaczego warto poruszyc'), s('Sugerowany kat')]],
        body: topicData,
        theme: 'striped',
        headStyles: { fillColor: COLORS.orange, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 60 },
          2: { cellWidth: 60 }
        },
        margin: { left: MARGIN, right: MARGIN }
      });
      
      y = (doc as any).lastAutoTable.finalY + 5;
    }

    // === COMPANY CONTEXT ===
    if (data.companyContext) {
      y = addSectionHeader(doc, 'KONTEKST FIRMY', y, COLORS.gray);
      
      const contextFields = [
        { label: 'Kluczowe fakty', value: data.companyContext.key_facts },
        { label: 'Aktualna sytuacja', value: data.companyContext.current_situation },
        { label: 'Mozliwosci', value: data.companyContext.opportunities }
      ].filter(f => f.value);
      
      for (const field of contextFields) {
        y = checkPageBreak(doc, y, 15);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.gray);
        doc.text(s(field.label + ':'), MARGIN, y);
        doc.setTextColor(0, 0, 0);
        y += 4;
        y = addParagraph(doc, field.value!, y);
        y += 2;
      }
      
      y += 3;
    }

    // === BUSINESS VALUE ===
    if (data.businessValueDetailed) {
      y = addSectionHeader(doc, 'WARTOSC BIZNESOWA', y, COLORS.amber);
      
      const valueFields = [
        { label: 'Podsumowanie', value: data.businessValueDetailed.summary },
        { label: 'Znaczenie strategiczne', value: data.businessValueDetailed.strategic_importance },
        { label: 'Ryzyka', value: data.businessValueDetailed.risks }
      ].filter(f => f.value);
      
      for (const field of valueFields) {
        y = checkPageBreak(doc, y, 15);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.amber);
        doc.text(s(field.label + ':'), MARGIN, y);
        doc.setTextColor(0, 0, 0);
        y += 4;
        y = addParagraph(doc, field.value!, y);
        y += 2;
      }
      
      y += 3;
    }

    // === INSIGHTS ===
    if (data.insights?.length) {
      y = addSectionHeader(doc, 'INSIGHTS', y, COLORS.cyan);
      
      for (const insight of data.insights) {
        y = checkPageBreak(doc, y, 12);
        
        // Importance indicator
        const importanceColor = insight.importance === 'high' ? COLORS.red : 
                               insight.importance === 'medium' ? COLORS.orange : COLORS.gray;
        doc.setFillColor(...importanceColor);
        doc.circle(MARGIN + 2, y - 1, 2, 'F');
        
        // Insight text
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const insightLines = doc.splitTextToSize(s(insight.text), CONTENT_WIDTH - 10);
        for (let i = 0; i < insightLines.length; i++) {
          if (i > 0) y = checkPageBreak(doc, y, 4);
          doc.text(insightLines[i], MARGIN + 7, y);
          if (i < insightLines.length - 1) y += 4;
        }
        
        // Source
        if (insight.source) {
          y += 3;
          doc.setFontSize(8);
          doc.setTextColor(...COLORS.gray);
          doc.text(s(`Zrodlo: ${insight.source}`), MARGIN + 7, y);
          doc.setTextColor(0, 0, 0);
        }
        
        y += 6;
      }
    }

    // === FOOTER on each page ===
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.gray);
      doc.text(
        s(`Strona ${i} z ${pageCount} | Profil Agenta AI: ${data.contactName}`),
        PAGE_WIDTH / 2,
        PAGE_HEIGHT - 8,
        { align: 'center' }
      );
    }

    // Generate filename
    const safeName = data.contactName.replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ ]/g, '').replace(/\s+/g, '_');
    const dateForFile = new Date().toISOString().split('T')[0];
    const filename = `agent_profil_${sanitizePolish(safeName)}_${dateForFile}.pdf`;
    
    doc.save(filename);
    toast.success('Profil Agenta AI wyeksportowany do PDF');
    
  } catch (error) {
    console.error('Error exporting agent profile to PDF:', error);
    toast.error('Błąd podczas eksportu do PDF');
  }
}
