import { Shield, AlertTriangle, Lightbulb, Info, FileText, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { TypDzialnosci, PodpowiedzAI, RyzykoOC, RyzykoSpecjalistyczne, RyzykoPracownicy } from './types';

interface AIRiskConsultantPanelProps {
  operationalTypes: TypDzialnosci[];
  aiAnalysis?: string;
  aiPrompts?: PodpowiedzAI[];
  aiBrief?: string;
  oc: RyzykoOC;
  specjalistyczne: RyzykoSpecjalistyczne;
  pracownicy: RyzykoPracownicy;
  onGenerateBrief: () => void;
  onAnalyze: () => void;
  isAnalyzing?: boolean;
  isGeneratingBrief?: boolean;
}

// Statyczne podpowiedzi bazujące na danych
function generateStaticPrompts(
  operationalTypes: TypDzialnosci[],
  oc: RyzykoOC,
  specjalistyczne: RyzykoSpecjalistyczne,
  pracownicy: RyzykoPracownicy
): PodpowiedzAI[] {
  const prompts: PodpowiedzAI[] = [];
  
  // Jurysdykcja USA
  if (oc.jurysdykcja_usa) {
    prompts.push({
      id: 'usa_jurisdiction',
      wyzwalacz: 'jurysdykcja_usa',
      wiadomosc: 'Zapytaj o wyłączenia jurysdykcji USA i procent obrotów w Ameryce Północnej. Recall produktów w USA może przekroczyć 10 mln EUR.',
      priorytet: 'krytyczny',
      domena: 'oc',
    });
  }
  
  // Produkcja
  if (operationalTypes.includes('produkcja')) {
    prompts.push({
      id: 'production_fire',
      wyzwalacz: 'produkcja',
      wiadomosc: 'Sprawdź zgodność przeciwpożarową, systemy odpylania i pokrycie awarii maszyn.',
      priorytet: 'ostrzezenie',
      domena: 'majatek',
    });
  }
  
  // Cyber gap
  if (specjalistyczne.cyber_status === 'luka') {
    prompts.push({
      id: 'cyber_gap',
      wyzwalacz: 'cyber_luka',
      wiadomosc: 'Wykryto lukę w ubezpieczeniu cyber. E-commerce i systemy IT tworzą ekspozycję na naruszenie danych.',
      priorytet: 'ostrzezenie',
      domena: 'specjalistyczne',
    });
  }
  
  // E-commerce
  if (operationalTypes.includes('ecommerce') && specjalistyczne.cyber_status !== 'ubezpieczone') {
    prompts.push({
      id: 'ecommerce_cyber',
      wyzwalacz: 'ecommerce',
      wiadomosc: 'Kanał e-commerce wymaga ochrony danych klientów. Rozważ ubezpieczenie cyber.',
      priorytet: 'ostrzezenie',
      domena: 'specjalistyczne',
    });
  }
  
  // Import/Export
  if (operationalTypes.includes('import_export')) {
    prompts.push({
      id: 'import_cargo',
      wyzwalacz: 'import_export',
      wiadomosc: 'Przy imporcie/eksporcie sprawdź pokrycie cargo i warunki Incoterms.',
      priorytet: 'info',
      domena: 'flota',
    });
  }
  
  // Travel gap for trade companies
  if ((operationalTypes.includes('handel') || operationalTypes.includes('import_export')) && pracownicy.podroze_status === 'luka') {
    prompts.push({
      id: 'travel_gap',
      wyzwalacz: 'podroze_luka',
      wiadomosc: 'Handlowcy podróżujący służbowo powinni mieć ubezpieczenie podróży.',
      priorytet: 'ostrzezenie',
      domena: 'pracownicy',
    });
  }
  
  return prompts;
}

// Statyczna analiza kontekstu
function generateContextAnalysis(operationalTypes: TypDzialnosci[]): string[] {
  const analysis: string[] = [];
  
  if (operationalTypes.includes('produkcja')) {
    analysis.push('**Kluczowe ryzyka dla Produkcji:**');
    analysis.push('• Obciążenie ogniowe');
    analysis.push('• Awaria maszyn (MB)');
    analysis.push('• Przerwy w działalności');
    analysis.push('• OC produktowe');
  }
  
  if (operationalTypes.includes('handel')) {
    analysis.push('**Kluczowe ryzyka dla Handlu:**');
    analysis.push('• Odpowiedzialność za produkt');
    analysis.push('• Ochrona zapasów');
    analysis.push('• Transport towarów');
  }
  
  if (operationalTypes.includes('import_export')) {
    analysis.push('**Kluczowe ryzyka dla Eksportu:**');
    analysis.push('• Uszkodzenie cargo');
    analysis.push('• Wahania kursowe');
    analysis.push('• Jurysdykcja zagraniczna');
    analysis.push('• Recall produktów');
  }
  
  if (operationalTypes.includes('uslugi')) {
    analysis.push('**Kluczowe ryzyka dla Usług:**');
    analysis.push('• OC zawodowe');
    analysis.push('• Błędy i zaniechania');
    analysis.push('• Ochrona danych');
  }
  
  if (operationalTypes.includes('ecommerce')) {
    analysis.push('**Kluczowe ryzyka dla e-Commerce:**');
    analysis.push('• Cyber - naruszenie danych');
    analysis.push('• Przerwy w działalności IT');
    analysis.push('• OC produktowe');
  }
  
  return analysis;
}

export function AIRiskConsultantPanel({
  operationalTypes,
  aiAnalysis,
  aiPrompts,
  aiBrief,
  oc,
  specjalistyczne,
  pracownicy,
  onGenerateBrief,
  onAnalyze,
  isAnalyzing,
  isGeneratingBrief,
}: AIRiskConsultantPanelProps) {
  const staticPrompts = generateStaticPrompts(operationalTypes, oc, specjalistyczne, pracownicy);
  const contextAnalysis = generateContextAnalysis(operationalTypes);
  const allPrompts = [...staticPrompts, ...(aiPrompts || [])];
  
  const criticalPrompts = allPrompts.filter((p) => p.priorytet === 'krytyczny');
  const warningPrompts = allPrompts.filter((p) => p.priorytet === 'ostrzezenie');
  const infoPrompts = allPrompts.filter((p) => p.priorytet === 'info');

  return (
    <div className="h-full flex flex-col bg-slate-900 dark:bg-slate-950 text-slate-100 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">Konsultant AI Ryzyka</h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Analiza kontekstu */}
          {operationalTypes.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Analiza kontekstu
              </h3>
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-sm space-y-1">
                {contextAnalysis.map((line, idx) => (
                  <p key={idx} className={cn(
                    line.startsWith('**') ? 'font-medium text-slate-200 mt-2 first:mt-0' : 'text-slate-400 text-xs'
                  )}>
                    {line.replace(/\*\*/g, '')}
                  </p>
                ))}
              </div>
              {aiAnalysis && (
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-sm">
                  <p className="text-slate-300 whitespace-pre-wrap">{aiAnalysis}</p>
                </div>
              )}
            </div>
          )}

          {/* Podpowiedzi */}
          {allPrompts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Podpowiedzi
              </h3>
              
              {criticalPrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className="p-3 rounded-lg bg-red-950/50 border border-red-500/50 text-sm"
                >
                  <div className="flex items-center gap-2 text-red-400 font-medium mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    KRYTYCZNE
                  </div>
                  <p className="text-slate-300">{prompt.wiadomosc}</p>
                </div>
              ))}

              {warningPrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className="p-3 rounded-lg bg-amber-950/50 border border-amber-500/50 text-sm"
                >
                  <div className="flex items-center gap-2 text-amber-400 font-medium mb-1">
                    <Lightbulb className="h-4 w-4" />
                    REKOMENDACJA
                  </div>
                  <p className="text-slate-300">{prompt.wiadomosc}</p>
                </div>
              ))}

              {infoPrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className="p-3 rounded-lg bg-blue-950/50 border border-blue-500/50 text-sm"
                >
                  <div className="flex items-center gap-2 text-blue-400 font-medium mb-1">
                    <Info className="h-4 w-4" />
                    INFORMACJA
                  </div>
                  <p className="text-slate-300">{prompt.wiadomosc}</p>
                </div>
              ))}
            </div>
          )}

          {/* Brief brokerski */}
          {aiBrief && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Brief Brokerski
              </h3>
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-sm">
                <p className="text-slate-300 whitespace-pre-wrap">{aiBrief}</p>
              </div>
            </div>
          )}
          
          {/* Pusty stan */}
          {operationalTypes.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Wybierz typy działalności, aby zobaczyć analizę ryzyka</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="p-4 border-t border-slate-700 space-y-2">
        <Button
          onClick={onAnalyze}
          disabled={isAnalyzing || operationalTypes.length === 0}
          variant="outline"
          className="w-full bg-slate-800 border-slate-600 hover:bg-slate-700 text-slate-200"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analizuję...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Analiza AI
            </>
          )}
        </Button>
        <Button
          onClick={onGenerateBrief}
          disabled={isGeneratingBrief || operationalTypes.length === 0}
          className="w-full"
        >
          {isGeneratingBrief ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generuję...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Generuj Brief Brokerski
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
