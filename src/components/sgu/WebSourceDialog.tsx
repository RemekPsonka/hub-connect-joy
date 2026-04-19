import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSGUWebSources, type SGUWebSource } from '@/hooks/useSGUWebSources';

const schema = z.object({
  name: z.string().min(2, 'Min 2 znaki'),
  url: z.string().url('Nieprawidłowy URL'),
  source_type: z.enum(['rss', 'html', 'api']),
  search_keywords: z.string(),
  parser_config: z.string().refine(
    (v) => {
      if (!v.trim()) return true;
      try { JSON.parse(v); return true; } catch { return false; }
    },
    'Nieprawidłowy JSON',
  ),
  active: z.boolean().default(true),
});

type FormValues = z.infer<typeof schema>;

const HTML_TEMPLATE = `{
  "item_selector": "article",
  "title_selector": "h2",
  "link_selector": "a",
  "description_selector": "p"
}`;

const API_TEMPLATE = `{
  "items_path": "data.items",
  "title_field": "title",
  "description_field": "description",
  "url_field": "url",
  "headers": {}
}`;

export function WebSourceDialog({
  open,
  onOpenChange,
  source,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  source?: SGUWebSource | null;
}) {
  const { createMutation, updateMutation } = useSGUWebSources();
  const isEdit = Boolean(source);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: source?.name ?? '',
      url: source?.url ?? '',
      source_type: source?.source_type ?? 'rss',
      search_keywords: source?.search_keywords?.join(', ') ?? '',
      parser_config: source?.parser_config ? JSON.stringify(source.parser_config, null, 2) : '',
      active: source?.active ?? true,
    },
  });

  const sourceType = form.watch('source_type');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (vals: FormValues) => {
    setSubmitting(true);
    try {
      const keywords = vals.search_keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);
      const parser_config = vals.parser_config.trim() ? JSON.parse(vals.parser_config) : {};

      if (isEdit && source) {
        await updateMutation.mutateAsync({
          id: source.id,
          name: vals.name,
          url: vals.url,
          source_type: vals.source_type,
          search_keywords: keywords,
          parser_config,
          active: vals.active,
        });
      } else {
        await createMutation.mutateAsync({
          name: vals.name,
          url: vals.url,
          source_type: vals.source_type,
          search_keywords: keywords,
          parser_config,
          active: vals.active,
        });
      }
      onOpenChange(false);
      form.reset();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edytuj źródło' : 'Dodaj źródło web'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <Label>Nazwa</Label>
            <Input {...form.register('name')} placeholder="np. PAP Biznes RSS" />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <Label>URL</Label>
            <Input {...form.register('url')} placeholder="https://..." />
            {form.formState.errors.url && (
              <p className="text-xs text-destructive">{form.formState.errors.url.message}</p>
            )}
          </div>
          <div>
            <Label>Typ źródła</Label>
            <Select
              value={form.watch('source_type')}
              onValueChange={(v: 'rss' | 'html' | 'api') => form.setValue('source_type', v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rss">RSS / Atom</SelectItem>
                <SelectItem value="html">HTML (selektory CSS)</SelectItem>
                <SelectItem value="api">API JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Słowa kluczowe (po przecinku)</Label>
            <Input
              {...form.register('search_keywords')}
              placeholder="firma, inwestycja, zatrudnienie"
            />
            <p className="text-xs text-muted-foreground mt-1">Pusto = wszystkie wpisy klasyfikowane przez AI</p>
          </div>
          {sourceType !== 'rss' && (
            <div>
              <Label>Parser config (JSON)</Label>
              <Textarea
                {...form.register('parser_config')}
                rows={6}
                className="font-mono text-xs"
                placeholder={sourceType === 'html' ? HTML_TEMPLATE : API_TEMPLATE}
              />
              {form.formState.errors.parser_config && (
                <p className="text-xs text-destructive">{form.formState.errors.parser_config.message}</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Anuluj</Button>
            <Button type="submit" disabled={submitting}>{isEdit ? 'Zapisz' : 'Dodaj'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
