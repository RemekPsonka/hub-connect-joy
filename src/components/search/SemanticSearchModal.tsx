import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Sparkles, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSemanticSearch, SearchResult as SearchResultType } from '@/hooks/useSemanticSearch';
import { SearchResult } from './SearchResult';

interface SemanticSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SemanticSearchModal({ open, onOpenChange }: SemanticSearchModalProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isSemanticEnabled, setIsSemanticEnabled] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  
  const { search, results, isSearching, error, clearResults } = useSemanticSearch();
  
  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      clearResults();
      setSelectedIndex(0);
    }
  }, [open, clearResults]);
  
  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    if (!query.trim() || !isSemanticEnabled) {
      clearResults();
      return;
    }
    
    debounceRef.current = setTimeout(() => {
      search({ query, threshold: 0.3, limit: 15 });
    }, 300);
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, isSemanticEnabled, search, clearResults]);
  
  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);
  
  const handleNavigate = useCallback((result: SearchResultType) => {
    onOpenChange(false);
    
    switch (result.type) {
      case 'contact':
        navigate(`/contacts/${result.id}`);
        break;
      case 'need':
      case 'offer':
        // Navigate to contact that has this need/offer
        // For now, just close the modal
        // TODO: Navigate to contact needs/offers tab
        break;
    }
  }, [navigate, onOpenChange]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleNavigate(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      onOpenChange(false);
    }
  }, [results, selectedIndex, handleNavigate, onOpenChange]);
  
  // Group results by type
  const contactResults = results.filter(r => r.type === 'contact');
  const needResults = results.filter(r => r.type === 'need');
  const offerResults = results.filter(r => r.type === 'offer');
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <div className="flex items-center gap-3 p-4 border-b">
          {isSearching ? (
            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-muted-foreground" />
          )}
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Szukaj kontaktów, potrzeb, ofert..."
            className="border-0 focus-visible:ring-0 px-0 text-base"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 hover:bg-accent rounded"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <Label htmlFor="semantic-toggle" className="text-sm cursor-pointer">
              Szukaj semantycznie (AI)
            </Label>
          </div>
          <Switch
            id="semantic-toggle"
            checked={isSemanticEnabled}
            onCheckedChange={setIsSemanticEnabled}
          />
        </div>
        
        <ScrollArea className="max-h-[400px]">
          {error && (
            <div className="p-4 text-center text-destructive text-sm">
              {error}
            </div>
          )}
          
          {!query.trim() && !isSearching && (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Wpisz zapytanie, aby rozpocząć wyszukiwanie</p>
              <p className="text-xs mt-1">
                Wyszukiwanie AI rozumie kontekst i znaczenie
              </p>
            </div>
          )}
          
          {query.trim() && !isSearching && results.length === 0 && !error && (
            <div className="p-8 text-center text-muted-foreground">
              <p className="text-sm">Brak wyników dla "{query}"</p>
              <p className="text-xs mt-1">
                Spróbuj innych słów kluczowych
              </p>
            </div>
          )}
          
          {results.length > 0 && (
            <div className="p-2">
              {contactResults.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-muted-foreground px-3 py-1">
                    Kontakty ({contactResults.length})
                  </p>
                  {contactResults.map((result, idx) => (
                    <SearchResult
                      key={result.id}
                      {...result}
                      onClick={() => handleNavigate(result)}
                      isSelected={results.indexOf(result) === selectedIndex}
                    />
                  ))}
                </div>
              )}
              
              {needResults.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-muted-foreground px-3 py-1">
                    Potrzeby ({needResults.length})
                  </p>
                  {needResults.map((result, idx) => (
                    <SearchResult
                      key={result.id}
                      {...result}
                      onClick={() => handleNavigate(result)}
                      isSelected={results.indexOf(result) === selectedIndex}
                    />
                  ))}
                </div>
              )}
              
              {offerResults.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-muted-foreground px-3 py-1">
                    Oferty ({offerResults.length})
                  </p>
                  {offerResults.map((result, idx) => (
                    <SearchResult
                      key={result.id}
                      {...result}
                      onClick={() => handleNavigate(result)}
                      isSelected={results.indexOf(result) === selectedIndex}
                    />
                  ))}
                </div>
              )}
              
              <div className="text-xs text-muted-foreground text-center py-2 border-t mt-2">
                Znaleziono {results.length} wyników • Dopasowanie AI
              </div>
            </div>
          )}
        </ScrollArea>
        
        <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd> nawiguj</span>
            <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> wybierz</span>
            <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> zamknij</span>
          </div>
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Wyszukiwanie AI
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
