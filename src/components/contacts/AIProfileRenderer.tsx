import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type SectionStatus = 'confirmed' | 'deduction' | 'missing' | 'mixed';

interface ProfileSection {
  title: string;
  icon: string;
  status: SectionStatus;
  content: string;
  isFullWidth?: boolean;
}

// Sekcje które zajmują pełną szerokość
const FULL_WIDTH_SECTIONS = [
  'kim jest ta osoba',
  'kompetencje',
  'ekspertyza',
  'wartość dla sieci',
  'aktualne potrzeby',
  'pytania do następnego spotkania',
  'rekomendowany kontakt'
];

function parseProfileToSections(markdown: string): ProfileSection[] {
  if (!markdown) return [];
  
  const sections: ProfileSection[] = [];
  const sectionRegex = /##\s*(.+?)(?=\n##|\n*$)/gs;
  const matches = markdown.matchAll(sectionRegex);
  
  for (const match of matches) {
    const fullSection = match[0];
    const titleLine = fullSection.split('\n')[0].replace('##', '').trim();
    const content = fullSection.split('\n').slice(1).join('\n').trim();
    
    // Wyciągnij emoji z tytułu
    const emojiMatch = titleLine.match(/^([\p{Emoji}\u200d]+)\s*/u);
    const icon = emojiMatch ? emojiMatch[1] : '📌';
    const title = titleLine.replace(/^[\p{Emoji}\u200d]+\s*/u, '').trim();
    
    // Określ status na podstawie zawartości
    const hasConfirmed = content.includes('✅');
    const hasDeduction = content.includes('💡');
    const hasMissing = content.includes('📭');
    
    let status: SectionStatus = 'mixed';
    if (hasConfirmed && !hasDeduction && !hasMissing) {
      status = 'confirmed';
    } else if (!hasConfirmed && hasDeduction && !hasMissing) {
      status = 'deduction';
    } else if (!hasConfirmed && !hasDeduction && hasMissing) {
      status = 'missing';
    } else if (hasConfirmed || hasDeduction || hasMissing) {
      status = 'mixed';
    }
    
    const isFullWidth = FULL_WIDTH_SECTIONS.some(s => title.toLowerCase().includes(s));
    
    sections.push({
      title,
      icon,
      status,
      content,
      isFullWidth
    });
  }
  
  return sections;
}

function StatusBadge({ status }: { status: SectionStatus }) {
  const config = {
    confirmed: {
      label: '✅ Potwierdzone',
      className: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700'
    },
    deduction: {
      label: '💡 Dedukcja AI',
      className: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700'
    },
    missing: {
      label: '📭 Do uzupełnienia',
      className: 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600'
    },
    mixed: {
      label: '📊 Mieszane źródła',
      className: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700'
    }
  };
  
  const { label, className } = config[status];
  
  return (
    <Badge variant="outline" className={cn('text-xs font-normal', className)}>
      {label}
    </Badge>
  );
}

function formatContent(content: string): React.ReactNode {
  // Podziel na linie i sformatuj każdą
  const lines = content.split('\n').filter(line => line.trim());
  
  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        const trimmedLine = line.trim();
        
        // Wykryj i stylizuj oznaczenia statusu
        if (trimmedLine.startsWith('✅')) {
          return (
            <div key={index} className="flex items-start gap-2 p-2 rounded-md bg-green-50 dark:bg-green-900/20 border-l-2 border-green-500">
              <span className="text-sm">{trimmedLine}</span>
            </div>
          );
        }
        
        if (trimmedLine.startsWith('💡')) {
          return (
            <div key={index} className="flex items-start gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-900/20 border-l-2 border-amber-500">
              <span className="text-sm">{trimmedLine}</span>
            </div>
          );
        }
        
        if (trimmedLine.startsWith('📭')) {
          return (
            <div key={index} className="flex items-start gap-2 p-2 rounded-md bg-gray-50 dark:bg-gray-800/50 border-l-2 border-gray-400">
              <span className="text-sm text-muted-foreground">{trimmedLine}</span>
            </div>
          );
        }
        
        // Lista (bullet points)
        if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•') || trimmedLine.startsWith('*')) {
          return (
            <div key={index} className="flex items-start gap-2 pl-2">
              <span className="text-muted-foreground">•</span>
              <span className="text-sm">{trimmedLine.replace(/^[-•*]\s*/, '')}</span>
            </div>
          );
        }
        
        // Numerowana lista
        if (/^\d+\./.test(trimmedLine)) {
          return (
            <div key={index} className="flex items-start gap-2 pl-2">
              <span className="text-sm">{trimmedLine}</span>
            </div>
          );
        }
        
        // Zwykły tekst
        return (
          <p key={index} className="text-sm">
            {trimmedLine}
          </p>
        );
      })}
    </div>
  );
}

function ProfileSectionCard({ section }: { section: ProfileSection }) {
  const borderColors = {
    confirmed: 'border-l-green-500',
    deduction: 'border-l-amber-500',
    missing: 'border-l-gray-400',
    mixed: 'border-l-blue-500'
  };
  
  const bgColors = {
    confirmed: 'bg-green-50/30 dark:bg-green-900/10',
    deduction: 'bg-amber-50/30 dark:bg-amber-900/10',
    missing: 'bg-gray-50/30 dark:bg-gray-800/20',
    mixed: 'bg-card'
  };
  
  return (
    <Card className={cn(
      'border-l-4 transition-all hover:shadow-md',
      borderColors[section.status],
      bgColors[section.status]
    )}>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <span className="text-lg">{section.icon}</span>
            <span>{section.title}</span>
          </CardTitle>
          <StatusBadge status={section.status} />
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-4 pb-3">
        {formatContent(section.content)}
      </CardContent>
    </Card>
  );
}

interface AIProfileRendererProps {
  markdown: string;
}

export function AIProfileRenderer({ markdown }: AIProfileRendererProps) {
  const sections = parseProfileToSections(markdown);
  
  if (sections.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic p-4 text-center">
        Brak danych profilu do wyświetlenia
      </div>
    );
  }
  
  // Podziel na sekcje pełnej szerokości i wąskie
  const fullWidthSections = sections.filter(s => s.isFullWidth);
  const narrowSections = sections.filter(s => !s.isFullWidth);
  
  // Pierwsza sekcja (zwykle "Kim jest ta osoba") powinna być na górze
  const mainSection = fullWidthSections.find(s => 
    s.title.toLowerCase().includes('kim jest')
  );
  const otherFullWidth = fullWidthSections.filter(s => 
    !s.title.toLowerCase().includes('kim jest')
  );
  
  // Sekcja pytań na koniec
  const questionsSection = otherFullWidth.find(s => 
    s.title.toLowerCase().includes('pytania')
  );
  const middleFullWidth = otherFullWidth.filter(s => 
    !s.title.toLowerCase().includes('pytania')
  );
  
  return (
    <div className="space-y-4">
      {/* Legenda */}
      <div className="flex flex-wrap gap-2 pb-2 border-b">
        <span className="text-xs text-muted-foreground mr-2">Legenda:</span>
        <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400">
          ✅ Potwierdzone
        </Badge>
        <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400">
          💡 Dedukcja AI
        </Badge>
        <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400">
          📭 Do uzupełnienia
        </Badge>
      </div>
      
      {/* Główna sekcja - Kim jest ta osoba */}
      {mainSection && (
        <ProfileSectionCard section={mainSection} />
      )}
      
      {/* Sekcje wąskie w siatce 2 kolumn */}
      {narrowSections.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {narrowSections.map((section, index) => (
            <ProfileSectionCard key={index} section={section} />
          ))}
        </div>
      )}
      
      {/* Pozostałe sekcje pełnej szerokości */}
      {middleFullWidth.map((section, index) => (
        <ProfileSectionCard key={`full-${index}`} section={section} />
      ))}
      
      {/* Sekcja pytań na końcu - wyróżniona */}
      {questionsSection && (
        <div className="pt-2 border-t">
          <ProfileSectionCard section={questionsSection} />
        </div>
      )}
    </div>
  );
}
