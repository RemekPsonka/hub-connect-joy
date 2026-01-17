import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Users, MessageSquare, Target, User, Building2, ExternalLink, Loader2, X, CheckCircle2, Link2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AIRecommendation, useRecommendationActions } from '@/hooks/useRecommendationActions';
import { TaskModal } from '@/components/tasks/TaskModal';
import { cn } from '@/lib/utils';

interface RecommendationDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendation: AIRecommendation | null;
  onActionComplete?: (recommendationId: string) => void;
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
  recommendation,
  onActionComplete
}: RecommendationDetailModalProps) {
  const navigate = useNavigate();
  const { dismissRecommendation, completeRecommendation, isDismissing, isCompleting } = useRecommendationActions();
  const [showTaskModal, setShowTaskModal] = useState(false);

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
    onActionComplete?.(recommendation.id);
    onOpenChange(false);
  };

  const handleOpenTaskModal = () => {
    // Close recommendation modal and open task modal
    onOpenChange(false);
    setShowTaskModal(true);
  };

  const handleTaskCreated = async (taskId: string) => {
    // Mark recommendation as completed after task is created
    await completeRecommendation.mutateAsync({ 
      recommendation, 
      taskId 
    });
    onActionComplete?.(recommendation.id);
    setShowTaskModal(false);
    navigate('/tasks');
  };

  const handleTaskModalClose = (open: boolean) => {
    setShowTaskModal(open);
  };

  const navigateToContact = (contactId: string) => {
    onOpenChange(false);
    navigate(`/contacts/${contactId}`);
  };

  const isLoading = isDismissing || isCompleting;

  // Prepare initial data for TaskModal
  const taskInitialData = {
    title: recommendation.title,
    description: recommendation.description + (recommendation.reasoning ? `\n\nUzasadnienie: ${recommendation.reasoning}` : ''),
    taskType: recommendation.type === 'connection' ? 'cross' as const : 'standard' as const,
    contactAId: recommendation.contactIds?.[0],
    contactBId: recommendation.contactIds?.[1],
    connectionReason: recommendation.reasoning || recommendation.description,
    priority: recommendation.priority,
  };

  return (
    <>
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
                onClick={handleOpenTaskModal}
                disabled={isLoading}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {config.actionLabel}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Modal with pre-filled data */}
      <TaskModal
        open={showTaskModal}
        onOpenChange={handleTaskModalClose}
        initialData={taskInitialData}
        onTaskCreated={handleTaskCreated}
      />
    </>
  );
}
