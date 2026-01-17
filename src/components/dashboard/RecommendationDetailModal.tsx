import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Users, MessageSquare, Target, User, Building2, ExternalLink, Loader2, X, CheckCircle2, Link2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AIRecommendation, useRecommendationActions } from '@/hooks/useRecommendationActions';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RecommendationDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendation: AIRecommendation | null;
}

const typeConfig = {
  connection: {
    icon: Users,
    label: 'Połączenie',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    actionLabel: 'Utwórz zadanie połączenia',
  },
  followup: {
    icon: MessageSquare,
    label: 'Follow-up',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    actionLabel: 'Utwórz zadanie follow-up',
  },
  opportunity: {
    icon: Target,
    label: 'Możliwość',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    actionLabel: 'Utwórz zadanie',
  },
};

interface ContactInfo {
  id: string;
  full_name: string;
  company: string | null;
  position: string | null;
}

export function RecommendationDetailModal({ 
  open, 
  onOpenChange, 
  recommendation 
}: RecommendationDetailModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { dismissRecommendation, completeRecommendation, isDismissing, isCompleting } = useRecommendationActions();
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // Fetch contact details
  const { data: contacts = [] } = useQuery({
    queryKey: ['recommendation-contacts', recommendation?.contactIds],
    queryFn: async () => {
      if (!recommendation?.contactIds?.length) return [];
      
      const { data, error } = await supabase
        .from('contacts')
        .select('id, full_name, company, position')
        .in('id', recommendation.contactIds);
      
      if (error) throw error;
      return data as ContactInfo[];
    },
    enabled: !!recommendation?.contactIds?.length && open,
  });

  if (!recommendation) return null;

  const config = typeConfig[recommendation.type];
  const Icon = config.icon;

  const handleDismiss = async () => {
    await dismissRecommendation.mutateAsync(recommendation);
    onOpenChange(false);
  };

  const handleCreateTask = async () => {
    if (!recommendation.contactIds?.length) {
      toast.error('Brak kontaktów do utworzenia zadania');
      return;
    }

    setIsCreatingTask(true);
    
    try {
      // Get tenant_id
      const { data: director } = await supabase
        .from('directors')
        .select('tenant_id')
        .single();
      
      if (!director?.tenant_id) {
        throw new Error('No tenant found');
      }

      if (recommendation.type === 'connection' && recommendation.contactIds.length >= 2) {
        // Create cross task for connection type
        const { data: task, error: taskError } = await supabase
          .from('tasks')
          .insert({
            tenant_id: director.tenant_id,
            title: recommendation.title,
            description: recommendation.description + (recommendation.reasoning ? `\n\nUzasadnienie: ${recommendation.reasoning}` : ''),
            task_type: 'cross',
            priority: recommendation.priority,
            status: 'pending',
          })
          .select('id')
          .single();

        if (taskError) throw taskError;

        // Create cross_task record
        const { error: crossError } = await supabase
          .from('cross_tasks')
          .insert({
            task_id: task.id,
            contact_a_id: recommendation.contactIds[0],
            contact_b_id: recommendation.contactIds[1],
            connection_reason: recommendation.reasoning || recommendation.description,
          });

        if (crossError) throw crossError;

        // Mark recommendation as completed
        await completeRecommendation.mutateAsync({ 
          recommendation, 
          taskId: task.id 
        });

        toast.success('Utworzono zadanie krosowe');
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        onOpenChange(false);
        navigate('/tasks');
      } else {
        // Create standard task with contact association
        const { data: task, error: taskError } = await supabase
          .from('tasks')
          .insert({
            tenant_id: director.tenant_id,
            title: recommendation.title,
            description: recommendation.description + (recommendation.reasoning ? `\n\nUzasadnienie: ${recommendation.reasoning}` : ''),
            task_type: 'standard',
            priority: recommendation.priority,
            status: 'pending',
          })
          .select('id')
          .single();

        if (taskError) throw taskError;

        // Link task to first contact
        if (recommendation.contactIds[0]) {
          await supabase
            .from('task_contacts')
            .insert({
              task_id: task.id,
              contact_id: recommendation.contactIds[0],
              role: 'primary',
            });
        }

        // Mark recommendation as completed
        await completeRecommendation.mutateAsync({ 
          recommendation, 
          taskId: task.id 
        });

        toast.success('Utworzono zadanie');
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        onOpenChange(false);
        navigate('/tasks');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Błąd podczas tworzenia zadania');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const navigateToContact = (contactId: string) => {
    onOpenChange(false);
    navigate(`/contacts/${contactId}`);
  };

  const isLoading = isDismissing || isCompleting || isCreatingTask;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", config.bg)}>
              <Icon className={cn("h-4 w-4", config.color)} />
            </div>
            <span className={cn("text-sm font-medium px-2 py-1 rounded", config.bg, config.color)}>
              {config.label}
            </span>
            {recommendation.priority === 'high' && (
              <span className="text-xs text-destructive font-medium ml-auto">Pilne</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <h3 className="font-semibold text-lg">{recommendation.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{recommendation.description}</p>
          </div>

          {/* Contacts */}
          {contacts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                {recommendation.type === 'connection' ? (
                  <>
                    <Link2 className="h-4 w-4" />
                    Kontakty do połączenia
                  </>
                ) : (
                  <>
                    <User className="h-4 w-4" />
                    Powiązany kontakt
                  </>
                )}
              </h4>
              
              <div className={cn(
                "grid gap-2",
                contacts.length > 1 ? "grid-cols-2" : "grid-cols-1"
              )}>
                {contacts.map((contact) => (
                  <Card 
                    key={contact.id} 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => navigateToContact(contact.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{contact.full_name}</p>
                          {contact.company && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                              <Building2 className="h-3 w-3 flex-shrink-0" />
                              {contact.company}
                            </p>
                          )}
                          {contact.position && (
                            <p className="text-xs text-muted-foreground truncate">{contact.position}</p>
                          )}
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Reasoning */}
          {recommendation.reasoning && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Uzasadnienie</h4>
              <p className="text-sm bg-muted/50 p-3 rounded-lg">{recommendation.reasoning}</p>
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleDismiss}
              disabled={isLoading}
            >
              {isDismissing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Anuluj rekomendację
            </Button>
            <Button 
              className="flex-1"
              onClick={handleCreateTask}
              disabled={isLoading}
            >
              {isCreatingTask || isCompleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {config.actionLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
