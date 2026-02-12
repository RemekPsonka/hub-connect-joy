import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import type { ContactsTableColumns } from '@/hooks/useContactsTableSettings';

const COLUMN_LABELS: Record<keyof ContactsTableColumns, string> = {
  company: 'Firma',
  funnels: 'Lejki',
  phone: 'Telefon prywatny',
  email: 'Email',
  group: 'Grupa',
  aiProfile: 'Profil AI',
  relationshipStrength: 'Siła relacji',
};

interface ColumnConfigPopoverProps {
  columns: ContactsTableColumns;
  onToggle: (columns: Partial<ContactsTableColumns>) => void;
}

export function ColumnConfigPopover({ columns, onToggle }: ColumnConfigPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Kolumny
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3" align="end">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">Widoczne kolumny</p>
          {(Object.keys(COLUMN_LABELS) as Array<keyof ContactsTableColumns>).map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={columns[key]}
                onCheckedChange={(checked) => onToggle({ [key]: !!checked })}
              />
              {COLUMN_LABELS[key]}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
