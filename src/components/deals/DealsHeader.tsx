import { useState, useEffect } from 'react';
import { Search, Plus, Filter, LayoutGrid, List, BarChart3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DealStage } from '@/hooks/useDeals';

export type ViewMode = 'table' | 'kanban' | 'analytics';

interface DealsHeaderProps {
  totalCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  stageId: string;
  onStageChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onAddDeal: () => void;
  stages: DealStage[];
}

export function DealsHeader({
  totalCount,
  search,
  onSearchChange,
  stageId,
  onStageChange,
  status,
  onStatusChange,
  viewMode,
  onViewModeChange,
  onAddDeal,
  stages,
}: DealsHeaderProps) {
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, onSearchChange]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
          <Badge variant="secondary" className="text-sm">
            {totalCount}
          </Badge>
        </div>
        <Button onClick={onAddDeal} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Dodaj deal</span>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Tabs value={viewMode} onValueChange={(v) => onViewModeChange(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="kanban" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-2">
              <List className="h-4 w-4" />
              Tabela
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analityka
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj po tytule..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={stageId} onValueChange={onStageChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Wszystkie etapy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie etapy</SelectItem>
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    {stage.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Wszystkie statusy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="open">Otwarte</SelectItem>
              <SelectItem value="won">Wygrane</SelectItem>
              <SelectItem value="lost">Przegrane</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
