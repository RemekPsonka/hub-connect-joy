import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Plus, Target, Search } from 'lucide-react';
import { useWantedContacts } from '@/hooks/useWantedContacts';
import { WantedContactCard } from '@/components/wanted/WantedContactCard';
import { WantedContactModal } from '@/components/wanted/WantedContactModal';

export default function WantedContacts() {
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: items, isLoading } = useWantedContacts({
    status: statusFilter,
    urgency: urgencyFilter,
    search: searchQuery || undefined,
  });

  const stats = items ? {
    active: items.filter((i) => i.status === 'active').length,
    inProgress: items.filter((i) => i.status === 'in_progress').length,
    fulfilled: items.filter((i) => i.status === 'fulfilled').length,
  } : { active: 0, inProgress: 0, fulfilled: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Poszukiwani</h1>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Dodaj
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-primary">{stats.active}</p><p className="text-xs text-muted-foreground">Aktywne</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-orange-500">{stats.inProgress}</p><p className="text-xs text-muted-foreground">W trakcie</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-green-500">{stats.fulfilled}</p><p className="text-xs text-muted-foreground">Znalezione</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Szukaj po imieniu, firmie..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            <SelectItem value="active">Aktywne</SelectItem>
            <SelectItem value="in_progress">W trakcie</SelectItem>
            <SelectItem value="fulfilled">Znalezione</SelectItem>
            <SelectItem value="cancelled">Anulowane</SelectItem>
          </SelectContent>
        </Select>
        <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Pilność" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            <SelectItem value="low">Niska</SelectItem>
            <SelectItem value="normal">Normalna</SelectItem>
            <SelectItem value="high">Wysoka</SelectItem>
            <SelectItem value="critical">Krytyczna</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !items || items.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><Target className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">Brak poszukiwanych kontaktów</p></CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => <WantedContactCard key={item.id} item={item} />)}
        </div>
      )}

      <WantedContactModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
