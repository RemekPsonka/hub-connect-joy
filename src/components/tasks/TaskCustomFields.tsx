import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, Settings2, Trash2, Loader2 } from 'lucide-react';
import {
  useTaskCustomFields,
  useTaskCustomFieldValues,
  useUpsertCustomFieldValue,
  useCreateCustomField,
  useDeleteCustomField,
} from '@/hooks/useTaskCustomFields';
import { toast } from 'sonner';

interface TaskCustomFieldsProps {
  taskId: string;
  projectId?: string | null;
}

export function TaskCustomFields({ taskId, projectId }: TaskCustomFieldsProps) {
  const { data: fields = [] } = useTaskCustomFields(projectId);
  const { data: values = [] } = useTaskCustomFieldValues(taskId);
  const upsert = useUpsertCustomFieldValue();
  const createField = useCreateCustomField();
  const deleteField = useDeleteCustomField();

  const [isAdding, setIsAdding] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');

  const getFieldValue = (fieldId: string) => {
    return values.find((v) => v.field_id === fieldId);
  };

  const handleValueChange = (fieldId: string, value: string | number | boolean | null, fieldType: string) => {
    upsert.mutate({ taskId, fieldId, value, fieldType });
  };

  const handleAddField = async () => {
    if (!newFieldName.trim()) return;
    try {
      await createField.mutateAsync({ name: newFieldName.trim(), fieldType: newFieldType, projectId });
      setNewFieldName('');
      setNewFieldType('text');
      setIsAdding(false);
      toast.success('Pole dodane');
    } catch {
      toast.error('Błąd dodawania pola');
    }
  };

  if (fields.length === 0 && !isAdding) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-muted-foreground">Dodatkowe pola</h4>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsAdding(true)}>
            <Plus className="h-3 w-3 mr-1" /> Dodaj pole
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">Dodatkowe pola</h4>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsAdding(true)}>
          <Plus className="h-3 w-3 mr-1" /> Dodaj
        </Button>
      </div>

      {fields.map((field) => {
        const val = getFieldValue(field.id);
        return (
          <div key={field.id} className="flex items-center gap-2">
            <Label className="text-xs w-24 shrink-0 truncate">{field.name}</Label>
            {field.field_type === 'checkbox' ? (
              <Checkbox
                checked={val?.value_boolean || false}
                onCheckedChange={(v) => handleValueChange(field.id, !!v, 'checkbox')}
              />
            ) : field.field_type === 'number' ? (
              <Input
                type="number"
                className="h-7 text-sm"
                value={val?.value_number ?? ''}
                onChange={(e) => handleValueChange(field.id, e.target.value ? Number(e.target.value) : null, 'number')}
              />
            ) : field.field_type === 'date' ? (
              <Input
                type="date"
                className="h-7 text-sm"
                value={val?.value_date ?? ''}
                onChange={(e) => handleValueChange(field.id, e.target.value || null, 'date')}
              />
            ) : field.field_type === 'select' && field.options ? (
              <Select
                value={val?.value_text || ''}
                onValueChange={(v) => handleValueChange(field.id, v, 'text')}
              >
                <SelectTrigger className="h-7 text-sm">
                  <SelectValue placeholder="Wybierz..." />
                </SelectTrigger>
                <SelectContent>
                  {(field.options as any[]).map((opt: any) => (
                    <SelectItem key={opt.value || opt.label} value={opt.value || opt.label}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                className="h-7 text-sm"
                value={val?.value_text ?? ''}
                onChange={(e) => handleValueChange(field.id, e.target.value || null, 'text')}
                placeholder={field.field_type === 'url' ? 'https://...' : ''}
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => deleteField.mutate(field.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        );
      })}

      {isAdding && (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              placeholder="Nazwa pola..."
              className="h-7 text-sm"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddField()}
              autoFocus
            />
          </div>
          <Select value={newFieldType} onValueChange={setNewFieldType}>
            <SelectTrigger className="h-7 text-sm w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Tekst</SelectItem>
              <SelectItem value="number">Liczba</SelectItem>
              <SelectItem value="date">Data</SelectItem>
              <SelectItem value="checkbox">Checkbox</SelectItem>
              <SelectItem value="url">URL</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-7" onClick={handleAddField} disabled={createField.isPending}>
            {createField.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'OK'}
          </Button>
          <Button size="sm" variant="ghost" className="h-7" onClick={() => setIsAdding(false)}>
            ✕
          </Button>
        </div>
      )}
    </div>
  );
}
