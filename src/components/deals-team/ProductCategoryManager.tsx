import { useState } from 'react';
import { Plus, Loader2, Pencil, X, Check } from 'lucide-react';
import { useProductCategories, useCreateProductCategory, useUpdateProductCategory, ProductCategory } from '@/hooks/useProductCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface ProductCategoryManagerProps {
  teamId: string;
}

const colorOptions = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

export function ProductCategoryManager({ teamId }: ProductCategoryManagerProps) {
  const { data: categories = [] } = useProductCategories(teamId);
  const createCategory = useCreateProductCategory();
  const updateCategory = useUpdateProductCategory();

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3B82F6');
  const [newCommission, setNewCommission] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editCommission, setEditCommission] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createCategory.mutateAsync({
      teamId,
      name: newName.trim(),
      color: newColor,
      defaultCommissionPercent: parseFloat(newCommission) || 0,
    });
    setNewName('');
    setNewCommission('');
  };

  const startEditing = (cat: ProductCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color);
    setEditCommission(String(cat.default_commission_percent || ''));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('');
    setEditCommission('');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    await updateCategory.mutateAsync({
      id: editingId,
      teamId,
      name: editName.trim(),
      color: editColor,
      defaultCommissionPercent: parseFloat(editCommission) || 0,
    });
    cancelEditing();
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveEdit();
    else if (e.key === 'Escape') cancelEditing();
  };

  const handleDelete = async (cat: ProductCategory) => {
    await updateCategory.mutateAsync({ id: cat.id, teamId, isActive: false });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Grupy produktów</h3>

      {/* Existing categories */}
      <div className="space-y-2">
        {categories.map((cat) =>
          editingId === cat.id ? (
            <div key={cat.id} className="space-y-2 p-3 border rounded-lg border-primary/50">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleEditKeyDown}
                placeholder="Nazwa grupy"
                className="h-8 text-sm"
                autoFocus
              />
              <div className="flex gap-1.5 flex-wrap">
                {colorOptions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform ${editColor === c ? 'ring-2 ring-offset-1 ring-primary scale-110' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <Input
                value={editCommission}
                onChange={(e) => setEditCommission(e.target.value)}
                onKeyDown={handleEditKeyDown}
                placeholder="Prowizja %"
                type="number"
                className="h-8 text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit} disabled={!editName.trim() || updateCategory.isPending} className="gap-1">
                  {updateCategory.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  Zapisz
                </Button>
                <Button size="sm" variant="ghost" onClick={cancelEditing} className="gap-1">
                  <X className="h-3 w-3" /> Anuluj
                </Button>
              </div>
            </div>
          ) : (
            <div key={cat.id} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
              <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
              <span className="text-sm font-medium flex-1">{cat.name}</span>
              {cat.default_commission_percent > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {cat.default_commission_percent}% prowizji
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={() => startEditing(cat)} className="h-7 w-7 p-0">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(cat)} className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )
        )}
      </div>

      {/* Add new */}
      <div className="space-y-3 p-3 border rounded-lg">
        <Label className="text-xs">Dodaj nową grupę</Label>
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nazwa grupy (np. Flota, Życie)"
          className="h-8 text-sm"
        />
        <div className="flex gap-1.5 flex-wrap">
          {colorOptions.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setNewColor(c)}
              className={`w-6 h-6 rounded-full transition-transform ${newColor === c ? 'ring-2 ring-offset-1 ring-primary scale-110' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <Input
          value={newCommission}
          onChange={(e) => setNewCommission(e.target.value)}
          placeholder="Domyślna prowizja %"
          type="number"
          className="h-8 text-sm"
        />
        <Button
          onClick={handleCreate}
          disabled={!newName.trim() || createCategory.isPending}
          size="sm"
          className="w-full gap-2"
        >
          {createCategory.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          Dodaj grupę
        </Button>
      </div>
    </div>
  );
}
