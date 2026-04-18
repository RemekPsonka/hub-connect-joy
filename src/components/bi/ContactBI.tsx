import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Save, Pencil, X } from 'lucide-react';
import { useContactBI, useUpsertContactBI, useFillBIFromNotesViaSovra } from '@/hooks/useContactBI';
import { BI_QUESTIONS_V2, BI_SECTIONS, type BIAnswers } from '@/lib/bi/questions.v2';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface ContactBIProps {
  contactId: string;
  contactName: string;
}

export function ContactBI({ contactId, contactName }: ContactBIProps) {
  const { user } = useAuth();
  const { data: bi, isLoading } = useContactBI(contactId);
  const upsert = useUpsertContactBI();
  const fillFromNotes = useFillBIFromNotesViaSovra();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<BIAnswers>({});

  useEffect(() => {
    setDraft(bi?.answers ?? {});
  }, [bi]);

  const tenantId = useMemo(
    () => (user?.user_metadata as { tenant_id?: string } | undefined)?.tenant_id,
    [user],
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const handleSave = async () => {
    if (!tenantId) return;
    await upsert.mutateAsync({ contactId, tenantId, answers: draft });
    setEditing(false);
  };

  const renderField = (qid: string, label: string, type: string, placeholder?: string) => {
    const value = (draft[qid] as string | number | null) ?? '';
    if (!editing) {
      const display = bi?.answers?.[qid];
      return (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{label}</Label>
          <p className="text-sm whitespace-pre-wrap">
            {display ? String(display) : <span className="text-muted-foreground italic">— brak —</span>}
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <Label htmlFor={qid}>{label}</Label>
        {type === 'textarea' ? (
          <Textarea
            id={qid}
            value={String(value)}
            onChange={(e) => setDraft({ ...draft, [qid]: e.target.value })}
            placeholder={placeholder}
            rows={3}
          />
        ) : (
          <Input
            id={qid}
            type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
            value={String(value)}
            onChange={(e) => setDraft({ ...draft, [qid]: e.target.value })}
            placeholder={placeholder}
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {bi?.ai_summary && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Podsumowanie AI
              {bi.filled_by_ai && (
                <Badge variant="secondary" className="text-xs">wypełnione przez AI</Badge>
              )}
            </CardTitle>
            {bi.last_filled_at && (
              <CardDescription className="text-xs">
                {format(new Date(bi.last_filled_at), 'dd.MM.yyyy HH:mm')}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{bi.ai_summary}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Wywiad biznesowy</h3>
          <p className="text-xs text-muted-foreground">
            {bi ? `Zaktualizowano: ${format(new Date(bi.updated_at), 'dd.MM.yyyy HH:mm')}` : 'Brak danych'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fillFromNotes(contactId, contactName)}
          >
            <Sparkles className="w-4 h-4 mr-1" />
            Wypełnij AI
          </Button>
          {!editing ? (
            <Button size="sm" onClick={() => setEditing(true)}>
              <Pencil className="w-4 h-4 mr-1" />
              Edytuj
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setDraft(bi?.answers ?? {}); }}>
                <X className="w-4 h-4 mr-1" />
                Anuluj
              </Button>
              <Button size="sm" onClick={handleSave} disabled={upsert.isPending}>
                <Save className="w-4 h-4 mr-1" />
                Zapisz
              </Button>
            </>
          )}
        </div>
      </div>

      {BI_SECTIONS.map((section) => {
        const questions = BI_QUESTIONS_V2.filter((q) => q.section === section.id);
        if (questions.length === 0) return null;
        return (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="text-sm">{section.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {questions.map((q) => (
                <div key={q.id}>{renderField(q.id, q.label, q.type, q.placeholder)}</div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
