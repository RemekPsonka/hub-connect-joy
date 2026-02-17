import { useState, useMemo } from 'react';
import { Loader2, Users, Check, ChevronDown, ChevronUp, Mail, Phone, Building2, User, CheckSquare, FolderOpen, Brain, Handshake, MessageSquare, Target, Gift } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useFindDuplicates, useMergeMultipleContacts, type DuplicateGroup, type ContactWithRelations } from '@/hooks/useDuplicateCheck';
import { cn } from '@/lib/utils';

interface FindDuplicatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ContactRelationBadges({ contact }: { contact: ContactWithRelations }) {
  const r = contact._relatedData;
  if (!r) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {r.tasks > 0 && (
        <Badge variant="outline" className="text-xs py-0 px-1.5 gap-1">
          <CheckSquare className="h-3 w-3" />
          {r.tasks} {r.tasks === 1 ? 'zadanie' : r.tasks < 5 ? 'zadania' : 'zadań'}
        </Badge>
      )}
      {r.projects > 0 && (
        <Badge variant="outline" className="text-xs py-0 px-1.5 gap-1">
          <FolderOpen className="h-3 w-3" />
          {r.projects} {r.projects === 1 ? 'projekt' : r.projects < 5 ? 'projekty' : 'projektów'}
        </Badge>
      )}
      {r.deals > 0 && (
        <Badge variant="outline" className="text-xs py-0 px-1.5 gap-1">
          <Handshake className="h-3 w-3" />
          {r.deals} {r.deals === 1 ? 'zespół' : r.deals < 5 ? 'zespoły' : 'zespołów'}
        </Badge>
      )}
      {r.consultations > 0 && (
        <Badge variant="outline" className="text-xs py-0 px-1.5 gap-1">
          <MessageSquare className="h-3 w-3" />
          {r.consultations} {r.consultations === 1 ? 'konsultacja' : r.consultations < 5 ? 'konsultacje' : 'konsultacji'}
        </Badge>
      )}
      {r.needs > 0 && (
        <Badge variant="outline" className="text-xs py-0 px-1.5 gap-1">
          <Target className="h-3 w-3" />
          {r.needs} {r.needs === 1 ? 'potrzeba' : r.needs < 5 ? 'potrzeby' : 'potrzeb'}
        </Badge>
      )}
      {r.offers > 0 && (
        <Badge variant="outline" className="text-xs py-0 px-1.5 gap-1">
          <Gift className="h-3 w-3" />
          {r.offers} {r.offers === 1 ? 'oferta' : r.offers < 5 ? 'oferty' : 'ofert'}
        </Badge>
      )}
      {r.hasProfileSummary && (
        <Badge variant="outline" className="text-xs py-0 px-1.5 gap-1 border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-400">
          <Brain className="h-3 w-3" />
          Profil AI
        </Badge>
      )}
      {r.hasAI && (
        <Badge variant="outline" className="text-xs py-0 px-1.5 gap-1 border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-400">
          <Brain className="h-3 w-3" />
          Pamięć AI
        </Badge>
      )}
    </div>
  );
}

export function FindDuplicatesModal({ open, onOpenChange }: FindDuplicatesModalProps) {
  const { data: duplicateGroups = [], isLoading } = useFindDuplicates(open);
  const { mutateAsync: mergeContacts, isPending: isMerging } = useMergeMultipleContacts();
  
  const [selectedPrimary, setSelectedPrimary] = useState<Record<string, string>>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [mergedGroups, setMergedGroups] = useState<Set<string>>(new Set());

  const stats = useMemo(() => {
    const totalGroups = duplicateGroups.length;
    const totalContacts = duplicateGroups.reduce((acc, g) => acc + g.contacts.length, 0);
    const potentialDuplicates = totalContacts - totalGroups;
    return { totalGroups, totalContacts, potentialDuplicates };
  }, [duplicateGroups]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSelectPrimary = (groupKey: string, contactId: string) => {
    setSelectedPrimary(prev => ({ ...prev, [groupKey]: contactId }));
  };

  const getPrimaryForGroup = (group: DuplicateGroup): string => {
    if (selectedPrimary[group.key]) return selectedPrimary[group.key];
    const sorted = [...group.contacts].sort((a, b) => 
      new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    );
    return sorted[0]?.id || group.contacts[0]?.id;
  };

  const handleMergeGroup = async (group: DuplicateGroup) => {
    const primaryId = getPrimaryForGroup(group);
    const duplicateIds = group.contacts.filter(c => c.id !== primaryId).map(c => c.id);
    try {
      await mergeContacts({ primaryContactId: primaryId, duplicateIds });
      setMergedGroups(prev => new Set([...prev, group.key]));
    } catch (error) {
      console.error('Error merging group:', error);
    }
  };

  const handleMergeAll = async () => {
    const unmergedGroups = duplicateGroups.filter(g => !mergedGroups.has(g.key));
    for (const group of unmergedGroups) {
      await handleMergeGroup(group);
    }
  };

  const getTypeLabel = (type: DuplicateGroup['type']) => {
    switch (type) {
      case 'email': return 'Email';
      case 'phone': return 'Telefon';
      case 'name': return 'Imię i nazwisko';
      default: return type;
    }
  };

  const getTypeIcon = (type: DuplicateGroup['type']) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'name': return <User className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const remainingGroups = duplicateGroups.filter(g => !mergedGroups.has(g.key));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Znajdź i scal duplikaty
          </DialogTitle>
          <DialogDescription>
            Wyszukaj duplikaty kontaktów po emailu, telefonie lub imieniu i nazwisku, a następnie scal je w jeden kontakt. Wszystkie powiązane dane (zadania, projekty, konsultacje) zostaną przeniesione.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Wyszukuję duplikaty...</span>
          </div>
        ) : duplicateGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Check className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium">Nie znaleziono duplikatów</p>
            <p className="text-muted-foreground">Twoja baza kontaktów jest czysta!</p>
          </div>
        ) : (
          <div className="flex flex-col min-h-0 flex-1">
            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{stats.totalGroups}</Badge>
                <span className="text-sm text-muted-foreground">grup duplikatów</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{stats.potentialDuplicates}</Badge>
                <span className="text-sm text-muted-foreground">kontaktów do scalenia</span>
              </div>
              {mergedGroups.size > 0 && (
                <div className="flex items-center gap-2 ml-auto">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Scalono: {mergedGroups.size}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="default"
                disabled={isMerging || remainingGroups.length === 0}
                onClick={handleMergeAll}
              >
                {isMerging ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Users className="h-4 w-4 mr-2" />
                )}
                Scal wszystkie ({remainingGroups.length})
              </Button>
            </div>

            <div className="overflow-y-auto -mx-6 px-6" style={{ maxHeight: 'calc(80vh - 200px)' }}>
              <div className="space-y-3 pb-4">
                {duplicateGroups.map((group) => {
                  const isMerged = mergedGroups.has(group.key);
                  const isExpanded = expandedGroups.has(group.key);
                  const primaryId = getPrimaryForGroup(group);

                  return (
                    <Collapsible
                      key={group.key}
                      open={isExpanded}
                      onOpenChange={() => toggleGroup(group.key)}
                    >
                      <div className={cn(
                        "border rounded-lg overflow-hidden transition-colors",
                        isMerged && "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                      )}>
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                {getTypeIcon(group.type)}
                                <Badge variant="outline" className="text-xs">
                                  {getTypeLabel(group.type)}
                                </Badge>
                              </div>
                              <span className="font-medium">{group.key}</span>
                              <Badge variant="secondary">{group.contacts.length} kontaktów</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              {isMerged ? (
                                <Badge variant="default" className="bg-green-600">
                                  <Check className="h-3 w-3 mr-1" />
                                  Scalono
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMergeGroup(group);
                                  }}
                                  disabled={isMerging}
                                >
                                  {isMerging ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    'Scal'
                                  )}
                                </Button>
                              )}
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="border-t px-3 py-3 bg-muted/30">
                            <p className="text-xs text-muted-foreground mb-3">
                              Wybierz główny kontakt (pozostałe zostaną scalane do niego — zadania, projekty i inne powiązania zostaną przeniesione):
                            </p>
                            <RadioGroup
                              value={primaryId}
                              onValueChange={(value) => handleSelectPrimary(group.key, value)}
                              className="space-y-2"
                              disabled={isMerged}
                            >
                              {group.contacts.map((contact) => (
                                <div
                                  key={contact.id}
                                  className={cn(
                                    "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                                    primaryId === contact.id 
                                      ? "border-primary bg-primary/5" 
                                      : "border-transparent bg-background"
                                  )}
                                >
                                  <RadioGroupItem value={contact.id} id={contact.id} className="mt-1" />
                                  <Label htmlFor={contact.id} className="flex-1 cursor-pointer">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium">{contact.full_name}</span>
                                      {primaryId === contact.id && (
                                        <Badge variant="default" className="text-xs">Główny</Badge>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                      {contact.email && (
                                        <div className="flex items-center gap-1">
                                          <Mail className="h-3 w-3" />
                                          {contact.email}
                                        </div>
                                      )}
                                      {contact.phone && (
                                        <div className="flex items-center gap-1">
                                          <Phone className="h-3 w-3" />
                                          {contact.phone}
                                        </div>
                                      )}
                                      {contact.company && (
                                        <div className="flex items-center gap-1">
                                          <Building2 className="h-3 w-3" />
                                          {contact.company}
                                        </div>
                                      )}
                                      {contact.position && (
                                        <div className="flex items-center gap-1">
                                          <User className="h-3 w-3" />
                                          {contact.position}
                                        </div>
                                      )}
                                    </div>
                                    <ContactRelationBadges contact={contact} />
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Utworzono: {new Date(contact.created_at || '').toLocaleDateString('pl-PL')}
                                    </div>
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
