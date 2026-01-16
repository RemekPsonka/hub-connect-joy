import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Loader2, Sparkles, User, Target, Gift, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useSemanticSearch, SearchResult } from '@/hooks/useSemanticSearch';

type FilterType = 'all' | 'contact' | 'need' | 'offer';

const typeConfig = {
  contact: { icon: User, label: 'Kontakt', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  need: { icon: Target, label: 'Potrzeba', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  offer: { icon: Gift, label: 'Oferta', color: 'text-green-500', bgColor: 'bg-green-500/10' }
};

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get('q') || '';
  const initialType = (searchParams.get('type') as FilterType) || 'all';
  
  const [query, setQuery] = useState(initialQuery);
  const [filterType, setFilterType] = useState<FilterType>(initialType);
  const { search, results, isSearching, error } = useSemanticSearch();
  
  // Search on mount if query exists
  useEffect(() => {
    if (initialQuery) {
      const types = filterType === 'all' 
        ? ['contact', 'need', 'offer'] as const
        : [filterType] as const;
      search({ query: initialQuery, types: [...types], threshold: 0.3, limit: 30 });
    }
  }, []);
  
  const handleSearch = () => {
    if (!query.trim()) return;
    
    setSearchParams({ q: query, type: filterType });
    
    const types = filterType === 'all' 
      ? ['contact', 'need', 'offer'] as const
      : [filterType] as const;
    search({ query, types: [...types], threshold: 0.3, limit: 30 });
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  const handleFilterChange = (value: string) => {
    setFilterType(value as FilterType);
    if (query.trim()) {
      setSearchParams({ q: query, type: value });
      const types = value === 'all' 
        ? ['contact', 'need', 'offer'] as const
        : [value as 'contact' | 'need' | 'offer'] as const;
      search({ query, types: [...types], threshold: 0.3, limit: 30 });
    }
  };
  
  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case 'contact':
        navigate(`/contacts/${result.id}`);
        break;
      case 'need':
      case 'offer':
        // TODO: Navigate to specific need/offer
        break;
    }
  };
  
  const filteredResults = filterType === 'all' 
    ? results 
    : results.filter(r => r.type === filterType);
  
  return (
    <div className="container max-w-4xl py-8">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Wyszukiwanie AI</h1>
      </div>
      
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Szukaj semantycznie..."
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SearchIcon className="h-4 w-4" />
          )}
          <span className="ml-2">Szukaj</span>
        </Button>
      </div>
      
      <Tabs value={filterType} onValueChange={handleFilterChange} className="mb-6">
        <TabsList>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Wszystko
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Kontakty
          </TabsTrigger>
          <TabsTrigger value="need" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Potrzeby
          </TabsTrigger>
          <TabsTrigger value="offer" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Oferty
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-destructive text-center">
            {error}
          </CardContent>
        </Card>
      )}
      
      {!query.trim() && !isSearching && (
        <Card>
          <CardContent className="p-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary opacity-50" />
            <h3 className="text-lg font-medium mb-2">Wyszukiwanie semantyczne</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Wpisz zapytanie, aby wyszukać kontakty, potrzeby i oferty. 
              AI rozumie kontekst i znaczenie, nie tylko słowa kluczowe.
            </p>
          </CardContent>
        </Card>
      )}
      
      {isSearching && (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">Przeszukuję bazę AI...</p>
          </CardContent>
        </Card>
      )}
      
      {query.trim() && !isSearching && filteredResults.length === 0 && !error && (
        <Card>
          <CardContent className="p-12 text-center">
            <SearchIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Brak wyników</h3>
            <p className="text-muted-foreground text-sm">
              Nie znaleziono wyników dla "{query}"
            </p>
          </CardContent>
        </Card>
      )}
      
      {filteredResults.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Znaleziono {filteredResults.length} wyników</span>
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Dopasowanie AI
            </Badge>
          </div>
          
          {filteredResults.map((result) => {
            const config = typeConfig[result.type];
            const Icon = config.icon;
            const matchPercent = Math.round(result.similarity * 100);
            
            return (
              <Card 
                key={`${result.type}-${result.id}`}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleResultClick(result)}
              >
                <CardContent className="p-4 flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${config.bgColor}`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{result.title}</h3>
                      <Badge 
                        variant="outline" 
                        className={
                          matchPercent >= 80 ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                          matchPercent >= 60 ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' :
                          ''
                        }
                      >
                        Dopasowanie: {matchPercent}%
                      </Badge>
                    </div>
                    {result.subtitle && (
                      <p className="text-sm text-muted-foreground">{result.subtitle}</p>
                    )}
                    {result.description && (
                      <p className="text-sm text-muted-foreground/70 mt-1 line-clamp-2">
                        {result.description}
                      </p>
                    )}
                  </div>
                  
                  <Badge variant="secondary" className={`${config.bgColor} ${config.color} border-0`}>
                    {config.label}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
