import { useState, useEffect } from 'react';
import { Book, Plus, Trash2, Search, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { useSynonyms, Synonym } from '@/hooks/useSynonyms';

const CATEGORY_LABELS: Record<string, string> = {
  branza: 'Branża',
  stanowisko: 'Stanowisko',
  usluga: 'Usługa',
  inne: 'Inne',
};

const CATEGORY_COLORS: Record<string, string> = {
  branza: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  stanowisko: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  usluga: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  inne: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

export function SynonymsDictionary() {
  const { 
    groupedSynonyms, 
    isLoading, 
    fetchSynonyms, 
    addSynonym, 
    deleteSynonym,
    testExpandQuery 
  } = useSynonyms();

  const [newTerm, setNewTerm] = useState('');
  const [newSynonyms, setNewSynonyms] = useState<string[]>([]);
  const [newSynonymInput, setNewSynonymInput] = useState('');
  const [newCategory, setNewCategory] = useState<string>('branza');
  const [isAdding, setIsAdding] = useState(false);
  
  const [testQuery, setTestQuery] = useState('');
  const [expandedTerms, setExpandedTerms] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  
  const [filter, setFilter] = useState('');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    branza: true,
    stanowisko: true,
    usluga: true,
    inne: true,
  });

  useEffect(() => {
    fetchSynonyms();
  }, [fetchSynonyms]);

  const handleAddSynonymTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newSynonymInput.trim()) {
      e.preventDefault();
      if (!newSynonyms.includes(newSynonymInput.trim().toLowerCase())) {
        setNewSynonyms([...newSynonyms, newSynonymInput.trim().toLowerCase()]);
      }
      setNewSynonymInput('');
    }
  };

  const handleRemoveSynonymTag = (synonym: string) => {
    setNewSynonyms(newSynonyms.filter(s => s !== synonym));
  };

  const handleAddSynonym = async () => {
    if (!newTerm.trim() || newSynonyms.length === 0) {
      toast.error('Podaj główny termin i co najmniej jeden synonim');
      return;
    }

    setIsAdding(true);
    const success = await addSynonym(newTerm.trim(), newSynonyms, newCategory);
    
    if (success) {
      toast.success('Synonim dodany pomyślnie');
      setNewTerm('');
      setNewSynonyms([]);
      setNewSynonymInput('');
    } else {
      toast.error('Nie udało się dodać synonimu');
    }
    setIsAdding(false);
  };

  const handleDeleteSynonym = async (id: string, term: string) => {
    const success = await deleteSynonym(id);
    if (success) {
      toast.success(`Usunięto: ${term}`);
    } else {
      toast.error('Nie udało się usunąć synonimu');
    }
  };

  const handleTestQuery = async () => {
    if (!testQuery.trim()) return;
    
    setIsTesting(true);
    const terms = await testExpandQuery(testQuery.trim());
    setExpandedTerms(terms);
    setIsTesting(false);
  };

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const filterSynonyms = (synonyms: Synonym[]) => {
    if (!filter) return synonyms;
    const lowerFilter = filter.toLowerCase();
    return synonyms.filter(s => 
      s.term.toLowerCase().includes(lowerFilter) ||
      s.synonyms.some(syn => syn.toLowerCase().includes(lowerFilter))
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Book className="h-5 w-5" />
          Słownik Synonimów
        </CardTitle>
        <CardDescription>
          Definiuj powiązania między terminami, aby wyszukiwanie "ochrona" znalazło "ubezpieczenie"
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add new synonym form */}
        <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
          <h4 className="font-medium text-sm">Dodaj nowy synonim</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Główny termin</label>
              <Input
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                placeholder="np. ochrona"
              />
            </div>
            
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Kategoria</label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="branza">Branża</SelectItem>
                  <SelectItem value="stanowisko">Stanowisko</SelectItem>
                  <SelectItem value="usluga">Usługa</SelectItem>
                  <SelectItem value="inne">Inne</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handleAddSynonym} 
                disabled={isAdding || !newTerm.trim() || newSynonyms.length === 0}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Dodaj
              </Button>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Synonimy (wpisz i naciśnij Enter)
            </label>
            <Input
              value={newSynonymInput}
              onChange={(e) => setNewSynonymInput(e.target.value)}
              onKeyDown={handleAddSynonymTag}
              placeholder="np. ubezpieczenie, polisa..."
            />
            {newSynonyms.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {newSynonyms.map((syn) => (
                  <Badge 
                    key={syn} 
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleRemoveSynonymTag(syn)}
                  >
                    {syn} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtruj synonimy..."
            className="max-w-xs"
          />
        </div>

        {/* Synonyms list by category */}
        {isLoading ? (
          <div className="text-muted-foreground text-center py-8">
            Ładowanie synonimów...
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(CATEGORY_LABELS).map(([category, label]) => {
              const synonymsInCategory = filterSynonyms(groupedSynonyms[category] || []);
              if (synonymsInCategory.length === 0 && filter) return null;
              
              return (
                <Collapsible 
                  key={category} 
                  open={openCategories[category]}
                  onOpenChange={() => toggleCategory(category)}
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between px-3 py-2 h-auto">
                      <div className="flex items-center gap-2">
                        {openCategories[category] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <Badge className={CATEGORY_COLORS[category]}>
                          {label}
                        </Badge>
                        <span className="text-muted-foreground text-sm">
                          ({synonymsInCategory.length})
                        </span>
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 pl-6 pt-1">
                    {synonymsInCategory.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        Brak synonimów w tej kategorii
                      </p>
                    ) : (
                      synonymsInCategory.map((synonym) => (
                        <div 
                          key={synonym.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 group"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-sm">{synonym.term}</span>
                            <span className="text-muted-foreground mx-2">→</span>
                            <span className="text-sm text-muted-foreground truncate">
                              {synonym.synonyms.join(', ')}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteSynonym(synonym.id, synonym.term)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}

        {/* Test query expansion */}
        <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Test rozszerzenia zapytania
          </h4>
          <div className="flex gap-2">
            <Input
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTestQuery()}
              placeholder="np. ochrona"
              className="flex-1"
            />
            <Button onClick={handleTestQuery} disabled={isTesting || !testQuery.trim()}>
              Testuj
            </Button>
          </div>
          {expandedTerms.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Rozszerzone zapytanie:</p>
              <div className="flex flex-wrap gap-1">
                {expandedTerms.map((term, i) => (
                  <Badge key={i} variant={i === 0 ? 'default' : 'secondary'}>
                    {term}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
