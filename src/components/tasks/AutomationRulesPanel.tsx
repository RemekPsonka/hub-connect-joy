import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Zap, Loader2 } from 'lucide-react';
import {
  useAutomationRules,
  useCreateAutomationRule,
  useToggleAutomationRule,
  useDeleteAutomationRule,
} from '@/hooks/useTaskAutomationRules';
import { toast } from 'sonner';

interface AutomationRulesPanelProps {
  projectId?: string;
}

const triggerLabels: Record<string, string> = {
  status_changed: 'Zmiana statusu',
  due_date_passed: 'Minął termin',
  all_subtasks_completed: 'Wszystkie subtaski ukończone',
};

const actionLabels: Record<string, string> = {
  change_status: 'Zmień status',
  change_priority: 'Zmień priorytet',
  assign_to: 'Przypisz',
  notify: 'Wyślij powiadomienie',
};

export function AutomationRulesPanel({ projectId }: AutomationRulesPanelProps) {
  const { data: rules = [] } = useAutomationRules(projectId);
  const createRule = useCreateAutomationRule();
  const toggleRule = useToggleAutomationRule();
  const deleteRule = useDeleteAutomationRule();

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('status_changed');
  const [actionType, setActionType] = useState('change_status');

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await createRule.mutateAsync({
        name: name.trim(),
        triggerType,
        actionType,
        projectId,
      });
      setName('');
      setIsAdding(false);
      toast.success('Reguła dodana');
    } catch {
      toast.error('Błąd');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Automatyzacje
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setIsAdding(!isAdding)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Nowa reguła
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isAdding && (
          <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
            <Input
              placeholder="Nazwa reguły..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Gdy</Label>
                <Select value={triggerType} onValueChange={setTriggerType}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(triggerLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Wtedy</Label>
                <Select value={actionType} onValueChange={setActionType}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(actionLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-7" onClick={handleCreate} disabled={createRule.isPending}>
                {createRule.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Utwórz'}
              </Button>
              <Button size="sm" variant="ghost" className="h-7" onClick={() => setIsAdding(false)}>
                Anuluj
              </Button>
            </div>
          </div>
        )}

        {rules.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Brak reguł automatyzacji
          </p>
        )}

        {rules.map((rule) => (
          <div key={rule.id} className="flex items-center justify-between p-2.5 border rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{rule.name}</p>
              <div className="flex gap-1 mt-0.5">
                <Badge variant="secondary" className="text-[10px]">
                  {triggerLabels[rule.trigger_type] || rule.trigger_type}
                </Badge>
                <span className="text-[10px] text-muted-foreground self-center">→</span>
                <Badge variant="outline" className="text-[10px]">
                  {actionLabels[rule.action_type] || rule.action_type}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Switch
                checked={rule.is_active}
                onCheckedChange={(v) => toggleRule.mutate({ id: rule.id, isActive: v })}
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => deleteRule.mutate(rule.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
